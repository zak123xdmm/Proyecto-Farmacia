"use strict";

const express = require("express");
const router = express.Router();
const ventasController = require("../controllers/ventas.controller");
const { requireLogin } = require("../middlewares/auth");

router.use(requireLogin);

router.get("/datos", ventasController.obtenerDatosVenta);
router.post("/", ventasController.registrarVenta);

module.exports = router;