"use strict";

const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const usuariosRoutes = require("./usuarios.routes");
const categoriasRoutes = require("./categorias.routes");
const medicamentosRoutes = require("./medicamentos.routes");
const lotesRoutes = require("./lotes.routes");
const ventasRoutes = require("./ventas.routes");
const reportesRoutes = require("./reportes.routes");
const catalogoRoutes = require("./catalogo.routes");

router.use("/auth", authRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/categorias", categoriasRoutes);
router.use("/medicamentos", medicamentosRoutes);
router.use("/lotes", lotesRoutes);
router.use("/ventas", ventasRoutes);
router.use("/reportes", reportesRoutes);
router.use("/catalogo", catalogoRoutes);

module.exports = router;