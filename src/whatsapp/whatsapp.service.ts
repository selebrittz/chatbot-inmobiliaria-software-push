import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qrcode = require('qrcode-terminal');

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client;
  private currentQR: string | null = null;
  private qrImageDataUrl: string | null = null;
  private isReady: boolean = false;

  constructor(private readonly configService: ConfigService) {
    // Inicializamos el cliente de WhatsApp con autenticación local
    const sessionPath = this.configService.get<string>(
      'WHATSAPP_SESSION_PATH',
      './.wwebjs_auth',
    );
    const headless =
      this.configService.get<string>('WHATSAPP_HEADLESS', 'true') === 'true';

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionPath,
      }),
      puppeteer: {
        headless: headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });
  }

  async onModuleInit() {
    this.setupEventHandlers();
    await this.client.initialize();
  }

  /**
   * Configura los event handlers de WhatsApp
   */
  private setupEventHandlers() {
    // QR Code para autenticación
    this.client.on('qr', async (qr) => {
      this.logger.log('Escanea el QR Code con tu WhatsApp:');
      qrcode.generate(qr, { small: true });

      // Almacenar el QR y generar imagen base64
      this.currentQR = qr;
      try {
        this.qrImageDataUrl = await QRCode.toDataURL(qr);
        this.logger.log('QR Code generado para el frontend');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`Error al generar QR Code: ${errorMessage}`, error);
      }
    });

    // Cliente listo
    this.client.on('ready', () => {
      this.logger.log('✅ Cliente de WhatsApp conectado y listo!');
      this.isReady = true;
      this.currentQR = null;
      this.qrImageDataUrl = null;
    });

    // Autenticación exitosa
    this.client.on('authenticated', () => {
      this.logger.log('✅ Autenticación exitosa');
    });

    // Error de autenticación
    this.client.on('auth_failure', (msg) => {
      this.logger.error('❌ Error de autenticación:', msg);
    });

    // Desconexión
    this.client.on('disconnected', (reason) => {
      this.logger.warn('⚠️ Cliente desconectado:', reason);
    });
  }

  /**
   * Obtiene el cliente de WhatsApp (para el controller)
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Envía un mensaje de texto
   */
  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await this.client.sendMessage(to, message);
      this.logger.log(`Mensaje enviado a ${to}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al enviar mensaje a ${to}: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Simula "Escribiendo..." (UX mejorada)
   * Nota: whatsapp-web.js no tiene un método directo para esto,
   * pero podemos usar el estado de presencia del chat
   */
  async sendPresenceAvailable(chatId: string): Promise<void> {
    try {
      // En whatsapp-web.js, la presencia se maneja automáticamente
      // Este método se mantiene para compatibilidad futura
      await this.client.getChatById(chatId);
      // La presencia se actualiza automáticamente al enviar mensajes
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al obtener chat ${chatId}: ${errorMessage}`,
        error,
      );
    }
  }

  /**
   * Obtiene el QR Code actual para el frontend
   */
  getQRCode(): { qr: string | null; qrImage: string | null; isReady: boolean } {
    return {
      qr: this.currentQR,
      qrImage: this.qrImageDataUrl,
      isReady: this.isReady,
    };
  }
}
