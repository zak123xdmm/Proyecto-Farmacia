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

// ---------------------------------------------------------------------------
// ÍTEM 4: Validación del registro de ventas (punto de venta)
// ---------------------------------------------------------------------------
const CANTIDAD_MIN = 1;
const CANTIDAD_MAX = 100;

// Convierte a entero SOLO si el valor es un entero real (number entero o
// string compuesto únicamente por dígitos). Cualquier otra cosa devuelve null:
// 0.5, "abc", "2.5", "", null, true, [], {} ...  (sin conversión silenciosa a 1)
const aEnteroEstricto = (valor) => {
  if (typeof valor === "number") {
    return Number.isInteger(valor) ? valor : null;
  }
  if (typeof valor === "string" && /^-?\d+$/.test(valor.trim())) {
    return parseInt(valor.trim(), 10);
  }
  return null;
};

// Receta estricta: solo cuenta como confirmada si llega true (o "true").
// "false", 0, 1, "si", "on", null, undefined => NO confirmada.
const recetaConfirmada = (valor) => valor === true || valor === "true";

const registrarVenta = async (req, res, next) => {
  let conn;
  try {
    const { medicamento_id, cantidad, receta } = req.body;

    // 1) ID de medicamento: entero positivo
    const medId = aEnteroEstricto(medicamento_id);
    if (medId === null || medId < 1) {
      return res.status(400).json({
        ok: false,
        mensaje: "ID de medicamento inválido o faltante en la petición.",
      });
    }

    // 2) Cantidad: entero entre 1 y 100 (no se convierte nada a 1)
    const qty = aEnteroEstricto(cantidad);
    if (qty === null || qty < CANTIDAD_MIN || qty > CANTIDAD_MAX) {
      return res.status(400).json({
        ok: false,
        mensaje: `La cantidad debe ser un número entero entre ${CANTIDAD_MIN} y ${CANTIDAD_MAX} unidades por operación.`,
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 3) Se bloquea PRIMERO el registro del medicamento (FOR UPDATE). Cualquier
    //    otra venta del mismo medicamento espera aquí hasta que esta termine,
    //    por lo que el stock se lee ya actualizado.
    const [mRows] = await conn.query(
      "SELECT * FROM medicamentos WHERE id=? AND activo=1 FOR UPDATE",
      [medId],
    );
    const m = mRows[0];

    if (!m) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        mensaje: "El medicamento no existe o se encuentra inactivo.",
      });
    }

    // 4) Receta: los medicamentos con receta exigen confirmación explícita
    if (m.requiere_receta && !recetaConfirmada(receta)) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        mensaje:
          "Este medicamento requiere receta médica: confirme explícitamente la receta para continuar.",
      });
    }

    // 5) Stock vigente (no vencido) calculado YA con el registro bloqueado
    const [vigRows] = await conn.query(
      "SELECT COALESCE(SUM(cantidad),0) as stockVigente FROM lotes WHERE medicamento_id=? AND cantidad>0 AND fecha_vencimiento>=CURDATE()",
      [medId],
    );
    const stockVigente = parseInt(vigRows[0].stockVigente);

    if (stockVigente < qty) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        mensaje: `Stock insuficiente: hay ${stockVigente} unidad(es) disponible(s) y se solicitaron ${qty}.`,
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
