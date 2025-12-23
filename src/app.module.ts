import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { PropertiesModule } from './properties/properties.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // ConfigModule debe ser el primero para que las variables de entorno estén disponibles
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible en todos los módulos
      envFilePath: '.env', // Ruta al archivo .env
      validate, // Validación de variables de entorno
      cache: true, // Cachear configuración para mejor rendimiento
    }),
    // Conexión a MongoDB usando ConfigService
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/inmobiliaria-formosa',
        ),
      }),
      inject: [ConfigService],
    }),
    // Módulos de la aplicación
    WhatsappModule,
    ChatbotModule,
    PropertiesModule,
  ],
})
export class AppModule {}
