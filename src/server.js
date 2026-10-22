require('dotenv').config();

const config = require('./config');
const logger = require('./utils/logger');
const app = require('./app');

if (!config.credicard.clientApiKey) {
  logger.error('API_EDC_CLIENT_KEY está vacía: la API queda abierta sin X-API-KEY (no recomendado).');
}

app.listen(config.port, () => {
  logger.info(`API EDC TDC escuchando en el puerto ${config.port}`);
});
