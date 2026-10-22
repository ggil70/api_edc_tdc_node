const credicard = require('../services/credicardService');

const MENSAJES = {
  'tarjeta.required': 'El número de tarjeta es obligatorio.',
  'tarjeta.formato': 'La tarjeta debe contener solo dígitos (entre 13 y 19).',
  'fecha.required': 'La fecha es obligatoria.',
  'fecha.date_format': 'La fecha debe tener el formato AAAA-MM-DD (ej. 2026-09-30).',
};

/**
 * POST /api/v1/edc/meses
 * Body: { "tarjeta": "4111111111111111" }
 */
async function meses(req, res) {
  const entrada = limpiar(req.body, ['tarjeta']);
  const errores = validar(entrada, { tarjeta: true });

  if (errores) {
    return errorValidacion(res, errores);
  }

  return ok(res, await credicard.obtenerMeses(entrada.tarjeta));
}

/**
 * POST /api/v1/edc/movimientos
 * Body: { "tarjeta": "4111111111111111", "fecha": "2026-09-30" }
 */
async function movimientos(req, res) {
  const entrada = limpiar(req.body, ['tarjeta', 'fecha']);
  const errores = validar(entrada, { tarjeta: true, fecha: true });

  if (errores) {
    return errorValidacion(res, errores);
  }

  return ok(res, await credicard.obtenerMovimientos(entrada.tarjeta, entrada.fecha));
}

/**
 * Equivalente a los middlewares TrimStrings + ConvertEmptyStringsToNull de Laravel.
 */
function limpiar(body, campos) {
  const entrada = {};
  for (const campo of campos) {
    let valor = body ? body[campo] : undefined;
    if (typeof valor === 'string') {
      valor = valor.trim();
      if (valor === '') valor = null;
    }
    entrada[campo] = valor;
  }
  return entrada;
}

/**
 * Reglas del controlador Laravel:
 *   tarjeta: required|string|regex:/^\d{13,19}$/
 *   fecha:   required|date_format:Y-m-d
 * Devuelve null si todo es válido, o { campo: [mensajes] } (mismo formato de Laravel).
 */
function validar(entrada, reglas) {
  const errores = {};

  if (reglas.tarjeta) {
    if (entrada.tarjeta === undefined || entrada.tarjeta === null) {
      errores.tarjeta = [MENSAJES['tarjeta.required']];
    } else if (typeof entrada.tarjeta !== 'string' || !/^\d{13,19}$/.test(entrada.tarjeta)) {
      errores.tarjeta = [MENSAJES['tarjeta.formato']];
    }
  }

  if (reglas.fecha) {
    if (entrada.fecha === undefined || entrada.fecha === null) {
      errores.fecha = [MENSAJES['fecha.required']];
    } else if (!fechaValida(entrada.fecha)) {
      errores.fecha = [MENSAJES['fecha.date_format']];
    }
  }

  return Object.keys(errores).length ? errores : null;
}

/** AAAA-MM-DD y que la fecha exista en el calendario (ej. 2026-02-30 no es válida). */
function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));

  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function ok(res, data) {
  return res.json({
    success: true,
    codigo: '0',
    mensaje: 'Consulta exitosa.',
    data,
  });
}

function errorValidacion(res, errores) {
  return res.status(422).json({
    success: false,
    codigo: 'VALIDACION',
    mensaje: 'Los datos enviados no son válidos.',
    errores,
  });
}

module.exports = { meses, movimientos };
