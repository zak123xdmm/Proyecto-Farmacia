"use strict";

const express = require("express");
const router = express.Router();
const medicamentosController = require("../controllers/medicamentos.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

router.get("/", requireLogin, medicamentosController.listarMedicamentos); // medicamentos.php (filtrado)
router.get("/:id", requireLogin, medicamentosController.obtenerMedicamento); // medicamento.php?id=... (detalle)

router.post("/", requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"), medicamentosController.guardarMedicamento);
router.delete("/:id", requireLogin, requireRole("Administrador/Gerente"), medicamentosController.inactivarMedicamento);

module.exports = router;