const crypto = require("crypto");
const request = require("supertest");
jest.mock("../src/config/database", () => ({ pool: { query: jest.fn(), getConnection: jest.fn() } }));
const app = require("../src/app");
const { pool } = require("../src/config/database");
const { jwtSecret } = require("../src/config/env");
const { fechas } = require("../src/services/control-operativo.service");

function token(rol) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: 1, rol, exp: Math.floor(Date.now() / 1000) + 60 })).toString("base64url");
  const firma = crypto.createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `Bearer ${header}.${payload}.${firma}`;
}
const admin = token("Administrador/Gerente");
const regente = token("Farmacéutico Regente");
const cajero = token("Cajero/Dependiente");

describe("Iteración 3: validaciones y permisos en la API", () => {
  let errores;
  beforeAll(() => { errores = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterAll(() => errores.mockRestore());
  afterEach(() => jest.clearAllMocks());
  test("el historial requiere sesión", async () => {
    expect((await request(app).get("/api/medicamentos/1/movimientos")).status).toBe(401);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test.each(["-1", "2.5", "abc", "0"])("no inicia un conteo con lote inválido %s", async lote_id => {
    const r = await request(app).post("/api/conteos").set("Authorization", admin).send({ lote_id });
    expect(r.status).toBe(400); expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test.each([-1, 1.5, "abc", true, null, {}, []])("rechaza cantidades físicas inválidas %j", async cantidad_fisica => {
    const r = await request(app).patch("/api/conteos/1").set("Authorization", regente).send({ cantidad_fisica, motivo: "Diferencia" });
    expect(r.status).toBe(400); expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test.each([regente, cajero])("solo el administrador confirma conteos o anula ventas", async auth => {
    expect((await request(app).post("/api/conteos/1/confirmar").set("Authorization", auth).send({ revision:1 })).status).toBe(403);
    expect((await request(app).post("/api/ventas/1/anular").set("Authorization", auth).send({ motivo:"Error" })).status).toBe(403);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test("el cajero no registra conteos ni consulta reportes", async () => {
    expect((await request(app).post("/api/conteos").set("Authorization", cajero).send({ lote_id:1 })).status).toBe(403);
    for (const ruta of ["/api/reportes/ventas", "/api/reportes/inventario", "/api/reportes/ventas/exportar?formato=csv", "/api/reportes/inventario/exportar?formato=pdf"]) {
      expect((await request(app).get(ruta).set("Authorization", cajero)).status).toBe(403);
    }
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test("el regente no consulta ni exporta ventas", async () => {
    for (const ruta of ["/api/reportes/ventas", "/api/reportes/ventas/exportar?formato=csv"]) {
      expect((await request(app).get(ruta).set("Authorization", regente)).status).toBe(403);
    }
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test("la anulación sin motivo no inicia una transacción", async () => {
    const r = await request(app).post("/api/ventas/1/anular").set("Authorization", admin).send({ motivo:"  " });
    expect(r.status).toBe(400); expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test("rechaza periodos invertidos o fechas inexistentes antes de consultar", async () => {
    for (const query of ["desde=2026-11-12&hasta=2026-11-01", "desde=2026-02-30", "hasta=texto"]) {
      expect((await request(app).get(`/api/reportes/ventas?${query}`).set("Authorization", admin)).status).toBe(400);
      expect((await request(app).get(`/api/medicamentos/1/movimientos?${query}`).set("Authorization", cajero)).status).toBe(400);
    }
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
  test("admite un periodo válido con día bisiesto", () => {
    expect(fechas({ desde:"2024-02-29", hasta:"2024-02-29" })).toEqual({ desde:"2024-02-29", hasta:"2024-02-29" });
  });
});
