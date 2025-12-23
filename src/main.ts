import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

/**
 * Función principal encargada de inicializar (bootstrapping) la aplicación NestJS.
 * Se define como asíncrona porque la creación y arranque del servidor requiere esperar procesos internos.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // 1. Crea la instancia de la aplicación utilizando el módulo raíz (AppModule).
    const app = await NestFactory.create(AppModule);

    // 2. Obtiene una instancia del servicio de configuración (ConfigService).
    const configService = app.get(ConfigService);

    // 3. Configuración global de validación
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Elimina propiedades que no están en el DTO
        forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
        transform: true, // Transforma automáticamente los tipos
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // 4. Filtro global de excepciones
    app.useGlobalFilters(new AllExceptionsFilter());

    // 5. Prefijo global para APIs (opcional)
    // Comentado porque el endpoint raíz debe servir el QR sin prefijo
    // app.setGlobalPrefix('api');

    // 6. Intenta obtener el puerto desde las variables de entorno (.env).
    const port = configService.get<number>('PORT', 3000);

    // 7. Inicia el servidor y lo pone a escuchar peticiones en el puerto definido.
    await app.listen(port);

    // 8. Log informativo para confirmar que el chatbot está corriendo correctamente.
    logger.log(`🚀 Chatbot WhatsApp iniciado en http://localhost:${port}`);
  } catch (error) {
    logger.error('Error al iniciar la aplicación:', error);
    process.exit(1);
  }
}

// Ejecución de la función de arranque.
bootstrap();
