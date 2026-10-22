# API Estado de Cuenta TDC – Credicard (Node.js)

Migración a Node.js (Express) de la API Laravel 8 de `api_edc_tdc-main`.
Mismos endpoints, mismos cuerpos de petición y mismas respuestas JSON, para que
los aplicativos que la consumen no tengan que cambiar.

Requiere Node.js 18 o superior.

## Endpoints

Todos requieren el header `X-API-KEY` (valor de `API_EDC_CLIENT_KEY` en `.env`).

| Método | Ruta | Body JSON |
|---|---|---|
| POST | `/api/v1/edc/meses` | `{"tarjeta":"4111111111111111"}` |
| POST | `/api/v1/edc/movimientos` | `{"tarjeta":"4111111111111111","fecha":"2026-09-30"}` |

Hacia el proveedor se llama con **GET + cuerpo JSON + header `apikey`**, igual que el `curl` original.

| HTTP | `codigo` | Significado |
|---|---|---|
| 200 | `0` | Éxito. Respuesta del proveedor en `data`. |
| 422 | `2` | El proveedor devolvió `msg` (en `detalle`). |
| 502 | `1` | Sin conexión con el proveedor (el detalle solo se muestra con `APP_DEBUG=true`). |
| 502 | `3` | El proveedor respondió algo que no es JSON. |
| 500 | `4` | Falta URL o apikey del proveedor en `.env`. |
| 422 | `VALIDACION` | Tarjeta (13-19 dígitos) o fecha (`AAAA-MM-DD`) inválidas. Detalle en `errores`. |
| 401 | `NO_AUTORIZADO` | Falta o es incorrecto `X-API-KEY`. |
| 400 | `JSON_INVALIDO` | El cuerpo enviado no es un JSON válido. |
| 404 | `NO_ENCONTRADO` | Ruta inexistente. |
| 429 | – | Más de `RATE_LIMIT_PER_MINUTE` peticiones por minuto desde la misma IP. |

## Instalación

```bash
npm install --omit=dev
cp .env.example .env   # y completar los valores
npm start
```

Variables del `.env`:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP (por defecto 8000). |
| `APP_DEBUG` | `true` para mostrar el detalle de errores de conexión. |
| `TRUST_PROXY` | Número de proxies delante de la API (para obtener la IP real del cliente). |
| `RATE_LIMIT_PER_MINUTE` | Límite de peticiones por minuto por IP (por defecto 60). |
| `CREDICARD_API_CONSULTAR_MESES` / `CREDICARD_API_KEY_CONSULTAR_MESES` | URL y apikey del servicio de meses. |
| `CREDICARD_API_MOVIMIENTOS` / `CREDICARD_API_KEY_MOVIMIENTOS` | URL y apikey del servicio de movimientos. |
| `CREDICARD_TIMEOUT` | Segundos máximos de espera del proveedor (por defecto 30). |
| `CREDICARD_VERIFY_SSL` | `false` equivale a `curl -k`. |
| `API_EDC_CLIENT_KEY` | Llave que deben enviar los clientes en `X-API-KEY`. |

Generar `API_EDC_CLIENT_KEY` con:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Para producción se recomienda ejecutarla con un gestor de procesos (por ejemplo `pm2 start src/server.js --name api-edc-tdc`).

## Pruebas

```bash
npm test
```

Las pruebas levantan un proveedor Credicard falso en local; no llaman al proveedor real.

## Estructura (equivalencia con Laravel)

| Node.js | Laravel 8 |
|---|---|
| `src/config/index.js` | `config/credicard.php` |
| `src/services/credicardService.js` | `app/Services/CredicardService.php` |
| `src/controllers/estadoCuentaController.js` | `app/Http/Controllers/EstadoCuentaController.php` |
| `src/middleware/validarApiKeyCliente.js` | `app/Http/Middleware/ValidarApiKeyCliente.php` |
| `src/errors/CredicardException.js` | `app/Exceptions/CredicardException.php` |
| `src/routes/api.js` | `routes/api.php` |
| `src/app.js` | CORS, throttle y manejo de errores (`Kernel.php`, `RouteServiceProvider`, `Handler.php`) |
| `test/estadoCuenta.test.js` | `tests/Feature/EstadoCuentaTest.php` |
| `postman/` | `postman/` (misma colección; `base_url` apunta a `http://localhost:8000`) |
