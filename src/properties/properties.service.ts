import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from './entities/property.entity';
import { DEFAULT_USD_TO_ARS_RATE } from '../config/constants';

interface TransformedProperty {
  _id: string;
  tipo: string;
  barrio: string;
  direccion: string;
  precio: number;
  precioUSD: number;
  precioFormateado: {
    ars: string;
    usd: string;
  };
  habitaciones?: number;
  banos?: number;
  metrosCuadrados?: number;
  descripcion?: string;
  imagenes?: string[];
}

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
    private readonly configService: ConfigService,
  ) {}

  private transformProperty(prop: PropertyDocument): TransformedProperty {
    // Convertimos el ObjectId a string para el Bot
    // Calculamos los virtuals manualmente ya que .lean() no los incluye (regla 4)
    const usdToArsRate =
      this.configService.get<number>('USD_TO_ARS_RATE') ||
      DEFAULT_USD_TO_ARS_RATE;
    const precioUSD = Math.round((prop.precio / usdToArsRate) * 100) / 100;

    return {
      _id: prop._id.toString(),
      tipo: prop.tipo,
      barrio: prop.barrio,
      direccion: prop.direccion,
      precio: prop.precio,
      precioUSD,
      precioFormateado: {
        ars: `$${prop.precio.toLocaleString('es-AR')} ARS`,
        usd: `$${precioUSD.toLocaleString('en-US')} USD`,
      },
      habitaciones: prop.habitaciones,
      banos: prop.banos,
      metrosCuadrados: prop.metrosCuadrados,
      descripcion: prop.descripcion,
      imagenes: prop.imagenes,
    };
  }

  private transformProperties(
    properties: PropertyDocument[] | Array<Record<string, unknown>>,
  ): TransformedProperty[] {
    return properties.map((prop) =>
      this.transformProperty(prop as PropertyDocument),
    );
  }

  /**
   * MÉTODO PRINCIPAL PARA EL CHATBOT (MVP)
   * Este método maneja tanto la búsqueda por barrio como la lista general.
   * Usa regex queries para búsquedas fuzzy (regla 2 de database-mongo-integration)
   */
  async searchProperties(
    tipo: 'alquiler' | 'venta',
    barrio?: string,
  ): Promise<TransformedProperty[]> {
    // 1. Normalizamos el tipo a formato del schema ('Alquiler' | 'Venta')
    const tipoNormalizado = tipo === 'alquiler' ? 'Alquiler' : 'Venta';

    // 2. Construimos el filtro base (Siempre por tipo)
    // Usamos regex case-insensitive para coincidencias parciales (regla 2)
    const query: any = {
      tipo: { $regex: new RegExp(`^${tipoNormalizado}$`, 'i') },
    };

    // 3. Si el usuario escribió un barrio, lo agregamos a la consulta
    // Regex no sensible a mayúsculas para búsquedas fuzzy (regla 2)
    if (barrio && barrio.trim() !== '') {
      query.barrio = { $regex: barrio.trim(), $options: 'i' };
    }

    // 4. Ejecutamos la consulta en MongoDB con .lean() para POJOs (regla 2)
    // Los virtuals se calculan manualmente en transformProperty ya que .lean() no los incluye
    const properties = await this.propertyModel.find(query).lean().exec();

    return this.transformProperties(properties);
  }

  // --- Mantenemos tus otros métodos por si necesitas usarlos en un panel administrativo ---

  async findAll(): Promise<TransformedProperty[]> {
    // Usar .lean() para POJOs (regla 2)
    const properties = await this.propertyModel.find({}).lean().exec();
    // Type assertion necesario debido a la complejidad de tipos de Mongoose con .lean()
    return this.transformProperties(properties as unknown as PropertyDocument[]);
  }
}
