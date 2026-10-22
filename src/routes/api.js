const express = require('express');
const validarApiKeyCliente = require('../middleware/validarApiKeyCliente');
const estadoCuenta = require('../controllers/estadoCuentaController');

const router = express.Router();

/** Pasa al manejador de errores las excepciones de los controladores async (Express 4). */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/*
|--------------------------------------------------------------------------
| API Estado de Cuenta Tarjeta de Crédito (Credicard)
|--------------------------------------------------------------------------
| Prefijo: /api (se monta en app.js junto con el límite de peticiones).
| Se usa POST para que el número de tarjeta viaje en el cuerpo y no en la URL
| (las URLs quedan registradas en logs de servidores y proxies).
*/
const edc = express.Router();
edc.use(validarApiKeyCliente);
edc.post('/meses', asincrono(estadoCuenta.meses));
edc.post('/movimientos', asincrono(estadoCuenta.movimientos));

router.use('/v1/edc', edc);

module.exports = router;
