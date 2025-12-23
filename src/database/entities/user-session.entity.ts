import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type UserSessionDocument = UserSession & Document;

/**
 * Subdocumento para mensajes del historial
 */
@Schema({ _id: false })
export class MessageHistory {
  @Prop({ required: true })
  role!: 'user' | 'bot';

  @Prop({ required: true })
  content!: string;

  @Prop({ default: Date.now })
  timestamp!: Date;
}

export const MessageHistorySchema =
  SchemaFactory.createForClass(MessageHistory);

/**
 * Schema de Sesión de Usuario (regla 3)
 * Almacena el historial de mensajes como array de subdocumentos
 * para dar contexto al bot (memoria a corto plazo)
 */
@Schema({ timestamps: true })
export class UserSession {
  @Prop({ required: true, unique: true, index: true })
  phoneNumber!: string; // Número de WhatsApp del usuario

  @Prop({ default: 'waiting_intent' })
  state!: string; // Estado actual del flujo del bot

  @Prop({ type: SchemaTypes.Mixed })
  data?: Record<string, unknown>; // Datos adicionales del estado

  @Prop({ type: [MessageHistorySchema], default: [] })
  messageHistory!: MessageHistory[]; // Historial de mensajes para contexto

  @Prop({ default: Date.now })
  lastActivity!: Date; // Última actividad del usuario
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Índice para búsquedas rápidas por número de teléfono
UserSessionSchema.index({ phoneNumber: 1 });
// Índice para limpiar sesiones antiguas
UserSessionSchema.index({ lastActivity: 1 });
