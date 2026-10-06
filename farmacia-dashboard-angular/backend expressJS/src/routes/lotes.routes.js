"use strict";

const express = require("express");
const router = express.Router();
const lotesController = require("../controllers/lotes.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");
const { body, validationResult } = require("express-validator");

const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ ok: false, mensaje: errores.array()[0].msg });
  }
  next();
};

router.use(requireLogin, requireRole("Administrador/Gerente", "Farmacéutico Regente"));

router.get("/", lotesController.listarLotes);
router.get("/movimientos", lotesController.listarMovimientos);

router.post("/ingreso", [
  body("medicamento_id").isInt({ min: 1 }).withMessage("Debe seleccionar un medicamento."),
  body("numero_lote")
    .isLength({ min: 3, max: 80 }).withMessage("El lote debe tener entre 3 y 80 caracteres.")
    .matches(/^\S+$/).withMessage("El número de lote no puede contener espacios."),
  body("fecha_ingreso").isISO8601().withMessage("Fecha de ingreso requerida.")
    .custom(value => {
      // Ajustamos a solo la fecha (YYYY-MM-DD) para comparar correctamente
      const hoy = new Date().toISOString().split('T')[0];
      if (value > hoy) throw new Error("La fecha de ingreso no puede ser futura.");
      return true;
    }),
  body("fecha_vencimiento").isISO8601().withMessage("Fecha de vencimiento requerida.")
    .custom((value, { req }) => {
      const hoy = new Date().toISOString().split('T')[0];
      if (value <= hoy) throw new Error("No se pueden registrar lotes ya vencidos.");
      if (value <= req.body.fecha_ingreso) throw new Error("El vencimiento debe ser posterior al ingreso.");
      return true;
    }),
  body("cantidad").isInt({ min: 1, max: 100000 }).withMessage("La cantidad debe ser un entero entre 1 y 100,000."),
  body("costo_unitario").isFloat({ min: 0 }).withMessage("El costo unitario no puede ser negativo."),
  validarCampos
], lotesController.ingresarLote);

router.post("/devolucion", [
  body("lote_id").isInt({ min: 1 }).withMessage("Lote inválido."),
  body("cantidad_devolucion").isInt({ min: 1 }).withMessage("La cantidad debe ser un entero positivo."),
  body("referencia").optional({ checkFalsy: true }).isLength({ max: 60 }).withMessage("La referencia no debe superar 60 caracteres."),
  validarCampos
], lotesController.devolverLote);

module.exports = router;