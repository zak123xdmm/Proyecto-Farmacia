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
    const nombre = (req.body.nombre || "").trim();
    const parent = req.body.parent_id || null;

    let chkQuery = "SELECT COUNT(*) as count FROM categorias WHERE nombre=? AND ";
    let chkParams = [nombre];
    if (parent === null) {
      chkQuery += "parent_id IS NULL";
    } else {
      chkQuery += "parent_id=?";
      chkParams.push(parent);
    }

    const [chk] = await pool.query(chkQuery, chkParams);
    if (chk[0].count > 0) {
      return res.status(400).json({ ok: false, mensaje: "Ya existe una categoría con ese nombre en el mismo nivel." });
    }

    await pool.query("INSERT INTO categorias(nombre, parent_id) VALUES(?, ?)", [nombre, parent]);
    res.json({ ok: true, mensaje: "Categoría creada." });
  } catch (error) {
    res.status(400).json({ ok: false, mensaje: "No se pudo crear la categoría." });
  }
};

const eliminarCategoria = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    const [hijos] = await pool.query("SELECT COUNT(*) as count FROM categorias WHERE parent_id=?", [id]);
    const [meds] = await pool.query("SELECT COUNT(*) as count FROM medicamentos WHERE categoria_id=? AND activo=1", [id]);
    
    if (hijos[0].count > 0 || meds[0].count > 0) {
      return res.status(400).json({ ok: false, mensaje: "No se puede eliminar: tiene medicamentos o subcategorías asociadas." });
    }

    await pool.query("DELETE FROM categorias WHERE id=?", [id]);
    res.json({ ok: true, mensaje: "Categoría eliminada." });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarCategorias, crearCategoria, eliminarCategoria };