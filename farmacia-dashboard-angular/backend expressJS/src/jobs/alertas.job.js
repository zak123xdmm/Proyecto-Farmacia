"use strict";

const { pool } = require("../config/database");
const alertsService = require("../services/alerts.service");

const INTERVALO_DIARIO = 24 * 60 * 60 * 1000;

const escanearBaseDeDatos = async () => {
  console.log("[Job] Iniciando escaneo automático de stock y caducidad...");
  try {
    const [lotes] = await pool.query(`
      SELECT l.id as lote_id, l.medicamento_id, m.nombre_comercial, l.numero_lote, DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias
      FROM lotes l
      JOIN medicamentos m ON m.id = l.medicamento_id
      WHERE l.cantidad > 0 AND DATEDIFF(l.fecha_vencimiento, CURDATE()) IN (30, 60, 90)
    `);

    for (const lote of lotes) {
      const msj = `El lote ${lote.numero_lote} de ${lote.nombre_comercial} caducará en ${lote.dias} días.`;
      
      const [res] = await pool.query(`
        INSERT IGNORE INTO alertas(tipo, medicamento_id, lote_id, nivel_dias, mensaje)
        VALUES('CADUCIDAD', ?, ?, ?, ?)
      `, [lote.medicamento_id, lote.lote_id, lote.dias, msj]);
      
      if (res.affectedRows > 0) {
        alertsService.enviarCorreoAlerta('🚨 Alerta de Caducidad (FEFO)', msj);
      }
    }

    const [stocks] = await pool.query(`
      SELECT m.id as medicamento_id, m.nombre_comercial, m.stock_minimo,
             COALESCE(SUM(CASE WHEN l.fecha_vencimiento >= CURDATE() THEN l.cantidad ELSE 0 END), 0) as stock_actual
      FROM medicamentos m
      LEFT JOIN lotes l ON l.medicamento_id = m.id
      WHERE m.activo = 1
      GROUP BY m.id
      HAVING stock_actual <= m.stock_minimo
    `);

    for (const item of stocks) {
      const msj = `El stock de ${item.nombre_comercial} (${item.stock_actual}) alcanzó el mínimo de seguridad (${item.stock_minimo}).`;
      
      const [res] = await pool.query(`
        INSERT IGNORE INTO alertas(tipo, medicamento_id, lote_id, nivel_dias, mensaje)
        VALUES('STOCK', ?, NULL, NULL, ?)
      `, [item.medicamento_id, msj]);

      if (res.affectedRows > 0) {
        alertsService.enviarCorreoAlerta('Alerta de Reabastecimiento', msj);
      }
    }

  } catch (error) {
    console.error("[Job] Falló el escaneo de alertas:", error.message);
  }
};

const iniciarJobAlertas = () => {
  escanearBaseDeDatos();
  setInterval(escanearBaseDeDatos, INTERVALO_DIARIO);
};

module.exports = { iniciarJobAlertas };