"use strict";

// Migración aditiva. Ejecutar con el servidor detenido: npm run migrar:iteracion3
const { pool } = require("../src/config/database");

async function migrar() {
  const conn = await pool.getConnection();
  let bloqueo = false;
  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':iteracion3'), 30) adquirido");
    if (Number(lock.adquirido) !== 1) throw new Error("Hay otra migración en curso.");
    bloqueo = true;
    await conn.query(`CREATE TABLE IF NOT EXISTS control_migraciones (
      version VARCHAR(80) PRIMARY KEY, aplicada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
    const [version] = await conn.query("SELECT version FROM control_migraciones WHERE version='003_control_operativo'");
    if (version.length) {
      console.log("La iteración 3 ya está instalada. No se modificaron datos.");
      return;
    }

    async function columna(tabla, nombre, definicion) {
      const [rows] = await conn.query(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
        [tabla, nombre],
      );
      if (!rows.length) await conn.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${nombre}\` ${definicion}`);
    }
    async function indice(tabla, nombre, definicion) {
      const [rows] = await conn.query(
        "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?",
        [tabla, nombre],
      );
      if (!rows.length) await conn.query(`ALTER TABLE \`${tabla}\` ADD ${definicion}`);
    }
    async function fk(tabla, nombre, definicion) {
      const [rows] = await conn.query(
        "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
        [tabla, nombre],
      );
      if (!rows.length) await conn.query(`ALTER TABLE \`${tabla}\` ADD CONSTRAINT \`${nombre}\` ${definicion}`);
    }

    await columna("lotes", "version_stock", "BIGINT UNSIGNED NOT NULL DEFAULT 0");
    await columna("ventas", "estado", "ENUM('VIGENTE','ANULADA') NOT NULL DEFAULT 'VIGENTE'");
    await columna("ventas", "motivo_anulacion", "VARCHAR(500) NULL");
    await columna("ventas", "anulada_por", "INT NULL");
    await columna("ventas", "anulada_en", "TIMESTAMP NULL DEFAULT NULL");
    await fk("ventas", "fk_venta_anulada_por", "FOREIGN KEY (anulada_por) REFERENCES usuarios(id)");
    await indice("ventas", "idx_ventas_estado_fecha", "INDEX idx_ventas_estado_fecha (estado, fecha)");

    await conn.query(`ALTER TABLE movimientos_inventario MODIFY tipo
      ENUM('INGRESO','VENTA','DEVOLUCION','SALDO_INICIAL','AJUSTE_ENTRADA','AJUSTE_SALIDA','ANULACION') NOT NULL`);
    await columna("movimientos_inventario", "medicamento_id", "INT NULL");
    await columna("movimientos_inventario", "usuario_id", "INT NULL");
    await columna("movimientos_inventario", "saldo_anterior", "INT NULL");
    await columna("movimientos_inventario", "saldo_posterior", "INT NULL");
    await columna("movimientos_inventario", "origen_tipo", "VARCHAR(30) NULL");
    await columna("movimientos_inventario", "origen_id", "INT NULL");
    await fk("movimientos_inventario", "fk_movimiento_medicamento", "FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)");
    await fk("movimientos_inventario", "fk_movimiento_usuario", "FOREIGN KEY (usuario_id) REFERENCES usuarios(id)");
    await indice("movimientos_inventario", "idx_movimiento_historial", "INDEX idx_movimiento_historial (medicamento_id, creado_en, id)");
    await indice("movimientos_inventario", "uq_movimiento_origen", "UNIQUE KEY uq_movimiento_origen (origen_tipo, origen_id, lote_id, tipo)");

    // El historial debe sobrevivir a las correcciones; no se permite borrarlo por cascada.
    const [claves] = await conn.query(`SELECT k.CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
        AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME
      WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.TABLE_NAME='movimientos_inventario'
        AND k.COLUMN_NAME='lote_id' AND r.DELETE_RULE='CASCADE'`);
    for (const clave of claves) {
      const nombre = clave.CONSTRAINT_NAME.replace(/`/g, "``");
      await conn.query(`ALTER TABLE movimientos_inventario DROP FOREIGN KEY \`${nombre}\``);
    }
    await fk("movimientos_inventario", "fk_movimiento_lote_preservado", "FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE RESTRICT");

    await conn.query(`CREATE TABLE IF NOT EXISTS conteos_inventario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      medicamento_id INT NOT NULL, lote_id INT NOT NULL,
      cantidad_sistema INT NOT NULL, version_stock BIGINT UNSIGNED NOT NULL,
      cantidad_fisica INT NULL, diferencia INT NULL, motivo VARCHAR(500) NULL,
      estado ENUM('PENDIENTE','APLICADO','SIN_DIFERENCIA') NOT NULL DEFAULT 'PENDIENTE',
      revision INT NOT NULL DEFAULT 0,
      iniciado_por INT NOT NULL, contado_por INT NULL, confirmado_por INT NULL,
      iniciado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, confirmado_en TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id),
      FOREIGN KEY (lote_id) REFERENCES lotes(id),
      FOREIGN KEY (iniciado_por) REFERENCES usuarios(id),
      FOREIGN KEY (contado_por) REFERENCES usuarios(id),
      FOREIGN KEY (confirmado_por) REFERENCES usuarios(id),
      INDEX idx_conteo_estado (estado, id)
    ) ENGINE=InnoDB`);

    await columna("conteos_inventario", "revision", "INT NOT NULL DEFAULT 0");
    await conn.beginTransaction();
    // Solo se completa la relación verificable con el lote; no se inventan saldos ni autores pasados.
    await conn.query(`UPDATE movimientos_inventario mi JOIN lotes l ON l.id=mi.lote_id
      SET mi.medicamento_id=l.medicamento_id WHERE mi.medicamento_id IS NULL`);
    await conn.query(`INSERT INTO movimientos_inventario
      (lote_id, medicamento_id, tipo, cantidad, saldo_anterior, saldo_posterior, origen_tipo, origen_id, referencia)
      SELECT l.id, l.medicamento_id, 'SALDO_INICIAL', l.cantidad, 0, l.cantidad,
        'SALDO_INICIAL', l.id, 'Saldo al activar la iteración 3; sin reconstrucción de operaciones pasadas'
      FROM lotes l WHERE NOT EXISTS (SELECT 1 FROM movimientos_inventario mi
        WHERE mi.lote_id=l.id AND mi.tipo='SALDO_INICIAL' AND mi.origen_tipo='SALDO_INICIAL')`);
    await conn.commit();

    for (const evento of ["UPDATE", "DELETE"]) {
      const nombre = `movimientos_sin_${evento.toLowerCase()}`;
      const [triggers] = await conn.query(
        "SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=?", [nombre],
      );
      if (!triggers.length) await conn.query(`CREATE TRIGGER ${nombre} BEFORE ${evento}
        ON movimientos_inventario FOR EACH ROW SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='El historial es inmutable. Registre una operación de corrección.'`);
    }
    await conn.query("INSERT INTO control_migraciones(version) VALUES ('003_control_operativo')");
    console.log("Iteración 3 instalada. Se conservaron los datos y se registró el saldo inicial de cada lote.");
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    if (bloqueo) await conn.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':iteracion3'))");
    conn.release();
  }
}

if (require.main === module) {
  migrar().catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
module.exports = { migrar };
