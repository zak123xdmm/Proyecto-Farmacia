const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/database");

// Simulamos la base de datos para no tocar MySQL
jest.mock("../src/config/database", () => ({
  pool: {
    query: jest.fn()
  }
}));

// Simulamos los middlewares de autenticación para que no pidan token
jest.mock("../src/middlewares/auth", () => ({
  requireLogin: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next()
}));

describe("Ítem 5: Pruebas de Categorías", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("1. Un nombre vacío o de solo espacios no crea la categoría", async () => {
    const res = await request(app)
      .post("/api/categorias")
      .send({ nombre: "   " });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.errores[0].msg).toMatch(/El nombre debe tener entre 3 y 100 caracteres/);
  });

  it("2. No se puede crear una subcategoría dentro de otra subcategoría", async () => {
    // Simulamos que la BD responde que la categoría padre ya tiene otro padre (nivel 3)
    pool.query.mockResolvedValueOnce([[{ id: 1, parent_id: 2 }]]);

    const res = await request(app)
      .post("/api/categorias")
      .send({ nombre: "Sub-subcategoría", parent_id: 1 });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.mensaje).toMatch(/máximo 2 niveles/);
  });

  it("3. Al intentar eliminar una categoría con medicamentos, muestra el motivo", async () => {
    // Simulamos las respuestas de la BD en orden: 1. Existe, 2. Cero subcategorías, 3. Tiene 5 medicamentos
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]); 
    pool.query.mockResolvedValueOnce([[{ count: 0 }]]); 
    pool.query.mockResolvedValueOnce([[{ count: 5 }]]); 

    const res = await request(app).delete("/api/categorias/1");
    
    expect(res.statusCode).toBe(400);
    expect(res.body.mensaje).toMatch(/tiene medicamentos asociados/);
  });
});