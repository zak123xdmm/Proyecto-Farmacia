"use strict";

const { pool } = require("../config/database");

const obtenerReportes = async (req, res, next) => {
  try {
    const periodo = req.query.periodo || 'mensual';
    const allowed = ['diario', 'semanal', 'mensual'];
    const p = allowed.includes(periodo) ? periodo : 'mensual';
    
    const days = p === 'diario' ? 1 : (p === 'semanal' ? 7 : 30);

    const [ventas] = await pool.query(
      "SELECT DATE(fecha) dia, COUNT(*) operaciones, COALESCE(SUM(total),0) total FROM ventas WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY DATE(fecha) ORDER BY dia ASC",
      [days]
    );

    const [top] = await pool.query(
      "SELECT m.nombre_comercial, SUM(d.cantidad) unidades, SUM(d.subtotal) total FROM venta_detalles d JOIN medicamentos m ON m.id=d.medicamento_id GROUP BY m.id ORDER BY unidades DESC LIMIT 10"
    );

    const [invRows] = await pool.query(
      "SELECT COALESCE(SUM(l.cantidad * l.costo_unitario),0) as valor FROM lotes l JOIN medicamentos m ON m.id=l.medicamento_id WHERE m.activo=1 AND l.cantidad>0 AND l.fecha_vencimiento>=CURDATE()"
    );
    const inv = parseFloat(invRows[0].valor);

    const [cad] = await pool.query(
      "SELECT l.*, m.nombre_comercial, DATEDIFF(l.fecha_vencimiento, CURDATE()) dias FROM lotes l JOIN medicamentos m ON m.id=l.medicamento_id WHERE l.cantidad>0 AND l.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY) ORDER BY l.fecha_vencimiento ASC"
    );

    res.json({
      ok: true,
      periodo: p,
      valor_inventario: inv,
      ventas_corte: ventas,
      productos_top: top,
      proximos_caducar: cad
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { obtenerReportes };