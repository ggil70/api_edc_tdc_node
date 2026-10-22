/**
 * Logger mínimo en formato JSON (una línea por evento) hacia stdout/stderr.
 * Equivalente a Log::error / Log::info de Laravel; el servidor (pm2, IIS, docker)
 * se encarga de guardar la salida.
 */
function escribir(nivel, mensaje, contexto) {
  const linea = JSON.stringify({ fecha: new Date().toISOString(), nivel, mensaje, ...contexto });
  if (nivel === 'error') {
    console.error(linea);
  } else {
    console.log(linea);
  }
}

module.exports = {
  info: (mensaje, contexto = {}) => escribir('info', mensaje, contexto),
  error: (mensaje, contexto = {}) => escribir('error', mensaje, contexto),
};
