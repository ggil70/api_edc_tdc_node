const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');
const CredicardException = require('./errors/CredicardException');
const apiRoutes = require('./routes/api');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Equivalente a config/cors.php (paths api/*, cualquier origen) y throttle:api.
app.use('/api',
  cors(),
  rateLimit({
    windowMs: 60 * 1000,
    limit: config.rateLimitPorMinuto,
    standardHeaders: false,
    legacyHeaders: true,
    message: { message: 'Too Many Attempts.' },
  }),
  apiRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, codigo: 'NO_ENCONTRADO', mensaje: 'Ruta no encontrada.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof CredicardException) {
    return err.render(res);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      codigo: 'JSON_INVALIDO',
      mensaje: 'El cuerpo de la petición no es un JSON válido.',
    });
  }

  logger.error('Error no controlado', { error: err.message, stack: err.stack });

  return res.status(err.status || 500).json({
    success: false,
    codigo: 'ERROR_INTERNO',
    mensaje: 'Error interno del servidor.',
    ...(config.debug ? { detalle: err.message } : {}),
  });
});

module.exports = app;
