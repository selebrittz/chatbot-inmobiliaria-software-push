import { Injectable } from '@nestjs/common';
import { PropertiesService } from '../properties/properties.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class ChatbotProcessor {
  // Extendemos la sesión para guardar datos del agendamiento
  private sessions = new Map<
    string,
    {
      step: string;
      type?: 'alquiler' | 'venta';
      selectedProperty?: string;
      appointmentDate?: Date;
      appointmentTime?: string;
      barrio?: string;
    }
  >();

  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async processIncomingMessage(from: string, body: string) {
    const text = body.toLowerCase().trim();
    const session = this.sessions.get(from) || { step: 'START' };

    // Comandos globales
    if (text === 'inicio' || text === 'hola' || text === 'menu') {
      return this.sendWelcome(from);
    }

    switch (session.step) {
      case 'START':
      case 'CHOOSE_CATEGORY':
        return await this.handleCategorySelection(from, text);

      case 'ASK_NEIGHBORHOOD':
        if (!session.type) {
          return this.sendWelcome(from);
        }
        return await this.handleNeighborhoodSearch(from, text, session.type);

      case 'AWAITING_VISIT_CONFIRMATION':
        return await this.handleVisitConfirmation(from, text);

      case 'AWAITING_DATE':
        return await this.handleDateSelection(from, text);

      case 'AWAITING_TIME':
        return await this.handleTimeSelection(from, text);

      case 'AWAITING_EMAIL':
        return await this.handleEmailAndFinalize(from, text);

      default:
        return this.sendWelcome(from);
    }
  }

  private async sendWelcome(from: string) {
    this.sessions.set(from, { step: 'CHOOSE_CATEGORY' });
    const welcomeMsg =
      '🌟 *¡Bienvenido a nuestra Inmobiliaria!* 🌟\n' +
      'Es un gusto saludarte. ¿En qué podemos ayudarte hoy?\n\n' +
      '1️⃣ *Alquilar* una propiedad\n' +
      '2️⃣ *Comprar* una propiedad\n' +
      '3️⃣ Ver *Requisitos* para alquilar\n\n' +
      '_Por favor, responde con el número o la palabra._';
    return await this.whatsappService.sendMessage(from, welcomeMsg);
  }

  private async handleCategorySelection(from: string, text: string) {
    if (text.includes('3') || text.includes('requisito')) {
      await this.sendRequirements(from);
      return;
    }

    const type =
      text.includes('1') || text.includes('alquiler')
        ? 'alquiler'
        : text.includes('2') ||
            text.includes('comprar') ||
            text.includes('venta')
          ? 'venta'
          : null;

    if (!type) {
      return await this.whatsappService.sendMessage(
        from,
        'Por favor, elige una opción válida: 1, 2 o 3.',
      );
    }

    this.sessions.set(from, { step: 'ASK_NEIGHBORHOOD', type });
    return await this.whatsappService.sendMessage(
      from,
      `¡Excelente! Tenemos opciones de *${type}* en Formosa. 🏠\n\n¿En qué *barrio* estás buscando?`,
    );
  }

  private async handleNeighborhoodSearch(
    from: string,
    neighborhood: string,
    type: 'alquiler' | 'venta',
  ) {
    let properties = await this.propertiesService.searchProperties(
      type,
      neighborhood,
    );
    let header = `📍 Opciones en *${neighborhood.toUpperCase()}*`;

    if (properties.length === 0) {
      properties = await this.propertiesService.searchProperties(type);
      header = `No tenemos disponibles en *${neighborhood}*, pero te comparto la lista completa de *${type}s*:`;
    }

    const listMsg = this.formatList(header, properties);
    await this.whatsappService.sendMessage(from, listMsg);

    // Guardamos el barrio y que ya mostramos las propiedades
    const barrio = properties.length > 0 ? properties[0].barrio : neighborhood;
    this.sessions.set(from, {
      step: 'AWAITING_VISIT_CONFIRMATION',
      type,
      barrio,
    });

    const textPrompt =
      `📌 *Dato importante:* Recordá que para alquilar pedimos recibo de sueldo y dos garantes.\n\n` +
      `¿Te gustaría agendar una *cita para visitar* alguna? Responde con un *SÍ* o *NO*.`;
    return await this.whatsappService.sendMessage(from, textPrompt);
  }

  private async handleVisitConfirmation(from: string, text: string) {
    if (text.includes('si') || text.includes('aceptar')) {
      // Mostrar los próximos 3 días hábiles (Lunes a Viernes)
      const businessDays = this.getNextBusinessDays();
      let dateOptions =
        '📅 *¡Genial! Vamos a agendar.*\n\n¿Qué día te queda mejor?\n\n';

      businessDays.forEach((date, index) => {
        const formattedDate = this.formatDateForUser(date);
        dateOptions += `${index + 1}️⃣ ${formattedDate}\n`;
      });

      dateOptions += '\n_Escribí el número del día._';

      this.sessions.set(from, {
        ...this.sessions.get(from),
        step: 'AWAITING_DATE',
      });

      return await this.whatsappService.sendMessage(from, dateOptions);
    }
    this.sessions.set(from, { step: 'START' });
    return await this.whatsappService.sendMessage(
      from,
      '¡No hay problema! Si necesitás algo más, escribí *Hola*.',
    );
  }

  private async handleDateSelection(from: string, text: string) {
    const businessDays = this.getNextBusinessDays();
    const selectedIndex = parseInt(text) - 1;

    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= businessDays.length
    ) {
      return await this.whatsappService.sendMessage(
        from,
        'Por favor, elegí un día válido (1, 2 o 3).',
      );
    }

    const selectedDate = businessDays[selectedIndex];

    // Mostrar horarios disponibles (bloques de 1 hora)
    const timeSlots = this.getAvailableTimeSlots();
    let timeOptions =
      `✅ Día seleccionado: *${this.formatDateForUser(selectedDate)}*\n\n` +
      `¿Qué horario te queda mejor?\n\n`;

    timeSlots.forEach((time, index) => {
      timeOptions += `${index + 1}️⃣ ${time} hs\n`;
    });

    timeOptions += '\n_Escribí el número del horario._';

    this.sessions.set(from, {
      ...this.sessions.get(from),
      step: 'AWAITING_TIME',
      appointmentDate: selectedDate,
    });

    return await this.whatsappService.sendMessage(from, timeOptions);
  }

  private async handleTimeSelection(from: string, text: string) {
    const timeSlots = this.getAvailableTimeSlots();
    const selectedIndex = parseInt(text) - 1;

    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= timeSlots.length
    ) {
      return await this.whatsappService.sendMessage(
        from,
        'Por favor, elegí un horario válido (1, 2, 3 o 4).',
      );
    }

    const selectedTime = timeSlots[selectedIndex];

    this.sessions.set(from, {
      ...this.sessions.get(from),
      step: 'AWAITING_EMAIL',
      appointmentTime: selectedTime,
    });

    return await this.whatsappService.sendMessage(
      from,
      `✅ Horario seleccionado: *${selectedTime} hs*\n\n` +
        `Por último, decime tu *correo electrónico* (email) para confirmar la cita.`,
    );
  }

  private async handleEmailAndFinalize(from: string, text: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      return await this.whatsappService.sendMessage(
        from,
        'Ups! El correo no parece válido. Por favor, escribilo de nuevo (ejemplo@gmail.com):',
      );
    }

    const session = this.sessions.get(from);

    if (
      !session ||
      !session.appointmentDate ||
      !session.appointmentTime ||
      !session.barrio
    ) {
      this.sessions.set(from, { step: 'START' });
      return await this.whatsappService.sendMessage(
        from,
        'Hubo un error al procesar tu solicitud. Por favor, escribí *Hola* para comenzar de nuevo.',
      );
    }

    // Guardar la información de la cita
    // En el futuro, esto podría guardarse en una base de datos
    // TODO: Implementar guardado en base de datos
    // Por ahora solo logueamos
    // En el futuro, crear un servicio de citas (AppointmentsService)
    // const appointmentInfo = {
    //   email: text,
    //   date: session.appointmentDate,
    //   time: session.appointmentTime,
    //   barrio: session.barrio,
    //   phone: from,
    // };

    this.sessions.set(from, { step: 'START' });

    return await this.whatsappService.sendMessage(
      from,
      `✅ *¡Cita confirmada!*\n\n` +
        `📅 Día: ${this.formatDateForUser(session.appointmentDate)}\n` +
        `🕐 Horario: ${session.appointmentTime} hs\n` +
        `🏠 Barrio: ${session.barrio}\n` +
        `📧 Email: ${text}\n\n` +
        `Un asesor te contactará pronto para confirmar los detalles de la visita. ¡Gracias!`,
    );
  }

  private async sendRequirements(from: string) {
    const reqMsg =
      '📝 *Requisitos Generales:*\n\n' +
      '• Recibo de sueldo del titular.\n' +
      '• Dos garantes con recibo de Formosa.\n' +
      '• Mes de adelanto + Mes de depósito.\n\n' +
      'Escribí *Hola* para volver al menú.';
    await this.whatsappService.sendMessage(from, reqMsg);
    this.sessions.set(from, { step: 'START' });
  }

  private formatList(header: string, list: any[]): string {
    if (list.length === 0) return 'No hay propiedades cargadas.';
    let msg = `✨ ${header} ✨\n\n`;
    list.forEach((p, i) => {
      msg += `${i + 1}️⃣ *${p.barrio}*\n   ${p.description || p.direccion}\n   💰 *${p.precioFormateado.ars}*\n   ----------\n`;
    });
    return msg;
  }

  /**
   * Obtiene los próximos 3 días hábiles (Lunes a Viernes)
   */
  private getNextBusinessDays(): Date[] {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysToAdd = 1;
    let daysFound = 0;

    while (daysFound < 3) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + daysToAdd);
      const dayOfWeek = currentDate.getDay();

      // Solo Lunes a Viernes (1-5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        days.push(currentDate);
        daysFound++;
      }
      daysToAdd++;
    }

    return days;
  }

  /**
   * Formatea una fecha para mostrar al usuario
   */
  private formatDateForUser(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  }

  /**
   * Obtiene los horarios disponibles (bloques de 1 hora)
   */
  private getAvailableTimeSlots(): string[] {
    return ['10:00', '11:00', '16:00', '17:00'];
  }
}
