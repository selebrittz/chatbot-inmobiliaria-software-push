import { Injectable } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { PropertiesService } from '../properties/properties.service';
import { UserSessionService } from '../database/user-session.service';
import { FormosaBarrios } from '../properties/entities/formosa-barrios.enum';

/**
 * Manejo de flujo y estados del chatbot
 * Gestiona las sesiones y el estado de cada usuario (usando MongoDB)
 */
@Injectable()
export class ChatbotService {
  // Logger disponible para uso futuro si es necesario
  // private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly propertiesService: PropertiesService,
    private readonly userSessionService: UserSessionService,
  ) {}

  /**
   * Maneja el saludo inicial
   */
  async handleGreeting(from: string): Promise<void> {
    const welcomeMessage = `¡Hola! 👋\n\nSoy el asistente de Inmobiliaria Formosa.\n\n¿En qué puedo ayudarte?\n\n📌 Escribe:\n• "Alquiler" para ver propiedades en alquiler\n• "Venta" para ver propiedades en venta`;

    await this.whatsappService.sendMessage(from, welcomeMessage);
    await this.setUserState(from, 'waiting_intent');
    await this.userSessionService.addMessageToHistory(
      from,
      'bot',
      welcomeMessage,
    );
  }

  /**
   * Maneja la intención de alquiler
   */
  async handleAlquilerIntent(from: string, text: string): Promise<void> {
    // Guardar mensaje del usuario en el historial
    await this.userSessionService.addMessageToHistory(from, 'user', text);

    // Detectar barrio en el mensaje
    const barrio = this.extractBarrio(text);

    if (barrio) {
      // Buscar propiedades de alquiler en el barrio específico
      // Usar searchProperties con tipo normalizado (regla MVC)
      const properties = await this.propertiesService.searchProperties(
        'alquiler',
        barrio,
      );
      await this.sendPropertiesList(from, properties, 'Alquiler', barrio);
    } else {
      // Mostrar opciones de barrios
      await this.askForBarrio(from, 'Alquiler');
      await this.setUserState(from, 'waiting_barrio_alquiler');
    }
  }

  /**
   * Maneja la intención de venta
   */
  async handleVentaIntent(from: string, text: string): Promise<void> {
    // Guardar mensaje del usuario en el historial
    await this.userSessionService.addMessageToHistory(from, 'user', text);

    // Detectar barrio en el mensaje
    const barrio = this.extractBarrio(text);

    if (barrio) {
      // Buscar propiedades de venta en el barrio específico
      // Usar searchProperties con tipo normalizado (regla MVC)
      const properties = await this.propertiesService.searchProperties(
        'venta',
        barrio,
      );
      await this.sendPropertiesList(from, properties, 'Venta', barrio);
    } else {
      // Mostrar opciones de barrios
      await this.askForBarrio(from, 'Venta');
      await this.setUserState(from, 'waiting_barrio_venta');
    }
  }

  /**
   * Maneja mensajes no reconocidos
   */
  async handleUnknownMessage(from: string, text: string): Promise<void> {
    // Guardar mensaje del usuario en el historial
    await this.userSessionService.addMessageToHistory(from, 'user', text);

    const message = `No entendí tu mensaje. 😅\n\nPor favor, escribe:\n• "Alquiler" para ver propiedades en alquiler\n• "Venta" para ver propiedades en venta\n• "Hola" para comenzar de nuevo`;
    await this.whatsappService.sendMessage(from, message);
    await this.userSessionService.addMessageToHistory(from, 'bot', message);
  }

  /**
   * Pide al usuario que seleccione un barrio
   */
  private async askForBarrio(
    from: string,
    tipo: 'Alquiler' | 'Venta',
  ): Promise<void> {
    const message = `¿En qué barrio buscas propiedades de ${tipo}?\n\nBarrios disponibles:\n• Centro\n• San Francisco\n• La Nueva Formosa\n• Circuito 5\n• Villa del Carmen\n\nEscribe el nombre del barrio:`;
    await this.whatsappService.sendMessage(from, message);
  }

  /**
   * Extrae el barrio del texto del mensaje
   */
  private extractBarrio(text: string): FormosaBarrios | null {
    const barrioMap: { [key: string]: FormosaBarrios } = {
      centro: FormosaBarrios.CENTRO,
      'san francisco': FormosaBarrios.SF,
      'la nueva formosa': FormosaBarrios.LNF,
      'circuito 5': FormosaBarrios.C5,
      'villa del carmen': FormosaBarrios.VDC,
    };

    for (const [key, value] of Object.entries(barrioMap)) {
      if (text.includes(key)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Envía la lista de propiedades formateada
   * Recibe objetos planos (POJOs) del PropertiesService (regla 4)
   */
  private async sendPropertiesList(
    from: string,
    properties: Array<{
      _id: string;
      direccion: string;
      precio: number;
      precioFormateado?: { usd: string };
      habitaciones?: number;
      banos?: number;
      metrosCuadrados?: number;
      descripcion?: string;
    }>,
    tipo: string,
    barrio: FormosaBarrios,
  ): Promise<void> {
    if (properties.length === 0) {
      const message = `No encontramos propiedades de ${tipo} en ${barrio} en este momento. 😔\n\n¿Te gustaría buscar en otro barrio?`;
      await this.whatsappService.sendMessage(from, message);
      await this.userSessionService.addMessageToHistory(from, 'bot', message);
      return;
    }

    let message = `🏠 *Propiedades de ${tipo} en ${barrio}*\n\n`;

    properties.forEach((prop, index) => {
      message += `*${index + 1}. ${prop.direccion}*\n`;
      message += `💰 Precio: $${prop.precio.toLocaleString()} ARS\n`;
      // Usar virtuals si están disponibles (precioFormateado)
      if (prop.precioFormateado) {
        message += `   ${prop.precioFormateado.usd}\n`;
      }
      if (prop.habitaciones)
        message += `🛏️ Habitaciones: ${prop.habitaciones}\n`;
      if (prop.banos) message += `🚿 Baños: ${prop.banos}\n`;
      if (prop.metrosCuadrados)
        message += `📐 Metros²: ${prop.metrosCuadrados}\n`;
      if (prop.descripcion) message += `📝 ${prop.descripcion}\n`;
      message += `\n`;
    });

    message += `\n¿Te interesa alguna? Escribe el número o "Hola" para buscar otra cosa.`;

    await this.whatsappService.sendMessage(from, message);
    await this.userSessionService.addMessageToHistory(from, 'bot', message);
  }

  /**
   * Establece el estado de un usuario (usando MongoDB)
   */
  private async setUserState(
    from: string,
    state: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.userSessionService.updateUserState(from, state, data);
  }

  /**
   * Obtiene el estado de un usuario (usando MongoDB)
   */
  async getUserState(from: string): Promise<{
    state: string;
    data?: Record<string, unknown>;
  } | null> {
    return await this.userSessionService.getUserState(from);
  }

  /**
   * Obtiene el historial de mensajes de un usuario para contexto
   */
  async getMessageHistory(from: string) {
    return await this.userSessionService.getMessageHistory(from);
  }
}
