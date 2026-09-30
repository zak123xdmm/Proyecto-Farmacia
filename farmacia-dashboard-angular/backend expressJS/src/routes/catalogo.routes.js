"use strict";

const express = require("express");
const router = express.Router();
const catalogoController = require("../controllers/catalogo.controller");

router.get("/", catalogoController.listarCatalogo);

module.exports = router;