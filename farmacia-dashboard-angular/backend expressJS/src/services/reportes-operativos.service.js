"use strict";

const crypto = require("crypto");
const { entero, errorHttp, fechas, transaccion } = require("./control-operativo.service");
const snapshots = new Map();
const DURACION = 15 * 60 * 1000;

function filtrosReporte(tipo, query) {
  const filtros = tipo === "ventas" ? fechas(query) : {};
  const ids = tipo === "ventas" ? ["medicamento_id", "vendedor_id"] : ["medicamento_id", "categoria_id", "lote_id"];
  for (const key of ids) if (query[key] !== undefined && query[key] !== "") filtros[key] = entero(query[key], "El identificador");
  if (tipo === "ventas" && query.estado) {
    if (!["VIGENTE", "ANULADA"].includes(query.estado)) throw errorHttp(400, "Estado de venta inválido.");
    filtros.estado = query.estado;
  }
  if (tipo === "inventario") {
    if (query.stock_bajo !== undefined && query.stock_bajo !== "") {
      if (!["0", "1"].includes(query.stock_bajo)) throw errorHttp(400, "El filtro de stock bajo debe ser 0 o 1.");
      if (query.stock_bajo === "1") filtros.stock_bajo = 1;
    }
    if (query.vencimiento) {
      if (!["VENCIDO", "PROXIMO", "VIGENTE"].includes(query.vencimiento)) throw errorHttp(400, "Condición de vencimiento inválida.");
      filtros.vencimiento = query.vencimiento;
    }
  }
  return filtros;
}

async function generarVentas(conn, filtros) {
  const where = ["1=1"];
  const params = [];
  if (filtros.desde) { where.push("v.fecha>=?"); params.push(filtros.desde); }
  if (filtros.hasta) { where.push("v.fecha<DATE_ADD(?, INTERVAL 1 DAY)"); params.push(filtros.hasta); }
  if (filtros.medicamento_id) { where.push("d.medicamento_id=?"); params.push(filtros.medicamento_id); }
  if (filtros.vendedor_id) { where.push("v.usuario_id=?"); params.push(filtros.vendedor_id); }
  if (filtros.estado) { where.push("v.estado=?"); params.push(filtros.estado); }
  // LEFT JOIN conserva las ventas antiguas sin detalle y permite identificar sus límites.
  const [rows] = await conn.query(`SELECT v.id venta_id, v.fecha, u.nombre vendedor,
    d.id detalle_id, d.medicamento_id, COALESCE(m.nombre_comercial,'Sin detalle verificable') medicamento,
    d.lote_id, l.numero_lote, d.cantidad, d.precio_unitario,
    COALESCE(d.subtotal,v.total) importe, v.total total_venta, v.estado,
    v.motivo_anulacion, v.anulada_en, a.nombre anulada_usuario
    FROM ventas v JOIN usuarios u ON u.id=v.usuario_id
    LEFT JOIN venta_detalles d ON d.venta_id=v.id LEFT JOIN medicamentos m ON m.id=d.medicamento_id
    LEFT JOIN lotes l ON l.id=d.lote_id LEFT JOIN usuarios a ON a.id=v.anulada_por
    WHERE ${where.join(" AND ")} ORDER BY v.fecha DESC, v.id DESC, d.id ASC`, params);
  const vigentes = new Set(), anuladas = new Set();
  let vigenteCentavos = 0, anuladaCentavos = 0, unidades = 0;
  for (const r of rows) {
    if (r.estado === "VIGENTE") {
      vigentes.add(r.venta_id); vigenteCentavos += Math.round(Number(r.importe) * 100);
      unidades += Number(r.cantidad || 0);
    } else { anuladas.add(r.venta_id); anuladaCentavos += Math.round(Number(r.importe) * 100); }
  }
  return { rows, totales: { ventas_vigentes: vigentes.size, ventas_anuladas: anuladas.size,
    unidades_vigentes: unidades, total_vigente: (vigenteCentavos / 100).toFixed(2),
    total_anulado: (anuladaCentavos / 100).toFixed(2) } };
}

async function generarInventario(conn, filtros) {
  const where = ["1=1"];
  const params = [];
  for (const key of ["medicamento_id", "categoria_id", "lote_id"]) {
    const col = { medicamento_id: "m.id", categoria_id: "m.categoria_id", lote_id: "l.id" }[key];
    if (filtros[key]) { where.push(`${col}=?`); params.push(filtros[key]); }
  }
  if (filtros.stock_bajo) where.push("COALESCE(s.disponible,0)<=m.stock_minimo");
  if (filtros.vencimiento === "VENCIDO") where.push("l.fecha_vencimiento<CURDATE()");
  if (filtros.vencimiento === "PROXIMO") where.push("l.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)");
  if (filtros.vencimiento === "VIGENTE") where.push("l.fecha_vencimiento>=CURDATE()");
  const [rows] = await conn.query(`SELECT m.id medicamento_id, m.nombre_comercial medicamento,
    m.activo, COALESCE(c.nombre,'Sin categoría') categoria, m.stock_minimo,
    l.id lote_id, l.numero_lote, l.fecha_vencimiento, l.cantidad stock_fisico,
    CASE WHEN m.activo=1 AND l.fecha_vencimiento>=CURDATE() THEN l.cantidad ELSE 0 END stock_disponible,
    COALESCE(s.disponible,0) disponible_medicamento,
    CASE WHEN COALESCE(s.disponible,0)<=m.stock_minimo THEN 1 ELSE 0 END stock_bajo,
    CASE WHEN l.fecha_vencimiento<CURDATE() THEN 'VENCIDO'
      WHEN l.fecha_vencimiento<=DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'PROXIMO'
      ELSE 'VIGENTE' END vencimiento,
    l.costo_unitario, ROUND(l.cantidad*l.costo_unitario,2) valor_fisico,
    ROUND(CASE WHEN m.activo=1 AND l.fecha_vencimiento>=CURDATE() THEN l.cantidad*l.costo_unitario ELSE 0 END,2) valor_disponible
    FROM lotes l JOIN medicamentos m ON m.id=l.medicamento_id LEFT JOIN categorias c ON c.id=m.categoria_id
    LEFT JOIN (SELECT ll.medicamento_id, SUM(CASE WHEN mm.activo=1 AND ll.fecha_vencimiento>=CURDATE()
      THEN ll.cantidad ELSE 0 END) disponible FROM lotes ll JOIN medicamentos mm ON mm.id=ll.medicamento_id
      GROUP BY ll.medicamento_id) s ON s.medicamento_id=m.id
    WHERE ${where.join(" AND ")} ORDER BY m.nombre_comercial, l.fecha_vencimiento, l.id`, params);
  let stock_fisico = 0, stock_disponible = 0, valor = 0, vendible = 0;
  for (const r of rows) {
    stock_fisico += Number(r.stock_fisico); stock_disponible += Number(r.stock_disponible);
    valor += Math.round(Number(r.valor_fisico) * 100); vendible += Math.round(Number(r.valor_disponible) * 100);
  }
  return { rows, totales: { lotes: rows.length, stock_fisico, stock_disponible,
    valor_fisico: (valor / 100).toFixed(2), valor_disponible: (vendible / 100).toFixed(2) } };
}

async function obtenerReporte(req, tipo) {
  const ahora = Date.now();
  for (const [id, item] of snapshots) if (ahora - item.creado > DURACION) snapshots.delete(id);
  if (req.query.snapshot) {
    const reporte = typeof req.query.snapshot === "string" ? snapshots.get(req.query.snapshot) : null;
    if (!reporte || reporte.usuario !== String(req.user.sub) || reporte.tipo !== tipo) {
      throw errorHttp(410, "La consulta expiró o no está disponible. Genere el reporte otra vez.");
    }
    const campos = ["desde", "hasta", "medicamento_id", "vendedor_id", "estado", "categoria_id", "lote_id", "stock_bajo", "vencimiento"];
    if (campos.some(key => req.query[key] !== undefined) &&
        JSON.stringify(filtrosReporte(tipo, req.query)) !== JSON.stringify(reporte.filtros)) {
      throw errorHttp(400, "Los filtros cambiaron. Consulte nuevamente antes de descargar.");
    }
    return reporte;
  }
  const filtros = filtrosReporte(tipo, req.query);
  const datos = await transaccion(async conn => {
    const [[hora]] = await conn.query("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') generado_en");
    const resultado = tipo === "ventas" ? await generarVentas(conn, filtros) : await generarInventario(conn, filtros);
    return { ...resultado, generado_en: hora.generado_en };
  }, true);
  const reporte = { ...datos, tipo, filtros, snapshot: crypto.randomUUID(), usuario: String(req.user.sub), creado: ahora };
  if (snapshots.size >= 100) snapshots.delete(snapshots.keys().next().value);
  snapshots.set(reporte.snapshot, reporte);
  return reporte;
}

module.exports = { obtenerReporte, filtrosReporte };
