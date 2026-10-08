"use strict";

const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();
const categoriasController = require("../controllers/categorias.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

// Middleware local para atrapar errores de validación
const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ ok: false, errores: errores.array() });
  }
  next();
};

router.use(requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"));

router.get("/", categoriasController.listarCategorias);

router.post(
  "/",
  [
    check("nombre", "El nombre debe tener entre 3 y 100 caracteres.")
      .trim()
      .isLength({ min: 3, max: 100 }),
    check("nombre", "El nombre contiene símbolos no permitidos.")
      .matches(/^[a-zA-Z0-9 áéíóúÁÉÍÓÚñÑüÜ\-.,()]+$/),
    validarCampos
  ],
  categoriasController.crearCategoria
);

router.delete("/:id", categoriasController.eliminarCategoria);

module.exports = router;