"use strict";

const { pool } = require("../config/database");
const bcrypt = require("bcryptjs");

const listarUsuarios = async (req, res, next) => {
  try {
    const [roles] = await pool.query("SELECT * FROM roles ORDER BY id");
    const [rows] = await pool.query("SELECT u.*, r.nombre rol FROM usuarios u JOIN roles r ON r.id=u.rol_id ORDER BY u.id DESC");
    res.json({ ok: true, roles, usuarios: rows });
  } catch (error) {
    next(error);
  }
};

const obtenerUsuario = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE id=?", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    res.json({ ok: true, usuario: rows[0] });
  } catch (error) {
    next(error);
  }
};

const guardarUsuario = async (req, res, next) => {
  try {
    const id = parseInt(req.body.id || 0);
    const rol = parseInt(req.body.rol_id);
    const nombre = (req.body.nombre || "").trim();
    const usuario = (req.body.usuario || "").trim();
    const activo = req.body.activo !== undefined && req.body.activo !== false && req.body.activo !== '0' ? 1 : 0;

    if (id) {
      await pool.query("UPDATE usuarios SET nombre=?, rol_id=?, activo=? WHERE id=?", [nombre, rol, activo, id]);
      if (req.body.password) {
        const hash = bcrypt.hashSync(req.body.password, 12); // Costo 12 como en database.sql
        await pool.query("UPDATE usuarios SET password=? WHERE id=?", [hash, id]);
      }
      res.json({ ok: true, mensaje: "Usuario actualizado." });
    } else {
      const hash = bcrypt.hashSync(req.body.password, 12);
      await pool.query("INSERT INTO usuarios(nombre, usuario, password, rol_id) VALUES(?, ?, ?, ?)", [nombre, usuario, hash, rol]);
      res.json({ ok: true, mensaje: "Usuario creado." });
    }
  } catch (error) {
    res.status(400).json({ ok: false, mensaje: "No se pudo guardar: usuario duplicado o datos inválidos." });
  }
};

const toggleUsuario = async (req, res, next) => {
  try {
    await pool.query("UPDATE usuarios SET activo=1-activo WHERE id=?", [parseInt(req.params.id)]);
    res.json({ ok: true, mensaje: "Estado modificado" });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarUsuarios, obtenerUsuario, guardarUsuario, toggleUsuario };