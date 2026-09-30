"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

// Angular dev server (4200) y frontend local/producción.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = ["http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:3000", "http://127.0.0.1:3000"];
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

// Si Angular está construido, Express puede servirlo sin necesitar otro servidor.
const angularDist = path.join(__dirname, "../../frontend-angular/dist/farmacia-dashboard/browser");
if (fs.existsSync(angularDist)) {
  app.use(express.static(angularDist));
  app.get(/^(?!\/api(?:\/|$)).*$/, (req, res, next) => {
    const index = path.join(angularDist, "index.html");
    if (fs.existsSync(index)) return res.sendFile(index);
    next();
  });
}

app.use(errorHandler);

module.exports = app;
