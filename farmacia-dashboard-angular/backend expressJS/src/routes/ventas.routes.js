"use strict";

const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/ventas.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");
const control = require("../controllers/control-operativo.controller");

router.use(requireLogin);

router.get("/datos", ventasController.obtenerDatosVenta);
router.post("/", ventasController.registrarVenta);
router.get("/:id", requireRole("Administrador/Gerente"), control.detalleVenta);
router.post("/:id/anular", requireRole("Administrador/Gerente"), control.anularVenta);

module.exports = router;