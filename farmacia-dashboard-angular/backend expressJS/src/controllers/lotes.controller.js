"use strict";

const { pool } = require("../config/database");
const { registrarMovimiento } = require("../services/control-operativo.service");

const listarLotes = async (req, res, next) => {
  try {
    const [meds] = await pool.query("SELECT id, nombre_comercial, principio_activo, laboratorio FROM medicamentos WHERE activo=1 ORDER BY nombre_comercial");
    const [prov] = await pool.query("SELECT id, nombre FROM proveedores WHERE activo=1 ORDER BY nombre");
    const [rows] = await pool.query(`
      SELECT l.*, m.nombre_comercial, p.nombre proveedor, DATEDIFF(l.fecha_vencimiento, CURDATE()) dias 
      FROM lotes l 
      JOIN medicamentos m ON m.id = l.medicamento_id 
      LEFT JOIN proveedores p ON p.id = l.proveedor_id 
      ORDER BY l.fecha_vencimiento
    `);
    res.json({ ok: true, medicamentos: meds, proveedores: prov, lotes: rows });
  } catch (error) {
    next(error);
  }
};

const listarMovimientos = async (req, res, next) => {
  try {
    const [mov] = await pool.query(`
      SELECT mi.*, l.numero_lote, m.nombre_comercial 
      FROM movimientos_inventario mi 
      JOIN lotes l ON l.id = mi.lote_id 
      JOIN medicamentos m ON m.id = l.medicamento_id 
      ORDER BY mi.id DESC LIMIT 20
    `);
    res.json({ ok: true, movimientos: mov });
  } catch (error) {
    next(error);
  }
};

const ingresarLote = async (req, res, next) => {
  let conn;
  try {
    const { medicamento_id, proveedor_id, numero_lote, fecha_ingreso, fecha_vencimiento, cantidad, costo_unitario } = req.body;
    const qty = parseInt(cantidad);
    const costo = parseFloat(costo_unitario);

    if (qty < 1 || qty > 10000) return res.status(400).json({ ok: false, mensaje: 'La cantidad debe estar entre 1 y 10,000.' });
    if (costo < 0 || costo > 10000) return res.status(400).json({ ok: false, mensaje: 'El costo unitario excede el límite permitido (10,000).' });

    if (new Date(fecha_vencimiento) < new Date(fecha_ingreso)) {
      return res.status(400).json({ ok: false, mensaje: 'La fecha de vencimiento no puede ser anterior al ingreso.' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Mismo orden de bloqueo que ventas, ajustes y anulaciones.
    const [[medicamento]] = await conn.query("SELECT id FROM medicamentos WHERE id=? AND activo=1 FOR UPDATE", [parseInt(medicamento_id)]);
    if (!medicamento) {
      await conn.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Medicamento no encontrado o inactivo.' });
    }
    const [loteExistente] = await conn.query(
      "SELECT id FROM lotes WHERE medicamento_id = ? AND numero_lote = ?",
      [parseInt(medicamento_id), numero_lote.trim()]
    );

    if (loteExistente.length > 0) {
      await conn.rollback();
      return res.status(409).json({ ok: false, mensaje: 'Este número de lote ya está registrado para este medicamento.' });
    }

    const [loteRes] = await conn.query(
      "INSERT INTO lotes(medicamento_id, proveedor_id, numero_lote, fecha_ingreso, fecha_vencimiento, cantidad, costo_unitario) VALUES(?, ?, ?, ?, ?, ?, ?)",
      [parseInt(medicamento_id), proveedor_id || null, numero_lote.trim(), fecha_ingreso, fecha_vencimiento, qty, parseFloat(costo_unitario)]
    );
    
    const loteId = loteRes.insertId;
    await registrarMovimiento(conn, { lote_id: loteId, medicamento_id: parseInt(medicamento_id),
      tipo: 'INGRESO', anterior: 0, posterior: qty, usuario_id: req.user.sub,
      origen_tipo: 'LOTE', origen_id: loteId, referencia: 'Compra / ingreso' });

    await conn.commit();
    res.json({ ok: true, mensaje: 'Lote ingresado correctamente.' });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

const devolverLote = async (req, res, next) => {
  let conn;
  try {
    const { lote_id, cantidad_devolucion, referencia } = req.body;
    const qty = parseInt(cantidad_devolucion);
    const lId = parseInt(lote_id);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[origen]] = await conn.query("SELECT medicamento_id FROM lotes WHERE id=?", [lId]);
    if (!origen) {
      await conn.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Lote no encontrado.' });
    }
    await conn.query("SELECT id FROM medicamentos WHERE id=? FOR UPDATE", [origen.medicamento_id]);
    const [st] = await conn.query(
      "SELECT l.*, m.nombre_comercial FROM lotes l JOIN medicamentos m ON m.id = l.medicamento_id WHERE l.id = ? FOR UPDATE", 
      [lId]
    );
    const lote = st[0];

    if (!lote) {
      await conn.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Lote no encontrado.' });
    }
    if (qty < 1 || qty > parseInt(lote.cantidad)) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: `La cantidad supera el stock. Solo hay ${lote.cantidad} unidad(es) disponible(s).` });
    }

    const ref = 'Devolución a laboratorio' + (referencia ? ' — ' + referencia.trim() : '');
    
    await conn.query("UPDATE lotes SET cantidad = cantidad - ?, version_stock=version_stock+1 WHERE id = ?", [qty, lId]);
    await registrarMovimiento(conn, { lote_id: lId, medicamento_id: lote.medicamento_id,
      tipo: 'DEVOLUCION', anterior: Number(lote.cantidad), posterior: Number(lote.cantidad)-qty,
      usuario_id: req.user.sub, origen_tipo: null, origen_id: null, referencia: ref });

    await conn.commit();
    res.json({ ok: true, mensaje: `Devolución registrada: ${qty} unidad(es) de ${lote.nombre_comercial}.` });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { listarLotes, listarMovimientos, ingresarLote, devolverLote };