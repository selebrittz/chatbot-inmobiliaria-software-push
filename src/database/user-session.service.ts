import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserSession,
  UserSessionDocument,
  MessageHistory,
} from './entities/user-session.entity';

@Injectable()
export class UserSessionService {
  constructor(
    @InjectModel(UserSession.name)
    private userSessionModel: Model<UserSessionDocument>,
  ) {}

  /**
   * Obtiene o crea una sesión para un usuario
   */
  async getOrCreateSession(phoneNumber: string): Promise<UserSession> {
    let session = await this.userSessionModel
      .findOne({ phoneNumber })
      .lean()
      .exec();

    if (!session) {
      const newSession = await this.userSessionModel.create({
        phoneNumber,
        state: 'waiting_intent',
        messageHistory: [],
        lastActivity: new Date(),
      });
      // Type assertion necesario debido a la complejidad de tipos de Mongoose
      session = newSession.toObject() as unknown as typeof session;
    }

    // Type assertion necesario debido a la complejidad de tipos de Mongoose
    return session as unknown as UserSession;
  }

  /**
   * Actualiza el estado de un usuario
   */
  async updateUserState(
    phoneNumber: string,
    state: string,
    data?: Record<string, unknown>,
  ): Promise<UserSession> {
    const session = await this.userSessionModel
      .findOneAndUpdate(
        { phoneNumber },
        {
          state,
          data,
          lastActivity: new Date(),
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();

    return session;
  }

  /**
   * Obtiene el estado actual de un usuario
   */
  async getUserState(phoneNumber: string): Promise<{
    state: string;
    data?: Record<string, unknown>;
  } | null> {
    const session = await this.userSessionModel
      .findOne({ phoneNumber })
      .lean()
      .exec();

    if (!session) {
      return null;
    }

    return {
      state: session.state,
      data: session.data,
    };
  }

  /**
   * Agrega un mensaje al historial del usuario
   */
  async addMessageToHistory(
    phoneNumber: string,
    role: 'user' | 'bot',
    content: string,
  ): Promise<void> {
    const message: MessageHistory = {
      role,
      content,
      timestamp: new Date(),
    };

    await this.userSessionModel
      .findOneAndUpdate(
        { phoneNumber },
        {
          $push: { messageHistory: message },
          $set: { lastActivity: new Date() },
        },
        { upsert: true },
      )
      .exec();

    // Limitar el historial a los últimos N mensajes para evitar documentos muy grandes
    // Usamos una constante para facilitar el mantenimiento
    const MESSAGE_HISTORY_LIMIT = 20;
    await this.userSessionModel
      .findOneAndUpdate({ phoneNumber }, [
        {
          $set: {
            messageHistory: {
              $slice: ['$messageHistory', -MESSAGE_HISTORY_LIMIT],
            },
          },
        },
      ])
      .exec();
  }

  /**
   * Obtiene el historial de mensajes de un usuario
   */
  async getMessageHistory(phoneNumber: string): Promise<MessageHistory[]> {
    const session = await this.userSessionModel
      .findOne({ phoneNumber })
      .lean()
      .exec();

    return session?.messageHistory || [];
  }

  /**
   * Limpia sesiones antiguas (más de 30 días sin actividad)
   */
  async cleanOldSessions(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.userSessionModel
      .deleteMany({
        lastActivity: { $lt: thirtyDaysAgo },
      })
      .exec();

    return result.deletedCount || 0;
  }
}
