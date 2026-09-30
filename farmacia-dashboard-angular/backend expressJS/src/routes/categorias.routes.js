"use strict";

const express = require("express");
const router = express.Router();
const categoriasController = require("../controllers/categorias.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

router.use(requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"));

router.get("/", categoriasController.listarCategorias);
router.post("/", categoriasController.crearCategoria);
router.delete("/:id", categoriasController.eliminarCategoria);

module.exports = router;