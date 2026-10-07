"use strict";

const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuarios.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");
const { body, validationResult } = require("express-validator");

// Middleware para atrapar los errores de validación y responder 400
const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ 
      ok: false, 
      mensaje: errores.array()[0].msg,
      errores: errores.array() 
    });
  }
  next();
};

router.use(requireLogin, requireRole("Administrador/Gerente"));

router.get("/", usuariosController.listarUsuarios);
router.get("/:id", usuariosController.obtenerUsuario);

router.post("/", [
  body("nombre")
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage("El nombre solo debe contener letras."),
  body("usuario")
    .isLength({ min: 4, max: 30 }).withMessage("El usuario debe tener entre 4 y 30 caracteres.")
    .matches(/^[a-z]+$/).withMessage("El usuario solo debe contener minúsculas y sin espacios."),
  body("rol_id")
    .isNumeric().withMessage("Debe seleccionar un rol válido."),
  body("password").custom((value, { req }) => {
    if (!req.body.id && !value) {
      throw new Error("La contraseña es obligatoria para un usuario nuevo.");
    }
    if (value) {
      if (value.length < 8 || value.length > 72) {
        throw new Error("La contraseña debe tener entre 8 y 72 caracteres.");
      }
      if (!/^(?=.*[A-Za-z])(?=.*\d).*$/.test(value)) {
        throw new Error("La contraseña debe combinar letras y números.");
      }
    }
    return true;
  }),
  validarCampos
], usuariosController.guardarUsuario);

router.patch("/:id/toggle", usuariosController.toggleUsuario);

module.exports = router;