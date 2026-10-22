const crypto = require('node:crypto');
const config = require('../config');

/**
 * Protege la API EDC: el cliente (Postman u otro aplicativo) debe enviar el header
 * X-API-KEY con el valor de API_EDC_CLIENT_KEY definido en el .env.
 */
function validarApiKeyCliente(req, res, next) {
  const esperada = config.credicard.clientApiKey;

  if (esperada && !compararSeguro(String(esperada), String(req.get('X-API-KEY') ?? ''))) {
    return res.status(401).json({
      success: false,
      codigo: 'NO_AUTORIZADO',
      mensaje: 'X-API-KEY inválida o ausente.',
    });
  }

  return next();
}

/** Equivalente a hash_equals() de PHP (comparación en tiempo constante). */
function compararSeguro(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = validarApiKeyCliente;
