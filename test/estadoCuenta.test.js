const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const config = require('../src/config');
const app = require('../src/app');

const headers = { 'X-API-KEY': 'clave-pruebas', 'Content-Type': 'application/json', Accept: 'application/json' };

// Proveedor falso: guarda la última petición y responde lo que indique cada prueba.
let ultima;
let responder;
const proveedor = http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => { cuerpo += c; });
  req.on('end', () => {
    ultima = { method: req.method, url: req.url, headers: req.headers, body: cuerpo };
    responder(res);
  });
});

let api;
let baseApi;

before(async () => {
  await new Promise((r) => proveedor.listen(0, '127.0.0.1', r));
  const baseProveedor = `http://127.0.0.1:${proveedor.address().port}`;

  config.credicard.clientApiKey = 'clave-pruebas';
  config.credicard.meses = { url: `${baseProveedor}/edcws/info`, apiKey: 'key-meses' };
  config.credicard.movimientos = { url: `${baseProveedor}/edcws/edc`, apiKey: 'key-movs' };
  config.credicard.timeout = 2;

  api = app.listen(0, '127.0.0.1');
  await new Promise((r) => api.on('listening', r));
  baseApi = `http://127.0.0.1:${api.address().port}`;
});

after(() => {
  api.close();
  proveedor.close();
});

beforeEach(() => {
  ultima = null;
  responder = (res) => res.end('{}');
});

function json(res, status, datos) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(datos));
}

async function post(ruta, body, h = headers) {
  const r = await fetch(baseApi + ruta, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}

test('rechaza sin api key', async () => {
  const r = await post('/api/v1/edc/meses', { tarjeta: '4111111111111111' }, { 'Content-Type': 'application/json' });

  assert.equal(r.status, 401);
  assert.equal(r.body.success, false);
  assert.equal(r.body.codigo, 'NO_AUTORIZADO');
});

test('meses envía GET con cuerpo JSON y apikey', async () => {
  responder = (res) => json(res, 200, [{ mes: '09', ano: '2026' }]);

  const r = await post('/api/v1/edc/meses', { tarjeta: '4111111111111111' });

  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { success: true, codigo: '0', mensaje: 'Consulta exitosa.', data: [{ mes: '09', ano: '2026' }] });
  assert.equal(ultima.method, 'GET');
  assert.equal(ultima.url, '/edcws/info');
  assert.equal(ultima.headers.apikey, 'key-meses');
  assert.deepEqual(JSON.parse(ultima.body), { cod1: '4111111111111111' });
});

test('movimientos separa la fecha', async () => {
  responder = (res) => json(res, 200, { movimientos: [] });

  const r = await post('/api/v1/edc/movimientos', { tarjeta: '4111111111111111', fecha: '2026-09-05' });

  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.movimientos, []);
  assert.equal(ultima.url, '/edcws/edc');
  assert.equal(ultima.headers.apikey, 'key-movs');
  assert.deepEqual(JSON.parse(ultima.body), { cod1: '4111111111111111', ano1: '2026', mes1: '09', dia1: '05' });
});

test('msg del proveedor devuelve código 2', async () => {
  responder = (res) => json(res, 200, { msg: 'Tarjeta no existe' });

  const r = await post('/api/v1/edc/meses', { tarjeta: '4111111111111111' });

  assert.equal(r.status, 422);
  assert.equal(r.body.codigo, '2');
  assert.equal(r.body.detalle, 'Tarjeta no existe');
});

test('respuesta no JSON devuelve código 3', async () => {
  responder = (res) => { res.writeHead(500); res.end('<html>error</html>'); };

  const r = await post('/api/v1/edc/meses', { tarjeta: '4111111111111111' });

  assert.equal(r.status, 502);
  assert.equal(r.body.codigo, '3');
  assert.deepEqual(r.body.detalle, { status_proveedor: 500 });
});

test('error de conexión devuelve código 1', async () => {
  const original = config.credicard.meses;
  config.credicard.meses = { url: 'http://127.0.0.1:1/edcws/info', apiKey: 'key-meses' };

  try {
    const r = await post('/api/v1/edc/meses', { tarjeta: '4111111111111111' });

    assert.equal(r.status, 502);
    assert.equal(r.body.codigo, '1');
  } finally {
    config.credicard.meses = original;
  }
});

test('falta configuración devuelve código 4', async () => {
  const original = config.credicard.movimientos;
  config.credicard.movimientos = { url: '', apiKey: '' };

  try {
    const r = await post('/api/v1/edc/movimientos', { tarjeta: '4111111111111111', fecha: '2026-09-05' });

    assert.equal(r.status, 500);
    assert.equal(r.body.codigo, '4');
  } finally {
    config.credicard.movimientos = original;
  }
});

test('valida tarjeta y fecha', async () => {
  const r = await post('/api/v1/edc/movimientos', { tarjeta: '41AB', fecha: '30/09/2026' });

  assert.equal(r.status, 422);
  assert.equal(r.body.codigo, 'VALIDACION');
  assert.ok(r.body.errores.tarjeta);
  assert.ok(r.body.errores.fecha);
  assert.equal(ultima, null);
});

test('rechaza fechas que no existen', async () => {
  const r = await post('/api/v1/edc/movimientos', { tarjeta: '4111111111111111', fecha: '2026-02-30' });

  assert.equal(r.status, 422);
  assert.ok(r.body.errores.fecha);
});
