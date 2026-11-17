"use strict";
const { pool } = require("../config/database");
const { paginacion, errorHttp } = require("../services/control-operativo.service");
const { obtenerReporte } = require("../services/reportes-operativos.service");
const { exportarCsv, exportarPdf } = require("../services/exportar-reportes.service");

const consultar = tipo => async (req, res, next) => {
  try {
    const { page: solicitada, perPage } = paginacion(req.query);
    const reporte = await obtenerReporte(req, tipo);
    const totalRows = reporte.rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
    const page = Math.min(solicitada, totalPages);
    res.json({ ok: true, tipo, filtros: reporte.filtros, generado_en: reporte.generado_en,
      snapshot: reporte.snapshot, totales: reporte.totales,
      registros: reporte.rows.slice((page - 1) * perPage, page * perPage),
      paginacion: { page, perPage, totalRows, totalPages } });
  } catch (error) { next(error); }
};

const exportar = tipo => async (req, res, next) => {
  try {
    const formato = req.query.formato;
    if (!["pdf", "csv"].includes(formato)) throw errorHttp(400, "El formato debe ser PDF o CSV.");
    const reporte = await obtenerReporte(req, tipo);
    const archivo = formato === "csv" ? exportarCsv(reporte) : await exportarPdf(reporte);
    res.set("Content-Type", formato === "csv" ? "text/csv; charset=utf-8" : "application/pdf");
    res.set("Content-Disposition", `attachment; filename="reporte-${tipo}.${formato}"`);
    res.set("Cache-Control", "no-store");
    res.send(archivo);
  } catch (error) { next(error); }
};

async function opciones(req, res, next) {
  try {
    const [medicamentos] = await pool.query("SELECT id, nombre_comercial, principio_activo, laboratorio, activo FROM medicamentos ORDER BY nombre_comercial");
    const [categorias] = await pool.query("SELECT id, nombre FROM categorias ORDER BY nombre");
    const [lotes] = await pool.query("SELECT id, medicamento_id, numero_lote FROM lotes ORDER BY numero_lote");
    let vendedores = [];
    if (req.user.rol === "Administrador/Gerente") [vendedores] = await pool.query("SELECT id, nombre FROM usuarios ORDER BY nombre");
    res.json({ ok: true, medicamentos, categorias, lotes, vendedores });
  } catch (error) { next(error); }
}

module.exports = { ventas: consultar("ventas"), inventario: consultar("inventario"),
  exportarVentas: exportar("ventas"), exportarInventario: exportar("inventario"), opciones };
