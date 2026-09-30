"use strict";

const mysql = require("mysql2/promise");
const { db } = require("./env");

const pool = mysql.createPool({
  host: db.host,
  user: db.user,
  password: db.pass,
  database: db.name,
  charset: db.charset,
  dateStrings: true,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch (err) {
    throw new Error(
      "Error de conexión con MySQL. Verifica que XAMPP/MySQL esté iniciado y ejecuta database.sql. Detalle: " +
        err.message,
      { cause: err },
    );
  }
}

module.exports = { pool, testConnection };
