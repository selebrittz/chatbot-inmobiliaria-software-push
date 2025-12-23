import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FormosaBarrios } from './formosa-barrios.enum';

export type PropertyDocument = Property & Document;

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true, index: true })
  tipo!: 'Alquiler' | 'Venta';

  @Prop({ required: true, enum: FormosaBarrios, index: true })
  barrio!: FormosaBarrios;

  @Prop({ required: true })
  direccion!: string;

  @Prop({ required: true })
  precio!: number;

  @Prop()
  habitaciones?: number;

  @Prop()
  banos?: number;

  @Prop()
  metrosCuadrados?: number;

  @Prop()
  descripcion?: string;

  @Prop()
  imagenes?: string[]; // URLs de las imágenes
}

export const PropertySchema = SchemaFactory.createForClass(Property);

// Índices para optimizar búsquedas (regla 1)
PropertySchema.index({ tipo: 1 });
PropertySchema.index({ barrio: 1 });
// Índice compuesto para búsquedas por tipo y barrio
PropertySchema.index({ tipo: 1, barrio: 1 });

// Normalización de texto: almacenar barrio en minúsculas para búsquedas
PropertySchema.pre('save', function (next) {
  if (this.barrio) {
    // El barrio ya viene del enum, pero podemos normalizar para búsquedas
    // Se manejará en el servicio con regex
  }
  next();
});

// Virtuals para conversión de precios ARS/USD (regla 4)
// La tasa de cambio se obtiene de la configuración en el servicio
// Aquí usamos un valor por defecto que será sobrescrito por el servicio
const DEFAULT_USD_TO_ARS_RATE = 1000;

PropertySchema.virtual('precioUSD').get(function () {
  // Nota: En producción, la tasa debería venir de ConfigService
  // Por ahora usamos el valor por defecto
  const rate = DEFAULT_USD_TO_ARS_RATE;
  return Math.round((this.precio / rate) * 100) / 100;
});

PropertySchema.virtual('precioFormateado').get(function () {
  // Nota: En producción, la tasa debería venir de ConfigService
  const rate = DEFAULT_USD_TO_ARS_RATE;
  const precioUSD = Math.round((this.precio / rate) * 100) / 100;
  return {
    ars: `$${this.precio.toLocaleString('es-AR')} ARS`,
    usd: `$${precioUSD.toLocaleString('en-US')} USD`,
  };
});

// Asegurar que los virtuals se incluyan en JSON
PropertySchema.set('toJSON', { virtuals: true });
PropertySchema.set('toObject', { virtuals: true });
