"use strict";

const crypto = require("crypto");

const { jwtSecret } = require("../config/env");

function base64urlDecode(str) {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) {
    padded += "=";
  }
  return Buffer.from(padded, "base64").toString("utf-8");
}

const requireLogin = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/Bearer\s+(.+)/i);

  if (!match) {
    return res.status(401).json({ ok: false, mensaje: "Token requerido" });
  }

  const token = match[1];
  const parts = token.split(".");

  if (parts.length !== 3) {
    return res.status(401).json({ ok: false, mensaje: "Token inválido" });
  }

  const expectedSig = crypto
    .createHmac("sha256", jwtSecret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // Convertir a base64url

  if (expectedSig !== parts[2]) {
    return res.status(401).json({ ok: false, mensaje: "Firma inválida" });
  }

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(parts[1]));
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: "Token corrupto" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload || (payload.exp || 0) < now) {
    return res.status(401).json({ ok: false, mensaje: "Token expirado" });
  }

  req.user = payload;
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res
        .status(403)
        .json({ ok: false, mensaje: "Acceso denegado para este rol." });
    }
    next();
  };
};

const currentUser = (req) => req.user || null;

const hasRole = (req, roles) => req.user && roles.includes(req.user.rol);

module.exports = {
  requireLogin,
  requireRole,
  currentUser,
  hasRole,
};
