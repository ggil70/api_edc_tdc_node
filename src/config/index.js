/*
|--------------------------------------------------------------------------
| Configuración de la aplicación
|--------------------------------------------------------------------------
| Equivalente a config/app.php + config/credicard.php del proyecto Laravel.
| Los valores reales se definen en el archivo .env del servidor.
*/

function bool(valor, porDefecto) {
  if (valor === undefined || valor === '') return porDefecto;
  return ['1', 'true', 'on', 'yes'].includes(String(valor).trim().toLowerCase());
}

function int(valor, porDefecto) {
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? porDefecto : n;
}

module.exports = {
  port: int(process.env.PORT, 8000),
  debug: bool(process.env.APP_DEBUG, false),
  trustProxy: int(process.env.TRUST_PROXY, 0),
  rateLimitPorMinuto: int(process.env.RATE_LIMIT_PER_MINUTE, 60),

  credicard: {
    // Credicard_Api_Consultar_meses / Credicard_Api_Key_header_Consultar_meses
    meses: {
      url: process.env.CREDICARD_API_CONSULTAR_MESES,
      apiKey: process.env.CREDICARD_API_KEY_CONSULTAR_MESES,
    },

    // Credicard_Api_Movimientos / Credicard_Api_Key_header_Movimientos
    movimientos: {
      url: process.env.CREDICARD_API_MOVIMIENTOS,
      apiKey: process.env.CREDICARD_API_KEY_MOVIMIENTOS,
    },

    // Segundos máximos de espera de la respuesta del proveedor.
    timeout: int(process.env.CREDICARD_TIMEOUT, 30),

    // Equivalente al "curl -k": false = no validar el certificado SSL del proveedor.
    verificarSsl: bool(process.env.CREDICARD_VERIFY_SSL, false),

    // Llave que deben enviar Postman / otros aplicativos en el header X-API-KEY
    // para consumir esta API. Si se deja vacía, la API queda abierta (no recomendado).
    clientApiKey: process.env.API_EDC_CLIENT_KEY,
  },
};
