const config = require('../config');

/**
 * Errores del proveedor Credicard. El manejador de errores de app.js llama a
 * render() cuando la excepción llega sin capturar (igual que Laravel 8).
 */
class CredicardException extends Error {
  constructor(message, codigo, httpStatus, detalle = null) {
    super(message);
    this.name = 'CredicardException';
    this.codigo = String(codigo);
    this.httpStatus = Number(httpStatus);
    this.detalle = detalle;
  }

  /** Código "1" del código original: error de comunicación con el proveedor. */
  static conexion(detalle) {
    return new CredicardException('No fue posible comunicarse con el proveedor.', '1', 502,
      config.debug ? detalle : null);
  }

  /** Código "2" del código original: el proveedor respondió con un mensaje (msg). */
  static proveedor(msg) {
    return new CredicardException('El proveedor devolvió un mensaje.', '2', 422, msg);
  }

  static respuestaInvalida(status) {
    return new CredicardException('El proveedor devolvió una respuesta no válida.', '3', 502,
      { status_proveedor: status });
  }

  static configuracion(servicio) {
    return new CredicardException(
      `Falta configurar la URL o la apikey del servicio '${servicio}' en el .env.`, '4', 500);
  }

  render(res) {
    const cuerpo = {
      success: false,
      codigo: this.codigo,
      mensaje: this.message,
    };
    if (this.detalle !== null && this.detalle !== undefined) {
      cuerpo.detalle = this.detalle;
    }

    return res.status(this.httpStatus).json(cuerpo);
  }
}

module.exports = CredicardException;
