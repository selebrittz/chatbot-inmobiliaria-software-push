import {
  Controller,
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Get,
  Res,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ChatbotProcessor } from '../chatbot/chatbot.processor';
import { Message } from 'whatsapp-web.js';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Controller que actúa como Event Handler
 * Escucha los eventos de whatsapp-web.js y delega la lógica al ChatbotProcessor
 */
@Controller()
@Injectable()
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => ChatbotProcessor))
    private readonly chatbotProcessor: ChatbotProcessor,
  ) {
    this.setupMessageHandler();
  }

  /**
   * Configura el handler de mensajes entrantes
   */
  private setupMessageHandler() {
    const client = this.whatsappService.getClient();

    client.on('message', async (message: Message) => {
      // Ignorar mensajes propios
      if (message.fromMe) return;

      // Ignorar mensajes de grupos (opcional)
      const chat = await message.getChat();
      if (chat.isGroup) return;

      this.logger.log(
        `📨 Mensaje recibido de ${message.from}: ${message.body}`,
      );

      try {
        // Delegar el procesamiento al ChatbotProcessor
        await this.chatbotProcessor.processIncomingMessage(
          message.from,
          message.body,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`Error al procesar mensaje: ${errorMessage}`, error);
        try {
          await this.whatsappService.sendMessage(
            message.from,
            'Lo siento, ocurrió un error. Por favor intenta de nuevo.',
          );
        } catch (sendError) {
          this.logger.error(
            `Error al enviar mensaje de error: ${sendError}`,
            sendError,
          );
        }
      }
    });

    this.logger.log('✅ WhatsApp Controller configurado y escuchando mensajes');
  }

  /**
   * Endpoint raíz - Redirige al frontend del QR
   */
  @Get()
  getRoot(@Res() res: Response) {
    return this.getQRPage(res);
  }

  /**
   * Endpoint para servir el HTML del frontend moderno
   */
  @Get('qr')
  getQRPage(@Res() res: Response) {
    try {
      // En desarrollo: src/whatsapp/templates/qr-page.html
      // En producción: dist/whatsapp/templates/qr-page.html
      const htmlPath = path.join(
        process.cwd(),
        'src',
        'whatsapp',
        'templates',
        'qr-page.html',
      );
      const html = fs.readFileSync(htmlPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      this.logger.error(`Error al leer el template HTML: ${error}`);
      res.status(500).send('Error al cargar la página');
    }
  }

  /**
   * Endpoint API para obtener el QR Code
   */
  @Get('api/qr')
  getQRCode() {
    return this.whatsappService.getQRCode();
  }
}
