"use strict";

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { requireLogin } = require("../middlewares/auth");

router.post("/login", authController.login);

router.get("/me", requireLogin, authController.me);

module.exports = router;