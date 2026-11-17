"use strict";

const { pool } = require("../config/database");

function errorHttp(status, message) {
  return Object.assign(new Error(message), { status, expose: true });
}

function entero(valor, nombre, minimo = 1, maximo = 2147483647) {
  const valido = typeof valor === "number" ||
    (typeof valor === "string" && /^\d+$/.test(valor));
  const numero = valido ? Number(valor) : NaN;
  if (!Number.isSafeInteger(numero) || numero < minimo || numero > maximo) {
    throw errorHttp(400, `${nombre} debe ser un número entero entre ${minimo} y ${maximo}.`);
  }
  return numero;
}

function motivoValido(valor) {
  if (typeof valor !== "string" || !valor.trim() || valor.trim().length > 500) {
    throw errorHttp(400, "Debe indicar un motivo de entre 1 y 500 caracteres.");
  }
  return valor.trim();
}

function fechas(query) {
  const resultado = {};
  for (const campo of ["desde", "hasta"]) {
    const valor = query[campo];
    if (valor === undefined || valor === "") continue;
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
        valor < "1000-01-01" || valor > "9999-12-31" ||
        !Number.isFinite(Date.parse(`${valor}T00:00:00Z`)) ||
        new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) !== valor) {
      throw errorHttp(400, `La fecha ${campo} debe ser válida y tener formato AAAA-MM-DD.`);
    }
    resultado[campo] = valor;
  }
  if (resultado.desde && resultado.hasta && resultado.desde > resultado.hasta) {
    throw errorHttp(400, "La fecha inicial no puede ser posterior a la fecha final.");
  }
  return resultado;
}

function paginacion(query) {
  return {
    page: query.page === undefined ? 1 : entero(query.page, "La página"),
    perPage: query.per_page === undefined ? 10 : entero(query.per_page, "El tamaño de página", 1, 100),
  };
}

async function transaccion(operacion, lectura = false) {
  const conn = await pool.getConnection();
  try {
    if (lectura) await conn.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await conn.beginTransaction();
    const resultado = await operacion(conn);
    await conn.commit();
    return resultado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// Se llama exclusivamente con la conexión que modifica el stock, antes del COMMIT.
async function registrarMovimiento(conn, datos) {
  const anterior = entero(datos.anterior, "El saldo anterior", 0);
  const posterior = entero(datos.posterior, "El saldo posterior", 0);
  await conn.query(
    `INSERT INTO movimientos_inventario
     (lote_id, medicamento_id, tipo, cantidad, saldo_anterior, saldo_posterior,
      usuario_id, origen_tipo, origen_id, referencia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [datos.lote_id, datos.medicamento_id, datos.tipo, Math.abs(posterior - anterior),
      anterior, posterior, datos.usuario_id, datos.origen_tipo, datos.origen_id, datos.referencia],
  );
}

module.exports = { errorHttp, entero, motivoValido, fechas, paginacion, transaccion, registrarMovimiento };
