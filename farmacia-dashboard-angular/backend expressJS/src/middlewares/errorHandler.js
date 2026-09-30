"use strict";

const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.status || 500;
  const mensaje = err.expose ? err.message : "Error interno del servidor";

  res.status(statusCode).json({
    ok: false,
    mensaje: mensaje
  });
};

module.exports = errorHandler;
