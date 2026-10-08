"use strict";

const { pool } = require("../config/database");

const listarCategorias = async (req, res, next) => {
  try {
    const [cats] = await pool.query(
      "SELECT c.*, p.nombre padre, (SELECT COUNT(*) FROM medicamentos m WHERE m.categoria_id=c.id AND m.activo=1) meds FROM categorias c LEFT JOIN categorias p ON p.id=c.parent_id ORDER BY COALESCE(c.parent_id,0), c.nombre"
    );
    res.json({ ok: true, categorias: cats });
  } catch (error) {
    next(error);
  }
};

const crearCategoria = async (req, res, next) => {
  try {
    const nombre = req.body.nombre.trim();
    const parent = req.body.parent_id || null;

    // 1. Validar la categoría padre (si se envía una)
    if (parent) {
      const [padreRows] = await pool.query("SELECT * FROM categorias WHERE id = ?", [parent]);
      
      if (padreRows.length === 0) {
        return res.status(400).json({ ok: false, mensaje: "La categoría padre seleccionada no existe." });
      }
      // Verificar si está activa (asumiendo que tienes una columna activo)
      if (padreRows[0].activo !== undefined && padreRows[0].activo === 0) {
        return res.status(400).json({ ok: false, mensaje: "La categoría padre está inactiva." });
      }
      // Bloquear subcategorías de tercer nivel (el padre NO debe tener un padre)
      if (padreRows[0].parent_id !== null) {
        return res.status(400).json({ ok: false, mensaje: "No se puede crear una subcategoría dentro de otra subcategoría (máximo 2 niveles)." });
      }
    }

    // 2. Validar duplicados en el mismo nivel (ignorando mayúsculas)
    let chkQuery = "SELECT COUNT(*) as count FROM categorias WHERE LOWER(nombre) = LOWER(?) AND ";
    let chkParams = [nombre];
    if (parent === null) {
      chkQuery += "parent_id IS NULL";
    } else {
      chkQuery += "parent_id = ?";
      chkParams.push(parent);
    }

    const [chk] = await pool.query(chkQuery, chkParams);
    if (chk[0].count > 0) {
      return res.status(409).json({ ok: false, mensaje: "Ya existe una categoría con ese nombre en este nivel." });
    }

    // 3. Insertar
    await pool.query("INSERT INTO categorias(nombre, parent_id) VALUES(?, ?)", [nombre, parent]);
    res.json({ ok: true, mensaje: "Categoría creada exitosamente." });
  } catch (error) {
    next(error);
  }
};

const eliminarCategoria = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    // 1. Validar si existe (Error 404)
    const [exist] = await pool.query("SELECT id FROM categorias WHERE id = ?", [id]);
    if (exist.length === 0) {
      return res.status(404).json({ ok: false, mensaje: "La categoría no existe o ya fue eliminada." });
    }
    
    // 2. Validar que no tenga subcategorías
    const [hijos] = await pool.query("SELECT COUNT(*) as count FROM categorias WHERE parent_id=?", [id]);
    if (hijos[0].count > 0) {
      return res.status(400).json({ ok: false, mensaje: "No se puede eliminar: tiene subcategorías asociadas." });
    }

    // 3. Validar que no tenga medicamentos
    const [meds] = await pool.query("SELECT COUNT(*) as count FROM medicamentos WHERE categoria_id=? AND activo=1", [id]);
    if (meds[0].count > 0) {
      return res.status(400).json({ ok: false, mensaje: "No se puede eliminar: tiene medicamentos asociados." });
    }

    // 4. Eliminar
    await pool.query("DELETE FROM categorias WHERE id=?", [id]);
    res.json({ ok: true, mensaje: "Categoría eliminada correctamente." });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarCategorias, crearCategoria, eliminarCategoria };