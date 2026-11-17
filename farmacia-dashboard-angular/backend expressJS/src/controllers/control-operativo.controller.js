"use strict";

const { pool } = require("../config/database");
const {
  errorHttp, entero, motivoValido, fechas, paginacion, transaccion, registrarMovimiento,
} = require("../services/control-operativo.service");

const TIPOS = ["SALDO_INICIAL", "INGRESO", "VENTA", "DEVOLUCION", "AJUSTE_ENTRADA", "AJUSTE_SALIDA", "ANULACION"];

async function historial(req, res, next) {
  try {
    const medId = entero(req.params.id, "El medicamento");
    const rango = fechas(req.query);
    const { perPage, page: solicitada } = paginacion(req.query);
    const where = ["mi.medicamento_id=?"];
    const params = [medId];
    if (req.query.lote_id) { where.push("mi.lote_id=?"); params.push(entero(req.query.lote_id, "El lote")); }
    if (req.query.tipo) {
      if (!TIPOS.includes(req.query.tipo)) throw errorHttp(400, "Tipo de movimiento inválido.");
      where.push("mi.tipo=?"); params.push(req.query.tipo);
    }
    if (rango.desde) { where.push("mi.creado_en>=?"); params.push(rango.desde); }
    if (rango.hasta) { where.push("mi.creado_en<DATE_ADD(?, INTERVAL 1 DAY)"); params.push(rango.hasta); }
    const orden = req.query.orden || "desc";
    if (!["asc", "desc"].includes(orden)) throw errorHttp(400, "Orden de movimientos inválido.");
    const resultado = await transaccion(async conn => {
      const [[med]] = await conn.query("SELECT id, nombre_comercial FROM medicamentos WHERE id=?", [medId]);
      if (!med) throw errorHttp(404, "Medicamento no encontrado.");
      const [[conteo]] = await conn.query(`SELECT COUNT(*) total FROM movimientos_inventario mi WHERE ${where.join(" AND ")}`, params);
      const totalRows = Number(conteo.total);
      const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
      const page = Math.min(solicitada, totalPages);
      const [movimientos] = await conn.query(`SELECT mi.*, l.numero_lote, u.nombre usuario,
        CASE WHEN mi.tipo IN ('INGRESO','SALDO_INICIAL','AJUSTE_ENTRADA','ANULACION')
          THEN mi.cantidad ELSE 0 END entrada,
        CASE WHEN mi.tipo IN ('VENTA','DEVOLUCION','AJUSTE_SALIDA')
          THEN mi.cantidad ELSE 0 END salida
        FROM movimientos_inventario mi JOIN lotes l ON l.id=mi.lote_id
        LEFT JOIN usuarios u ON u.id=mi.usuario_id WHERE ${where.join(" AND ")}
        ORDER BY mi.creado_en ${orden}, mi.id ${orden} LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage]);
      return { medicamento: med, movimientos, paginacion: { page, perPage, totalPages, totalRows } };
    }, true);
    res.json({ ok: true, ...resultado });
  } catch (error) { next(error); }
}

async function listarConteos(req, res, next) {
  try {
    const { page: solicitada, perPage } = paginacion(req.query);
    const where = ["1=1"];
    const params = [];
    if (req.query.estado) {
      if (!["PENDIENTE", "APLICADO", "SIN_DIFERENCIA"].includes(req.query.estado)) throw errorHttp(400, "Estado de conteo inválido.");
      where.push("c.estado=?"); params.push(req.query.estado);
    }
    for (const campo of ["medicamento_id", "lote_id"]) {
      if (req.query[campo]) { where.push(`c.${campo}=?`); params.push(entero(req.query[campo], "El identificador")); }
    }
    const resultado = await transaccion(async conn => {
      const [[contador]] = await conn.query(`SELECT COUNT(*) total FROM conteos_inventario c WHERE ${where.join(" AND ")}`, params);
      const totalRows = Number(contador.total);
      const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
      const page = Math.min(solicitada, totalPages);
      const [conteos] = await conn.query(`SELECT c.*, m.nombre_comercial, l.numero_lote,
        l.fecha_vencimiento, ui.nombre iniciado_usuario, uc.nombre contado_usuario, uf.nombre confirmado_usuario
        FROM conteos_inventario c JOIN medicamentos m ON m.id=c.medicamento_id JOIN lotes l ON l.id=c.lote_id
        JOIN usuarios ui ON ui.id=c.iniciado_por LEFT JOIN usuarios uc ON uc.id=c.contado_por
        LEFT JOIN usuarios uf ON uf.id=c.confirmado_por WHERE ${where.join(" AND ")}
        ORDER BY c.id DESC LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
      return { conteos, paginacion: { page, perPage, totalPages, totalRows } };
    }, true);
    res.json({ ok: true, ...resultado });
  } catch (error) { next(error); }
}

async function iniciarConteo(req, res, next) {
  try {
    const loteId = entero(req.body.lote_id, "El lote");
    const conteo = await transaccion(async conn => {
      const [[origen]] = await conn.query("SELECT medicamento_id FROM lotes WHERE id=?", [loteId]);
      if (!origen) throw errorHttp(404, "Lote no encontrado.");
      await conn.query("SELECT id FROM medicamentos WHERE id=? FOR UPDATE", [origen.medicamento_id]);
      const [[lote]] = await conn.query("SELECT * FROM lotes WHERE id=? FOR UPDATE", [loteId]);
      if (!lote) throw errorHttp(404, "Lote no encontrado.");
      const [insert] = await conn.query(`INSERT INTO conteos_inventario
        (medicamento_id, lote_id, cantidad_sistema, version_stock, iniciado_por) VALUES (?, ?, ?, ?, ?)`,
      [lote.medicamento_id, loteId, lote.cantidad, lote.version_stock, req.user.sub]);
      return { id: insert.insertId, lote_id: loteId, medicamento_id: lote.medicamento_id,
        cantidad_sistema: lote.cantidad, estado: "PENDIENTE" };
    });
    res.status(201).json({ ok: true, conteo, mensaje: "Conteo iniciado. Registre ahora las unidades físicas del lote." });
  } catch (error) { next(error); }
}

async function registrarConteo(req, res, next) {
  try {
    const id = entero(req.params.id, "El conteo");
    const fisica = entero(req.body.cantidad_fisica, "La cantidad física", 0);
    const motivo = motivoValido(req.body.motivo);
    const conteo = await transaccion(async conn => {
      const [[actual]] = await conn.query("SELECT * FROM conteos_inventario WHERE id=? FOR UPDATE", [id]);
      if (!actual) throw errorHttp(404, "Conteo no encontrado.");
      if (actual.estado !== "PENDIENTE") throw errorHttp(409, "El conteo ya está cerrado y no se puede modificar.");
      const diferencia = fisica - Number(actual.cantidad_sistema);
      await conn.query(`UPDATE conteos_inventario SET cantidad_fisica=?, diferencia=?, motivo=?, contado_por=?, revision=revision+1 WHERE id=?`,
        [fisica, diferencia, motivo, req.user.sub, id]);
      return { ...actual, cantidad_fisica: fisica, diferencia, motivo, contado_por: req.user.sub, revision: Number(actual.revision) + 1 };
    });
    res.json({ ok: true, conteo, mensaje: "Conteo registrado. Pendiente de confirmación del Administrador/Gerente." });
  } catch (error) { next(error); }
}

async function confirmarConteo(req, res, next) {
  try {
    const id = entero(req.params.id, "El conteo");
    const conteo = await transaccion(async conn => {
      const [[c]] = await conn.query("SELECT * FROM conteos_inventario WHERE id=? FOR UPDATE", [id]);
      if (!c) throw errorHttp(404, "Conteo no encontrado.");
      if (c.estado !== "PENDIENTE") throw errorHttp(409, "Este conteo ya fue confirmado. No se aplicó otra vez.");
      if (c.cantidad_fisica === null || !c.contado_por) throw errorHttp(400, "Registre primero la cantidad física y el motivo.");
      motivoValido(c.motivo);
      const revision = entero(req.body.revision, "La revisión del conteo", 0);
      if (revision !== Number(c.revision)) throw errorHttp(409, "El conteo fue modificado. Actualice y revise el resumen antes de confirmar.");
      await conn.query("SELECT id FROM medicamentos WHERE id=? FOR UPDATE", [c.medicamento_id]);
      const [[lote]] = await conn.query("SELECT * FROM lotes WHERE id=? FOR UPDATE", [c.lote_id]);
      if (!lote) throw errorHttp(404, "Lote no encontrado.");
      if (String(lote.version_stock) !== String(c.version_stock) || Number(lote.cantidad) !== Number(c.cantidad_sistema)) {
        throw errorHttp(409, "El stock cambió después de iniciar el conteo. Inicie un nuevo conteo y vuelva a contar el lote.");
      }
      const diferencia = Number(c.cantidad_fisica) - Number(lote.cantidad);
      if (diferencia !== 0) {
        await conn.query("UPDATE lotes SET cantidad=?, version_stock=version_stock+1 WHERE id=?", [c.cantidad_fisica, lote.id]);
        await registrarMovimiento(conn, { lote_id: lote.id, medicamento_id: c.medicamento_id,
          tipo: diferencia > 0 ? "AJUSTE_ENTRADA" : "AJUSTE_SALIDA", anterior: Number(lote.cantidad),
          posterior: Number(c.cantidad_fisica), usuario_id: req.user.sub, origen_tipo: "CONTEO", origen_id: id,
          referencia: `Conteo #${id}` });
      }
      const estado = diferencia === 0 ? "SIN_DIFERENCIA" : "APLICADO";
      await conn.query(`UPDATE conteos_inventario SET estado=?, confirmado_por=?, confirmado_en=CURRENT_TIMESTAMP WHERE id=?`,
        [estado, req.user.sub, id]);
      return { id, estado, diferencia, cantidad_fisica: Number(c.cantidad_fisica) };
    });
    res.json({ ok: true, conteo, mensaje: conteo.estado === "SIN_DIFERENCIA"
      ? "Conteo cerrado sin diferencias. El stock no cambió." : "Ajuste confirmado y registrado en el historial." });
  } catch (error) { next(error); }
}

// El detalle original es la única fuente de cantidades a restituir.
function validarDetalle(venta, detalles) {
  if (!detalles.length) return "La venta anterior no tiene un detalle por lote verificable.";
  let centavos = 0;
  for (const d of detalles) {
    if (!d.lote_existe || Number(d.lote_medicamento_id) !== Number(d.medicamento_id) ||
        !Number.isInteger(Number(d.cantidad)) || Number(d.cantidad) <= 0 ||
        !Number.isFinite(Number(d.precio_unitario)) || Number(d.precio_unitario) < 0 ||
        Math.round(Number(d.subtotal) * 100) !== Math.round(Number(d.precio_unitario) * 100) * Number(d.cantidad)) {
      return "El detalle histórico de la venta no permite verificar los lotes y las cantidades originales.";
    }
    centavos += Math.round(Number(d.subtotal) * 100);
  }
  if (centavos !== Math.round(Number(venta.total) * 100)) return "El detalle histórico no coincide con el total original de la venta.";
  return null;
}

async function detalleOriginal(conn, id) {
  const [detalles] = await conn.query(`SELECT d.*, m.nombre_comercial, l.numero_lote,
    l.id lote_existe, l.medicamento_id lote_medicamento_id, l.fecha_vencimiento
    FROM venta_detalles d LEFT JOIN medicamentos m ON m.id=d.medicamento_id
    LEFT JOIN lotes l ON l.id=d.lote_id WHERE d.venta_id=? ORDER BY d.lote_id, d.id`, [id]);
  return detalles;
}

async function detalleVenta(req, res, next) {
  try {
    const id = entero(req.params.id, "La venta");
    const resultado = await transaccion(async conn => {
      const [[venta]] = await conn.query(`SELECT v.*, u.nombre usuario, a.nombre anulada_usuario
        FROM ventas v JOIN usuarios u ON u.id=v.usuario_id LEFT JOIN usuarios a ON a.id=v.anulada_por WHERE v.id=?`, [id]);
      if (!venta) throw errorHttp(404, "Venta no encontrada.");
      const detalles = await detalleOriginal(conn, id);
      const motivo_bloqueo = venta.estado === "ANULADA" ? "La venta ya está anulada." : validarDetalle(venta, detalles);
      return { venta, detalles, puede_anular: !motivo_bloqueo, motivo_bloqueo };
    }, true);
    res.json({ ok: true, ...resultado });
  } catch (error) { next(error); }
}

async function anularVenta(req, res, next) {
  try {
    const id = entero(req.params.id, "La venta");
    const motivo = motivoValido(req.body.motivo);
    await transaccion(async conn => {
      const [[venta]] = await conn.query("SELECT * FROM ventas WHERE id=? FOR UPDATE", [id]);
      if (!venta) throw errorHttp(404, "Venta no encontrada.");
      if (venta.estado === "ANULADA") throw errorHttp(409, "La venta ya fue anulada. No se restituyó stock otra vez.");
      const detalles = await detalleOriginal(conn, id);
      const bloqueo = validarDetalle(venta, detalles);
      if (bloqueo) throw errorHttp(409, `${bloqueo} La anulación automática está bloqueada.`);
      const meds = [...new Set(detalles.map(d => Number(d.medicamento_id)))].sort((a, b) => a - b);
      for (const medId of meds) await conn.query("SELECT id FROM medicamentos WHERE id=? FOR UPDATE", [medId]);
      const porLote = new Map();
      for (const d of detalles) porLote.set(Number(d.lote_id), (porLote.get(Number(d.lote_id)) || 0) + Number(d.cantidad));
      for (const [loteId, cantidad] of [...porLote.entries()].sort((a, b) => a[0] - b[0])) {
        const [[lote]] = await conn.query("SELECT * FROM lotes WHERE id=? FOR UPDATE", [loteId]);
        if (!lote) throw errorHttp(409, "No se encontró un lote original. La anulación se revirtió.");
        const posterior = entero(Number(lote.cantidad) + cantidad, "El stock restituido", 0);
        await conn.query("UPDATE lotes SET cantidad=?, version_stock=version_stock+1 WHERE id=?", [posterior, loteId]);
        await registrarMovimiento(conn, { lote_id: loteId, medicamento_id: lote.medicamento_id,
          tipo: "ANULACION", anterior: Number(lote.cantidad), posterior, usuario_id: req.user.sub,
          origen_tipo: "VENTA", origen_id: id, referencia: `Anulación de venta #${id}` });
      }
      await conn.query(`UPDATE ventas SET estado='ANULADA', motivo_anulacion=?, anulada_por=?,
        anulada_en=CURRENT_TIMESTAMP WHERE id=?`, [motivo, req.user.sub, id]);
    });
    res.json({ ok: true, mensaje: `Venta #${id} anulada. Se restituyeron las cantidades a sus lotes de origen.` });
  } catch (error) { next(error); }
}

module.exports = { historial, listarConteos, iniciarConteo, registrarConteo, confirmarConteo, detalleVenta, anularVenta };
