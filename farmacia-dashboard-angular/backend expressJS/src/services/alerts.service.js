"use strict";

const env = require("../config/env");

const enviarCorreoAlerta = (asunto, mensaje) => {
  const emails = env.alerts.emails;
  
  if (!emails || emails.length === 0) {
    console.log(`[Alerta guardada en DB] No hay correos configurados para notificar.`);
    return;
  }

  console.log(`\n📧 --- NUEVO CORREO DE ALERTA ---`);
  console.log(`Para: ${emails.join(", ")}`);
  console.log(`Asunto: ${asunto}`);
  console.log(`Mensaje: ${mensaje}`);
  console.log(`--------------------------------\n`);
};

module.exports = { enviarCorreoAlerta };