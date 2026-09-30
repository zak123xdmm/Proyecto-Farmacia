"use strict";

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "alerts.config.env") });

const env = {
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    name: process.env.DB_NAME || "farmacia_sistema",
    user: process.env.DB_USER || "root",
    pass: process.env.DB_PASS ?? "",
    charset: process.env.DB_CHARSET || "utf8mb4",
  },
  alerts: {
    emails: (process.env.ALERT_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  },
  jwtSecret: process.env.JWT_SECRET || '7f8c2e4a8b1d3c5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
};

module.exports = env;