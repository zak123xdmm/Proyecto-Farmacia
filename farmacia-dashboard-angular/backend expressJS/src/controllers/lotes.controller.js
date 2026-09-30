"use strict";

const { pool } = require("../config/database");

const listarLotes = async (req, res, next) => {
  try {
    const [meds] = await pool.query("SELECT id, nombre_comercial FROM medicamentos WHERE activo=1 ORDER BY nombre_comercial");
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
    
    if (qty < 1) return res.status(400).json({ ok: false, mensaje: 'La cantidad debe ser mayor a cero.' });
    if (new Date(fecha_vencimiento) < new Date(fecha_ingreso)) {
      return res.status(400).json({ ok: false, mensaje: 'La fecha de vencimiento no puede ser anterior al ingreso.' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [loteRes] = await conn.query(
      "INSERT INTO lotes(medicamento_id, proveedor_id, numero_lote, fecha_ingreso, fecha_vencimiento, cantidad, costo_unitario) VALUES(?, ?, ?, ?, ?, ?, ?)",
      [parseInt(medicamento_id), proveedor_id || null, numero_lote.trim(), fecha_ingreso, fecha_vencimiento, qty, parseFloat(costo_unitario)]
    );
    
    const loteId = loteRes.insertId;
    await conn.query(
      "INSERT INTO movimientos_inventario(lote_id, tipo, cantidad, referencia) VALUES(?, 'INGRESO', ?, ?)",
      [loteId, qty, 'Compra / ingreso']
    );

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
      return res.status(400).json({ ok: false, mensaje: 'La cantidad a devolver supera el stock disponible del lote.' });
    }

    const ref = 'Devolución a laboratorio' + (referencia ? ' — ' + referencia.trim() : '');
    
    await conn.query("UPDATE lotes SET cantidad = cantidad - ? WHERE id = ?", [qty, lId]);
    await conn.query(
      "INSERT INTO movimientos_inventario(lote_id, tipo, cantidad, referencia) VALUES(?, 'DEVOLUCION', ?, ?)", 
      [lId, qty, ref]
    );

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