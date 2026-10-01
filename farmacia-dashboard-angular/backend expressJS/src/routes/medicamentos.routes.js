"use strict";

const express = require("express");
const router = express.Router();
const medicamentosController = require("../controllers/medicamentos.controller");
const { requireLogin, requireRole } = require("../middlewares/auth");

// 1. Funciones de validación
const { body, validationResult } = require('express-validator');

// 2. Middleware para revisar si express-validator detectó errores
const validarCampos = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }
    next();
};

// 3. Arreglo con todas tus reglas de validación (Ítem 2)
const reglasMedicamento = [
    // 1.1. Nombre comercial y principio activo
    body('nombre_comercial')
        .notEmpty().withMessage('El nombre comercial es obligatorio')
        .isLength({ min: 2, max: 150 }).withMessage('Debe tener entre 2 y 150 caracteres')
        .matches(/[a-zA-Z]/).withMessage('Debe contener al menos una letra'),
        
    body('principio_activo')
        .notEmpty().withMessage('El principio activo es obligatorio')
        .isLength({ max: 150 }).withMessage('El principio activo no puede superar los 150 caracteres'),

    // 1.2. Longitudes máximas (según database.sql)
    body('laboratorio')
        .optional({ checkFalsy: true }).isLength({ max: 120 }).withMessage('El laboratorio no puede superar los 120 caracteres'),
    body('presentacion')
        .optional({ checkFalsy: true }).isLength({ max: 120 }).withMessage('La presentación no puede superar los 120 caracteres'),
    body('sintoma')
        .optional({ checkFalsy: true }).isLength({ max: 180 }).withMessage('El síntoma no puede superar los 180 caracteres'),
    body('accion_terapeutica')
        .optional({ checkFalsy: true }).isLength({ max: 180 }).withMessage('La acción terapéutica no puede superar los 180 caracteres'),

    // 1.3. Precio
    body('precio')
        .isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a cero')
        .isDecimal({ force_decimal: false, decimal_digits: '0,2' }).withMessage('El precio admite un máximo de dos decimales'),

    // 1.4. Stock mínimo
    body('stock_minimo')
        .isInt({ min: 0, max: 100000 }).withMessage('El stock mínimo debe ser un número entero entre 0 y 100000'),

    // 1.5. Requiere receta
    body('requiere_receta')
        .isBoolean({ strict: true }).withMessage('El campo requiere receta debe ser un valor booleano estricto (true o false)')
];

// Rutas GET
router.get("/", requireLogin, medicamentosController.listarMedicamentos);
router.get("/:id", requireLogin, medicamentosController.obtenerMedicamento);

// Rutas POST / DELETE
// 4. Inyectamos las reglas y el validador antes del controlador
router.post(
    "/", 
    requireLogin, 
    requireRole("Administrador/Gerente", "Farmacéutico Regente"), 
    reglasMedicamento, 
    validarCampos, 
    medicamentosController.guardarMedicamento
);

router.delete("/:id", requireLogin, requireRole("Administrador/Gerente"), medicamentosController.inactivarMedicamento);

// Opcional: Si luego agregas una ruta PUT para editar se hace esto:
// router.put("/:id", requireLogin, ..., reglasMedicamento, validarCampos, medicamentosController.editarMedicamento);

module.exports = router;