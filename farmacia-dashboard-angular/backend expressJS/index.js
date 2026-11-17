"use strict";

const app = require("./src/app");
const env = require("./src/config/env");
const { testConnection } = require("./src/config/database");
const { iniciarJobAlertas } = require("./src/jobs/alertas.job");

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await testConnection();
    console.log("Conexión exitosa a la base de datos.");

    iniciarJobAlertas();
    console.log("Job de alertas (FEFO/Stock) activado.");

    app.listen(PORT, () => {
      console.log(`\nServidor Express corriendo en http://localhost:${PORT}`);
      console.log(`Catálogo disponible en http://localhost:${PORT}/api/catalogo`);
    });
  } catch (error) {
    console.error("Fallo crítico al iniciar el servidor:");
    console.error(error.message);
    process.exit(1);
  }
}

iniciarServidor();