"use strict";

const { pool } = require("../config/database");

const listarCatalogo = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const like = `%${q}%`;
    const principio = (req.query.principio_activo || "").trim();
    const lab = (req.query.laboratorio || "").trim();
    const accion = (req.query.accion || "").trim();

    let where = "m.activo=1 AND (m.nombre_comercial LIKE ? OR m.principio_activo LIKE ? OR m.sintoma LIKE ? OR m.accion_terapeutica LIKE ?)";
    let params = [like, like, like, like];

    if (principio !== "") { where += " AND m.principio_activo=?"; params.push(principio); }
    if (lab !== "") { where += " AND m.laboratorio=?"; params.push(lab); }
    if (accion !== "") { where += " AND m.accion_terapeutica=?"; params.push(accion); }

    const [rows] = await pool.query(`
      SELECT m.id, m.nombre_comercial, m.principio_activo, m.presentacion, m.precio, m.laboratorio, 
      COALESCE(SUM(CASE WHEN l.fecha_vencimiento>=CURDATE() THEN l.cantidad ELSE 0 END),0) stock, 
      c.nombre categoria 
      FROM medicamentos m 
      LEFT JOIN categorias c ON c.id=m.categoria_id 
      LEFT JOIN lotes l ON l.medicamento_id=m.id 
      WHERE ${where} 
      GROUP BY m.id 
      ORDER BY m.nombre_comercial
    `, params);

    const [principios] = await pool.query("SELECT DISTINCT principio_activo FROM medicamentos WHERE activo=1 AND principio_activo<>'' ORDER BY principio_activo");
    const [labs] = await pool.query("SELECT DISTINCT laboratorio FROM medicamentos WHERE activo=1 AND laboratorio<>'' ORDER BY laboratorio");
    const [acciones] = await pool.query("SELECT DISTINCT accion_terapeutica FROM medicamentos WHERE activo=1 AND accion_terapeutica<>'' ORDER BY accion_terapeutica");

    res.json({
      ok: true,
      medicamentos: rows,
      filtros: { principios, laboratorios: labs, acciones }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarCatalogo };