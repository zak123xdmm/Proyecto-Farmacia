"use strict";

// Crea y elimina únicamente una base temporal propia; no modifica la base de la farmacia.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mysql = require("mysql2/promise");
const request = require("supertest");
const temporal = `farmacia_i3_test_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
process.env.DB_NAME = temporal;
const env = require("../src/config/env");
const { pool } = require("../src/config/database");
const { migrar } = require("./migrar-iteracion3");
const app = require("../src/app");
let adminDb, pruebas = 0;
const registrarError = console.error;
console.error = (...args) => {
  if (args[0]?.expose || args[0]?.sqlMessage === 'Fallo de prueba') return;
  registrarError(...args);
};

function token(sub, rol) {
  const h = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const p = Buffer.from(JSON.stringify({ sub, rol, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${h}.${p}.${crypto.createHmac("sha256", env.jwtSecret).update(`${h}.${p}`).digest("base64url")}`;
}
const admin = token(1, "Administrador/Gerente"), regente = token(2, "Farmacéutico Regente"), cajero = token(3, "Cajero/Dependiente");
async function api(method, url, body, status = 200, auth = admin) {
  let req = request(app)[method](url).set("Authorization", `Bearer ${auth}`);
  if (body !== undefined) req = req.send(body);
  const r = await req;
  assert.equal(r.status, status, `${method.toUpperCase()} ${url}: ${JSON.stringify(r.body)}`);
  pruebas++;
  return r.body;
}
const stock = async id => Number((await pool.query("SELECT cantidad FROM lotes WHERE id=?", [id]))[0][0].cantidad);
const fecha = dias => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
async function contar(loteId, fisica, auth = regente) {
  const { conteo } = await api("post", "/api/conteos", { lote_id:loteId }, 201, auth);
  const registro = await api("patch", `/api/conteos/${conteo.id}`, { cantidad_fisica:fisica, motivo:"Conteo físico de prueba" }, 200, auth);
  return registro.conteo;
}
async function confirmar(c, status = 200, auth = admin) { return api("post", `/api/conteos/${c.id}/confirmar`, { revision:c.revision }, status, auth); }
async function vender(med, cantidad, status = 200) { return api("post", "/api/ventas", { medicamento_id:med, cantidad, receta:true }, status, cajero); }
async function ultimaVenta() { return (await pool.query("SELECT MAX(id) id FROM ventas"))[0][0].id; }

async function main() {
  adminDb = await mysql.createConnection({ host:env.db.host, user:env.db.user, password:env.db.pass, multipleStatements:true, dateStrings:true });
  const sql = fs.readFileSync(path.join(__dirname, "../../database.sql"), "utf8").replace(/farmacia_sistema/g, temporal);
  await adminDb.query(sql);
  const [m] = await pool.query("INSERT INTO medicamentos(nombre_comercial,principio_activo,precio,stock_minimo) VALUES('Prueba Iteración 3','Prueba',10,30)");
  const med = m.insertId;
  const [l] = await pool.query("INSERT INTO lotes(medicamento_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) VALUES(?, 'I3-A',CURDATE(),?,20,5)", [med, fecha(20)]);
  const loteA = l.insertId;
  const [[antes]] = await pool.query("SELECT COUNT(*) total FROM movimientos_inventario");
  await migrar(); await migrar();
  const [[inicio]] = await pool.query("SELECT COUNT(*) total FROM movimientos_inventario WHERE tipo='SALDO_INICIAL' AND lote_id=?", [loteA]);
  assert.equal(Number(inicio.total), 1); assert.equal(await stock(loteA), 20);
  assert.equal(Number((await pool.query("SELECT COUNT(*) total FROM movimientos_inventario WHERE tipo='INGRESO'"))[0][0].total), Number(antes.total));
  pruebas++;

  await api("post", "/api/lotes/ingreso", { medicamento_id:med, numero_lote:"I3-B", fecha_ingreso:fecha(0), fecha_vencimiento:fecha(40), cantidad:10, costo_unitario:5 });
  const loteB = (await pool.query("SELECT id FROM lotes WHERE numero_lote='I3-B'"))[0][0].id;
  await vender(med, 4);
  const venta = await ultimaVenta();
  assert.equal(await stock(loteA) + await stock(loteB), 26);
  let historial = await api("get", `/api/medicamentos/${med}/movimientos?orden=asc`);
  assert.deepEqual(historial.movimientos.map(x => x.tipo), ["SALDO_INICIAL", "INGRESO", "VENTA"]);
  assert.equal(historial.movimientos[2].saldo_anterior, 20); assert.equal(historial.movimientos[2].saldo_posterior, 16);
  assert.equal(historial.movimientos[2].usuario_id, 3);
  let filtro = await api("get", `/api/medicamentos/${med}/movimientos?tipo=VENTA&lote_id=${loteA}`);
  assert.equal(filtro.movimientos.length, 1);
  filtro = await api("get", `/api/medicamentos/${med}/movimientos?tipo=ANULACION`);
  assert.equal(filtro.movimientos.length, 0);
  const eventosAntes = Number((await pool.query("SELECT COUNT(*) total FROM movimientos_inventario"))[0][0].total);
  await vender(med, 100, 400);
  assert.equal(Number((await pool.query("SELECT COUNT(*) total FROM movimientos_inventario"))[0][0].total), eventosAntes);
  assert.equal(await stock(loteA), 16);

  let c = await contar(loteA, 14);
  await confirmar(c, 403, regente); assert.equal(await stock(loteA), 16);
  await confirmar(c); assert.equal(await stock(loteA), 14);
  await confirmar(c, 409); assert.equal(await stock(loteA), 14);
  c = await contar(loteA, 17); await confirmar(c); assert.equal(await stock(loteA), 17);
  c = await contar(loteB, 0); await confirmar(c); assert.equal(await stock(loteB), 0);
  c = await contar(loteB, 0); await confirmar(c); assert.equal(await stock(loteB), 0);
  assert.equal((await pool.query("SELECT estado FROM conteos_inventario WHERE id=?", [c.id]))[0][0].estado, "SIN_DIFERENCIA");
  for (const invalida of [-1, 1.2, "texto", true, null]) await api("patch", `/api/conteos/${c.id}`, { cantidad_fisica:invalida, motivo:"Prueba" }, 400);
  c = await contar(loteA, 18);
  await vender(med, 1);
  const transitoria = await ultimaVenta();
  await api("post", `/api/ventas/${transitoria}/anular`, { motivo:"Prueba de versión de stock" });
  assert.equal(await stock(loteA), 17);
  await confirmar(c, 409); // También detecta venta seguida de anulación, aunque el saldo volvió al mismo valor.
  c = await contar(loteA, 18);
  await api("patch", `/api/conteos/${c.id}`, { cantidad_fisica:19, motivo:"Conteo corregido" });
  await confirmar(c, 409); // No aplica un resumen que otro usuario modificó después de revisarlo.
  const actualizado = (await api("get", "/api/conteos?per_page=100")).conteos.find(x => x.id === c.id);
  const doblesConteos = await Promise.all([
    request(app).post(`/api/conteos/${c.id}/confirmar`).set("Authorization", `Bearer ${admin}`).send({ revision:actualizado.revision }),
    request(app).post(`/api/conteos/${c.id}/confirmar`).set("Authorization", `Bearer ${admin}`).send({ revision:actualizado.revision }),
  ]);
  assert.deepEqual(doblesConteos.map(r => r.status).sort(), [200, 409]); assert.equal(await stock(loteA), 19); pruebas++;

  // Venta FEFO sobre dos lotes y restitución exacta bajo solicitudes concurrentes.
  c = await contar(loteA, 3); await confirmar(c);
  c = await contar(loteB, 10); await confirmar(c);
  await vender(med, 5);
  const multi = await ultimaVenta();
  const detalle = await api("get", `/api/ventas/${multi}`);
  assert.deepEqual(detalle.detalles.map(d => [d.lote_id, d.cantidad]), [[loteA,3],[loteB,2]]);
  assert.equal(await stock(loteA), 0); assert.equal(await stock(loteB), 8);
  await api("post", `/api/ventas/${multi}/anular`, { motivo:" " }, 400);
  await api("post", `/api/ventas/${multi}/anular`, { motivo:"Error" }, 403, cajero);

  // Fallo en el segundo movimiento: el primer lote, el segundo y la venta se revierten juntos.
  await pool.query(`CREATE TRIGGER qa_fallo_anulacion BEFORE INSERT ON movimientos_inventario FOR EACH ROW
    BEGIN IF NEW.tipo='ANULACION' AND NEW.lote_id=${Number(loteB)} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fallo de prueba'; END IF; END`);
  await api("post", `/api/ventas/${multi}/anular`, { motivo:"Prueba de rollback" }, 500);
  assert.equal(await stock(loteA), 0); assert.equal(await stock(loteB), 8);
  assert.equal((await pool.query("SELECT estado FROM ventas WHERE id=?", [multi]))[0][0].estado, "VIGENTE");
  assert.equal(Number((await pool.query("SELECT COUNT(*) total FROM movimientos_inventario WHERE tipo='ANULACION' AND origen_id=?", [multi]))[0][0].total), 0);
  await pool.query("DROP TRIGGER qa_fallo_anulacion");
  const dobles = await Promise.all([1,2].map(() => request(app).post(`/api/ventas/${multi}/anular`).set("Authorization", `Bearer ${admin}`).send({ motivo:"Venta registrada por error" })));
  assert.deepEqual(dobles.map(r => r.status).sort(), [200,409]); pruebas++;
  assert.equal(await stock(loteA), 3); assert.equal(await stock(loteB), 10);
  await api("post", "/api/ventas/2147483647/anular", { motivo:"No existe" }, 404);
  await pool.query("INSERT INTO ventas(usuario_id,total) VALUES(1,20)");
  const sinDetalle = await ultimaVenta();
  await api("post", `/api/ventas/${sinDetalle}/anular`, { motivo:"Registro anterior" }, 409);

  // Un lote que vence después de vender vuelve al stock físico, pero no al vendible.
  await vender(med, 1); const expirada = await ultimaVenta();
  await pool.query("UPDATE lotes SET fecha_vencimiento=DATE_SUB(CURDATE(),INTERVAL 1 DAY) WHERE id=?", [loteA]);
  await api("post", `/api/ventas/${expirada}/anular`, { motivo:"Prueba de lote vencido" });
  assert.equal(await stock(loteA), 3);
  const inv = await api("get", `/api/reportes/inventario?medicamento_id=${med}`, undefined, 200, regente);
  assert.equal(inv.totales.stock_fisico, 13); assert.equal(inv.totales.stock_disponible, 10);
  assert.equal(inv.registros.find(r => r.lote_id === loteA).stock_disponible, 0);
  const vencidos = await api("get", `/api/reportes/inventario?medicamento_id=${med}&vencimiento=VENCIDO&stock_bajo=1`);
  assert.equal(vencidos.registros.length, 1); assert.equal(vencidos.registros[0].lote_id, loteA);

  // Totales Bs 50 + Bs 30 vigentes; Bs 20 anulado.
  const [repMed] = await pool.query("INSERT INTO medicamentos(nombre_comercial,principio_activo,precio,stock_minimo) VALUES('Reporte prueba','Prueba',10,0)");
  const [repLote] = await pool.query("INSERT INTO lotes(medicamento_id,numero_lote,fecha_ingreso,fecha_vencimiento,cantidad,costo_unitario) VALUES(?,'REPORTE',CURDATE(),?,20,5)", [repMed.insertId, fecha(60)]);
  await vender(repMed.insertId, 5); await vender(repMed.insertId, 3); await vender(repMed.insertId, 2);
  await api("post", `/api/ventas/${await ultimaVenta()}/anular`, { motivo:"Error del operador" });
  const reporte = await api("get", `/api/reportes/ventas?medicamento_id=${repMed.insertId}&per_page=1`);
  assert.equal(reporte.totales.total_vigente, "80.00"); assert.equal(reporte.totales.total_anulado, "20.00");
  assert.equal(reporte.registros.length, 1); assert.equal(reporte.paginacion.totalRows, 3);
  // Un cambio posterior no altera la consulta ni la descarga de su mismo corte.
  await vender(repMed.insertId, 1);
  const pagina2 = await api("get", `/api/reportes/ventas?snapshot=${reporte.snapshot}&page=2&per_page=1`);
  assert.equal(pagina2.totales.total_vigente, "80.00");
  const csv = await request(app).get(`/api/reportes/ventas/exportar?snapshot=${reporte.snapshot}&formato=csv`).set("Authorization", `Bearer ${admin}`);
  assert.equal(csv.status, 200); assert.match(csv.text, /80\.00/); assert.equal(csv.text.trim().split(/\r?\n/).length, 8); pruebas++;
  const pdf = await request(app).get(`/api/reportes/ventas/exportar?snapshot=${reporte.snapshot}&formato=pdf`).set("Authorization", `Bearer ${admin}`);
  assert.equal(pdf.status, 200); assert.equal(pdf.body.subarray(0,4).toString(), "%PDF"); pruebas++;
  await api("get", `/api/reportes/ventas?snapshot=${reporte.snapshot}&medicamento_id=${med}`, undefined, 400);
  await api("get", "/api/reportes/ventas?desde=2026-11-20&hasta=2026-11-01", undefined, 400);
  await api("get", "/api/reportes/ventas", undefined, 403, regente);
  await api("get", "/api/reportes/inventario", undefined, 403, cajero);
  await api("get", "/api/reportes/ventas/exportar?formato=pdf", undefined, 403, regente);
  await api("get", "/api/reportes/inventario/exportar?formato=csv", undefined, 403, cajero);
  const sinResultados = await api("get", "/api/reportes/ventas?medicamento_id=2147483647");
  assert.equal(sinResultados.paginacion.totalRows, 0);
  await assert.rejects(pool.query("UPDATE movimientos_inventario SET cantidad=1 WHERE lote_id=?", [loteA]), /inmutable/);
  await assert.rejects(pool.query("DELETE FROM movimientos_inventario WHERE lote_id=?", [loteA]), /inmutable/);
  const login = await request(app).post("/api/auth/login").send({ usuario:"admin",password:"admin123" });
  assert.equal(login.status, 200); pruebas++;
  console.log(`OK: ${pruebas} comprobaciones de API e integridad sobre MariaDB/MySQL real.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await pool.end();
  if (adminDb) { await adminDb.query(`DROP DATABASE IF EXISTS \`${temporal}\``); await adminDb.end(); }
});
