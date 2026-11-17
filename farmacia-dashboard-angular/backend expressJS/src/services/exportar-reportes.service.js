"use strict";

const path = require("path");
const PDFDocument = require("pdfkit");

const nombresFiltros = { desde: "Desde", hasta: "Hasta", medicamento_id: "Medicamento ID", vendedor_id: "Vendedor ID",
  estado: "Estado", categoria_id: "Categoría ID", lote_id: "Lote ID", stock_bajo: "Solo stock bajo", vencimiento: "Vencimiento" };
const nombresTotales = { ventas_vigentes: "Ventas vigentes", ventas_anuladas: "Ventas anuladas",
  unidades_vigentes: "Unidades vigentes", total_vigente: "Total vigente Bs", total_anulado: "Total anulado Bs",
  lotes: "Lotes", stock_fisico: "Unidades físicas", stock_disponible: "Unidades disponibles",
  valor_fisico: "Valor físico Bs", valor_disponible: "Valor disponible Bs" };
const columnasCsv = {
  ventas: ["venta_id", "fecha", "vendedor", "detalle_id", "medicamento_id", "medicamento", "lote_id", "numero_lote",
    "cantidad", "precio_unitario", "importe", "total_venta", "estado", "motivo_anulacion", "anulada_en", "anulada_usuario"],
  inventario: ["medicamento_id", "medicamento", "activo", "categoria", "stock_minimo", "lote_id", "numero_lote",
    "fecha_vencimiento", "stock_fisico", "stock_disponible", "disponible_medicamento", "stock_bajo", "vencimiento",
    "costo_unitario", "valor_fisico", "valor_disponible"],
};

function celdaCsv(valor) {
  let texto = valor == null ? "" : String(valor);
  // Evita que los textos de usuario se interpreten como fórmulas al abrir la descarga.
  if (/^[=+@\-\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

function exportarCsv(reporte) {
  const lineas = [
    ["Reporte", reporte.tipo], ["Generado en", reporte.generado_en],
    ["Filtros", JSON.stringify(reporte.filtros)], ["Totales", JSON.stringify(reporte.totales)],
    columnasCsv[reporte.tipo],
    ...reporte.rows.map(row => columnasCsv[reporte.tipo].map(key => row[key])),
  ];
  return "\uFEFF" + lineas.map(row => row.map(celdaCsv).join(",")).join("\r\n") + "\r\n";
}

function exportarPdf(reporte) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 34,
      info: { Title: `Reporte de ${reporte.tipo}`, Author: "Sistema de Farmacia" } });
    const partes = [];
    doc.on("data", parte => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
    doc.font(path.join(__dirname, "../../assets/DejaVuSans.ttf"));
    const ancho = 724;
    const limite = 572;
    let pagina = 0;
    const filtros = Object.entries(reporte.filtros).map(([k, v]) => `${nombresFiltros[k] || k}: ${v}`).join(" · ") || "Todos los registros";
    const resumen = Object.entries(reporte.totales).map(([k, v]) => `${nombresTotales[k] || k}: ${v}`).join(" · ");
    function encabezado() {
      pagina++;
      doc.fillColor("#162e43").fontSize(17).text(`Reporte de ${reporte.tipo}`, 34, 28, { width: ancho });
      doc.fillColor("#43566a").fontSize(8).text(`Generado en: ${reporte.generado_en} · Página ${pagina}`, { width: ancho });
      doc.moveDown(0.4).text(`Filtros: ${filtros}`, { width: ancho });
      doc.moveDown(0.4).text(resumen, { width: ancho });
      if (reporte.tipo === "inventario") doc.moveDown(0.3).text("Stock bajo: disponible del medicamento menor o igual al mínimo. Vencidos e inactivos no disponibles para venta.", { width: ancho });
      doc.moveDown(0.8);
    }
    const columnas = reporte.tipo === "ventas" ? [
      ["Venta / fecha", 103, r => `#${r.venta_id}\n${r.fecha}`],
      ["Vendedor", 100, r => r.vendedor],
      ["Medicamento / lote", 215, r => `${r.medicamento}\n${r.numero_lote || 'Sin lote'}`],
      ["Unidades", 55, r => r.cantidad == null ? "Sin dato" : r.cantidad],
      ["Precio Bs", 70, r => r.precio_unitario == null ? "Sin dato" : Number(r.precio_unitario).toFixed(2)],
      ["Importe Bs", 80, r => Number(r.importe).toFixed(2)],
      ["Estado", 101, r => r.estado],
    ] : [
      ["Medicamento / categoría", 220, r => `${r.medicamento}\n${r.categoria}${r.activo ? '' : ' · INACTIVO'}`],
      ["Lote / vencimiento", 135, r => `${r.numero_lote}\n${r.fecha_vencimiento}`],
      ["Físico", 55, r => r.stock_fisico], ["Disponible", 65, r => r.stock_disponible],
      ["Condición", 100, r => `${r.vencimiento}${r.stock_bajo ? '\nStock bajo' : ''}`],
      ["Costo Bs", 65, r => Number(r.costo_unitario).toFixed(2)],
      ["Valor físico Bs", 84, r => Number(r.valor_fisico).toFixed(2)],
    ];
    function cabeceraTabla() {
      let x = 34;
      const y = doc.y;
      doc.rect(34, y, ancho, 25).fill("#eaf0f5");
      doc.fillColor("#162e43").fontSize(8);
      for (const [titulo, w] of columnas) { doc.text(titulo, x + 5, y + 5, { width: w - 10 }); x += w; }
      doc.y = y + 30;
    }
    encabezado(); cabeceraTabla();
    if (!reporte.rows.length) doc.fillColor("#43566a").text("No hay registros que coincidan con los filtros.", 34, doc.y + 8);
    for (const row of reporte.rows) {
      doc.fontSize(8);
      const textos = columnas.map(([, , obtener]) => String(obtener(row) ?? ""));
      const alto = Math.max(...textos.map((t, i) => doc.heightOfString(t, { width: columnas[i][1] - 10 })), 18) + 12;
      const nota = reporte.tipo === "ventas" && row.estado === "ANULADA"
        ? `Anulada: ${row.anulada_en || ''} · Responsable: ${row.anulada_usuario || ''} · Motivo: ${row.motivo_anulacion || ''}` : "";
      const notaAlto = nota ? doc.heightOfString(nota, { width: ancho - 10 }) + 8 : 0;
      if (doc.y + alto + notaAlto > limite) { doc.addPage(); encabezado(); cabeceraTabla(); }
      const y = doc.y;
      let x = 34;
      doc.fillColor("#24384b");
      for (let i = 0; i < columnas.length; i++) { doc.text(textos[i], x + 5, y + 4, { width: columnas[i][1] - 10 }); x += columnas[i][1]; }
      doc.y = y + alto;
      if (nota) doc.fontSize(8).text(nota, 39, doc.y, { width: ancho - 10 });
      doc.y = y + alto + notaAlto;
      doc.moveTo(34, doc.y).lineTo(758, doc.y).strokeColor("#dce3ea").stroke();
    }
    doc.end();
  });
}

module.exports = { exportarCsv, exportarPdf };
