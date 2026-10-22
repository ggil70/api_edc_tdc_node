const http = require('node:http');
const https = require('node:https');
const config = require('../config');
const logger = require('../utils/logger');
const CredicardException = require('../errors/CredicardException');

/**
 * Cliente del proveedor Credicard (estado de cuenta de tarjeta de crédito).
 *
 * Reemplaza las funciones obtener_meses_credicard() y obtener_movimientos_credicard()
 * que ejecutaban "curl -k -X GET -H apikey ... -d @archivo.json".
 * El proveedor espera GET con el JSON en el cuerpo; fetch() no permite cuerpo en GET,
 * por eso se usa directamente el módulo http/https de Node.
 */

/**
 * Obtiene los meses disponibles del estado de cuenta de una tarjeta.
 * (antes: obtener_meses_credicard($tarjeta))
 */
function obtenerMeses(tarjeta) {
  return llamar('meses', {
    cod1: tarjeta,
  });
}

/**
 * Obtiene los movimientos del estado de cuenta de una tarjeta para una fecha (AAAA-MM-DD).
 * (antes: obtener_movimientos_credicard($tarjeta, $fecha))
 */
function obtenerMovimientos(tarjeta, fecha) {
  const [anio, mes, dia] = fecha.split('-');

  return llamar('movimientos', {
    cod1: tarjeta,
    ano1: anio,
    mes1: mes,
    dia1: dia,
  });
}

async function llamar(servicio, payload) {
  const { url, apiKey } = config.credicard[servicio];

  if (!url || !apiKey) {
    throw CredicardException.configuracion(servicio);
  }

  let respuesta;
  try {
    respuesta = await enviarGetConCuerpo(url, apiKey, JSON.stringify(payload));
  } catch (e) {
    // Antes: return "1"; // Error en ejecución de cURL
    logger.error(`Credicard [${servicio}] sin conexión`, {
      tarjeta: enmascarar(payload.cod1),
      error: e.message,
    });

    throw CredicardException.conexion(e.message);
  }

  let resultado = null;
  try {
    resultado = JSON.parse(respuesta.body);
  } catch {
    resultado = null;
  }

  if (resultado === null) {
    logger.error(`Credicard [${servicio}] respuesta no JSON`, {
      tarjeta: enmascarar(payload.cod1),
      status: respuesta.status,
      body: respuesta.body.slice(0, 500),
    });

    throw CredicardException.respuestaInvalida(respuesta.status);
  }

  // Antes: if (isset($resultado['msg']) && !empty($resultado['msg'])) return "2";
  if (typeof resultado === 'object' && !vacioPhp(resultado.msg)) {
    throw CredicardException.proveedor(resultado.msg);
  }

  return resultado;
}

/**
 * GET con cuerpo JSON y header apikey (igual que curl -X GET -d).
 * Resuelve con { status, body }; rechaza solo ante errores de red o timeout.
 */
function enviarGetConCuerpo(url, apiKey, cuerpo) {
  return new Promise((resolve, reject) => {
    const destino = new URL(url);
    const cliente = destino.protocol === 'https:' ? https : http;

    const req = cliente.request(destino, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(cuerpo),
      },
      rejectUnauthorized: config.credicard.verificarSsl,
    }, (res) => {
      const partes = [];
      res.on('data', (parte) => partes.push(parte));
      res.on('end', () => {
        clearTimeout(temporizador);
        resolve({ status: res.statusCode, body: Buffer.concat(partes).toString('utf8') });
      });
      res.on('error', reject);
    });

    // Tiempo máximo total de la petición (como el timeout de Laravel/curl).
    const temporizador = setTimeout(() => {
      req.destroy(new Error(`Tiempo de espera agotado (${config.credicard.timeout} s)`));
    }, config.credicard.timeout * 1000);

    req.on('error', (e) => {
      clearTimeout(temporizador);
      reject(e);
    });

    req.end(cuerpo);
  });
}

/** Equivalente a empty() de PHP. */
function vacioPhp(valor) {
  return valor === undefined || valor === null || valor === false || valor === 0
    || valor === '' || valor === '0'
    || (Array.isArray(valor) && valor.length === 0);
}

function enmascarar(tarjeta) {
  const t = String(tarjeta);
  return '*'.repeat(Math.max(t.length - 4, 0)) + t.slice(-4);
}

module.exports = { obtenerMeses, obtenerMovimientos };
