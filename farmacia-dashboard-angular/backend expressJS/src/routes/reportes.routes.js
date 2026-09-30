"use strict";

const express = require("express");
const router = express.Router();
const reportesController = require("../controllers/reportes.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

router.use(requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"));

router.get("/", reportesController.obtenerReportes);

module.exports = router;