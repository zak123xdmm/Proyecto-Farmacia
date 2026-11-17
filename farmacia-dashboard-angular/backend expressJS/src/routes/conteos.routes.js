"use strict";
const router = require("express").Router();
const { requireLogin, requireRole } = require("../middlewares/auth");
const control = require("../controllers/control-operativo.controller");

router.use(requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"));
router.get("/", control.listarConteos);
router.post("/", control.iniciarConteo);
router.patch("/:id", control.registrarConteo);
router.post("/:id/confirmar", requireRole("Administrador/Gerente"), control.confirmarConteo);
module.exports = router;
