"use strict";

const { pool } = require("../config/database");

const listarMedicamentos = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const like = `%${q}%`;
    const lab = (req.query.laboratorio || "").trim();
    const accion = (req.query.accion || "").trim();
    const principio = (req.query.principio_activo || "").trim();

    let where = "m.activo=1 AND (m.nombre_comercial LIKE ? OR m.principio_activo LIKE ? OR m.laboratorio LIKE ? OR m.sintoma LIKE ? OR m.accion_terapeutica LIKE ?)";
    let params = [like, like, like, like, like];

    if (lab !== "") { where += " AND m.laboratorio=?"; params.push(lab); }
    if (accion !== "") { where += " AND m.accion_terapeutica=?"; params.push(accion); }
    if (principio !== "") { where += " AND m.principio_activo=?"; params.push(principio); }

    const perPage = 10;
    let page = Math.max(1, parseInt(req.query.page) || 1);

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM medicamentos m WHERE ${where}`, params);
    const totalRows = parseInt(countRows[0].total);
    const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
    page = Math.min(page, totalPages);
    const offset = (page - 1) * perPage;

    params.push(perPage, offset);

    const [rows] = await pool.query(`
      SELECT m.*, c.nombre categoria, 
      COALESCE((SELECT SUM(cantidad) FROM lotes WHERE medicamento_id=m.id AND fecha_vencimiento>=CURDATE()),0) stock 
      FROM medicamentos m 
      LEFT JOIN categorias c ON c.id=m.categoria_id 
      WHERE ${where} 
      ORDER BY m.nombre_comercial LIMIT ? OFFSET ?
    `, params);

    const [cats] = await pool.query("SELECT * FROM categorias WHERE activo=1 ORDER BY nombre");
    const [labs] = await pool.query("SELECT DISTINCT laboratorio FROM medicamentos WHERE activo=1 AND laboratorio<>'' ORDER BY laboratorio");
    const [acciones] = await pool.query("SELECT DISTINCT accion_terapeutica FROM medicamentos WHERE activo=1 AND accion_terapeutica<>'' ORDER BY accion_terapeutica");
    const [principios] = await pool.query("SELECT DISTINCT principio_activo FROM medicamentos WHERE activo=1 AND principio_activo<>'' ORDER BY principio_activo");

    res.json({
      ok: true,
      medicamentos: rows,
      filtros: { categorias: cats, laboratorios: labs, acciones, principios },
      paginacion: { page, totalPages, totalRows, perPage }
    });
  } catch (error) {
    next(error);
  }
};

const obtenerMedicamento = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [mRows] = await pool.query(
      "SELECT m.*, c.nombre categoria, COALESCE(SUM(l.cantidad),0) stock FROM medicamentos m LEFT JOIN categorias c ON c.id=m.categoria_id LEFT JOIN lotes l ON l.medicamento_id=m.id WHERE m.id=? AND m.activo=1 GROUP BY m.id", 
      [id]
    );
    
    if (!mRows[0]) return res.status(404).json({ ok: false, mensaje: "Medicamento no encontrado." });

    const [lotes] = await pool.query(
      "SELECT l.*, p.nombre proveedor, DATEDIFF(l.fecha_vencimiento, CURDATE()) dias FROM lotes l LEFT JOIN proveedores p ON p.id=l.proveedor_id WHERE l.medicamento_id=? ORDER BY l.fecha_vencimiento", 
      [id]
    );

    res.json({ ok: true, medicamento: mRows[0], lotes });
  } catch (error) {
    next(error);
  }
};

const guardarMedicamento = async (req, res, next) => {
  try {
    const id = parseInt(req.body.id || 0);
    
    // Extraemos las variables primero para usarlas en nuestras validaciones
    const nombre_comercial = (req.body.nombre_comercial || "").trim();
    const principio_activo = (req.body.principio_activo || "").trim();
    const laboratorio = (req.body.laboratorio || "").trim();
    const categoria_id = req.body.categoria_id || null;
    const presentacion = (req.body.presentacion || "").trim();
    const precio = parseFloat(req.body.precio || 0);
    const stock_minimo = parseInt(req.body.stock_minimo || 0);
    const requiere_receta = req.body.requiere_receta !== undefined && req.body.requiere_receta !== false && req.body.requiere_receta !== '0' ? 1 : 0;
    const sintoma = (req.body.sintoma || "").trim();
    const accion_terapeutica = (req.body.accion_terapeutica || "").trim();

    // ÍTEM 1.8: Control de inexistentes (al editar)
    if (id) {
      const [existeMed] = await pool.query("SELECT id FROM medicamentos WHERE id = ?", [id]);
      if (existeMed.length === 0) {
        return res.status(404).json({ ok: false, mensaje: "El medicamento que intenta editar no existe." });
      }
    }

    // ÍTEM 1.6: Validación de categoría
    if (categoria_id) {
      const [catRows] = await pool.query("SELECT id FROM categorias WHERE id = ? AND activo = 1", [categoria_id]);
      if (catRows.length === 0) {
        return res.status(400).json({ ok: false, mensaje: "La categoría especificada no existe o se encuentra inactiva." });
      }
    }

    // ÍTEM 1.7: Control de duplicados (HTTP 409)
    let dupQuery = "SELECT id FROM medicamentos WHERE nombre_comercial = ? AND presentacion = ? AND laboratorio = ?";
    let dupParams = [nombre_comercial, presentacion, laboratorio];
    
    if (id) {
      dupQuery += " AND id != ?";
      dupParams.push(id);
    }
    
    const [duplicados] = await pool.query(dupQuery, dupParams);
    if (duplicados.length > 0) {
      return res.status(409).json({ ok: false, mensaje: "Ya existe un medicamento registrado con la misma combinación de nombre, presentación y laboratorio." });
    }

    // REGISTRO Y ACTUALIZACIÓN
    const data = [nombre_comercial, principio_activo, laboratorio, categoria_id, presentacion, precio, stock_minimo, requiere_receta, sintoma, accion_terapeutica];

    if (id) {
      data.push(id);
      await pool.query("UPDATE medicamentos SET nombre_comercial=?, principio_activo=?, laboratorio=?, categoria_id=?, presentacion=?, precio=?, stock_minimo=?, requiere_receta=?, sintoma=?, accion_terapeutica=? WHERE id=?", data);
      res.json({ ok: true, mensaje: "Medicamento actualizado." });
    } else {
      await pool.query("INSERT INTO medicamentos(nombre_comercial, principio_activo, laboratorio, categoria_id, presentacion, precio, stock_minimo, requiere_receta, sintoma, accion_terapeutica) VALUES(?,?,?,?,?,?,?,?,?,?)", data);
      res.json({ ok: true, mensaje: "Medicamento registrado." });
    }
  } catch (error) {
    next(error);
  }
};

const inactivarMedicamento = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    // ÍTEM 1.8: Control de inexistentes (al inactivar)
    const [existeMed] = await pool.query("SELECT id FROM medicamentos WHERE id = ?", [id]);
    if (existeMed.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "El medicamento que intenta inactivar no existe." });
    }

    await pool.query("UPDATE medicamentos SET activo=0 WHERE id=?", [id]);
    res.json({ ok: true, mensaje: "Medicamento inactivado." });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarMedicamentos, obtenerMedicamento, guardarMedicamento, inactivarMedicamento };