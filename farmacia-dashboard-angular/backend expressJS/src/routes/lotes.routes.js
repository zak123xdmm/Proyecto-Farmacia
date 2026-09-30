"use strict";

const express = require("express");
const router = express.Router();
const lotesController = require("../controllers/lotes.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

router.use(requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"));

router.get("/", lotesController.listarLotes);
router.get("/movimientos", lotesController.listarMovimientos);
router.post("/ingreso", lotesController.ingresarLote);
router.post("/devolucion", lotesController.devolverLote);

module.exports = router;