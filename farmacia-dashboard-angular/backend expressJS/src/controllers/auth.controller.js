"use strict";

const { pool } = require("../config/database");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { jwtSecret } = require("../config/env");

function b64url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const login = async (req, res, next) => {
  try {
    const usuario = (req.body.usuario || "").trim();
    const password = req.body.password || "";

    const [rows] = await pool.query(
      "SELECT u.id, u.nombre, u.usuario, u.password, u.activo, r.nombre rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.usuario=? AND u.activo=1 LIMIT 1",
      [usuario],
    );
    const u = rows[0];

    if (!u || !bcrypt.compareSync(password, u.password)) {
      return res
        .status(401)
        .json({ ok: false, mensaje: "Credenciales incorrectas" });
    }

    const header = b64url(JSON.stringify({ typ: "JWT", alg: "HS256" }));
    const payload = b64url(
      JSON.stringify({
        sub: parseInt(u.id),
        usuario: u.usuario,
        rol: u.rol,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 28800,
      }),
    );

    const sig = crypto
      .createHmac("sha256", jwtSecret)
      .update(`${header}.${payload}`)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    res.json({
      ok: true,
      token: `${header}.${payload}.${sig}`,
      usuario: { id: parseInt(u.id), nombre: u.nombre, rol: u.rol },
    });
  } catch (error) {
    next(error);
  }
};

const me = (req, res) => {
  res.json({ ok: true, usuario: req.user });
};

module.exports = { login, me };
