"use strict";

const express = require("express");
const router = express.Router();
const reportesController = require("../controllers/reportes.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

router.use(requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"));

router.get("/", reportesController.obtenerReportes);
const operativos = require("../controllers/reportes-operativos.controller");
router.get("/opciones", operativos.opciones);
router.get("/ventas", requireRole("Administrador/Gerente"), operativos.ventas);
router.get("/ventas/exportar", requireRole("Administrador/Gerente"), operativos.exportarVentas);
router.get("/inventario", operativos.inventario);
router.get("/inventario/exportar", operativos.exportarInventario);

module.exports = router;