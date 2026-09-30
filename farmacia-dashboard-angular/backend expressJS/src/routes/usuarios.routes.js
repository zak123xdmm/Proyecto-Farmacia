"use strict";

const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuarios.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

router.use(requireLogin, requireRole("Administrador/Gerente"));

router.get("/", usuariosController.listarUsuarios);
router.get("/:id", usuariosController.obtenerUsuario);
router.post("/", usuariosController.guardarUsuario);
router.patch("/:id/toggle", usuariosController.toggleUsuario);

module.exports = router;