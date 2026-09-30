"use strict";

const { pool } = require("../config/database");

const obtenerDatosVenta = async (req, res, next) => {
  try {
    const [meds] = await pool.query(`
      SELECT m.id, m.nombre_comercial, m.precio, m.requiere_receta, 
             COALESCE(SUM(CASE WHEN l.fecha_vencimiento>=CURDATE() THEN l.cantidad ELSE 0 END),0) stock 
      FROM medicamentos m 
      LEFT JOIN lotes l ON l.medicamento_id = m.id 
      WHERE m.activo = 1 
      GROUP BY m.id 
      ORDER BY m.nombre_comercial
    `);

    const [recent] = await pool.query(`
      SELECT v.*, u.nombre usuario 
      FROM ventas v 
      JOIN usuarios u ON u.id = v.usuario_id 
      ORDER BY v.id DESC LIMIT 10
    `);

    res.json({ ok: true, medicamentos: meds, ultimas_ventas: recent });
  } catch (error) {
    next(error);
  }
};

const registrarVenta = async (req, res, next) => {
  let conn;
  try {
    const { medicamento_id, cantidad, receta } = req.body;
    const qty = Math.max(1, parseInt(cantidad) || 1);
    const medId = parseInt(medicamento_id);

    if (isNaN(medId)) {
      return res
        .status(400)
        .json({
          ok: false,
          mensaje: "ID de medicamento inválido o faltante en la petición.",
        });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Validar stock vigente (no vencido)
    const [vigRows] = await conn.query(
      "SELECT COALESCE(SUM(cantidad),0) as stockVigente FROM lotes WHERE medicamento_id=? AND cantidad>0 AND fecha_vencimiento>=CURDATE()",
      [medId],
    );
    const stockVigente = parseInt(vigRows[0].stockVigente);

    const [mRows] = await conn.query(
      "SELECT * FROM medicamentos WHERE id=? AND activo=1 FOR UPDATE",
      [medId],
    );
    const m = mRows[0];

    if (!m || stockVigente < qty) {
      await conn.rollback();
      return res
        .status(400)
        .json({
          ok: false,
          mensaje:
            "Stock insuficiente (solo se cuentan lotes vigentes, no vencidos).",
        });
    }

    if (m.requiere_receta && !receta) {
      await conn.rollback();
      return res
        .status(400)
        .json({
          ok: false,
          mensaje: "Este medicamento requiere receta médica.",
        });
    }

    const [lotesDisp] = await conn.query(
      "SELECT * FROM lotes WHERE medicamento_id=? AND cantidad>0 AND fecha_vencimiento>=CURDATE() ORDER BY fecha_vencimiento ASC FOR UPDATE",
      [medId],
    );

    const price = parseFloat(m.precio);
    const total = price * qty;

    const [ventaRes] = await conn.query(
      "INSERT INTO ventas(usuario_id, total) VALUES(?, ?)",
      [req.user.sub, total],
    );
    const vid = ventaRes.insertId;

    let restante = qty;
    for (const l of lotesDisp) {
      if (restante <= 0) break;
      const tomar = Math.min(restante, parseInt(l.cantidad));
      const subtotal = price * tomar;

      await conn.query(
        "INSERT INTO venta_detalles(venta_id, medicamento_id, lote_id, cantidad, precio_unitario, subtotal) VALUES(?, ?, ?, ?, ?, ?)",
        [vid, medId, l.id, tomar, price, subtotal],
      );
      await conn.query("UPDATE lotes SET cantidad=cantidad-? WHERE id=?", [
        tomar,
        l.id,
      ]);
      await conn.query(
        "INSERT INTO movimientos_inventario(lote_id, tipo, cantidad, referencia) VALUES(?, 'VENTA', ?, ?)",
        [l.id, tomar, `Venta #${vid}`],
      );

      restante -= tomar;
    }

    await conn.commit();
    res.json({
      ok: true,
      mensaje: `Venta registrada #${vid} por Bs ${total.toFixed(2)}. Se aplicó FEFO sobre lotes vigentes.`,
    });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { obtenerDatosVenta, registrarVenta };
