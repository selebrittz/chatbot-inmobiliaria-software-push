// src/properties/property-seed.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from './entities/property.entity';
import { FormosaBarrios } from './entities/formosa-barrios.enum';

@Injectable()
export class PropertySeedService implements OnModuleInit {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.propertyModel.countDocuments();
    if (count === 0) {
      await this.seed();
    }
  }

  async seed() {
    const initialData = [
      {
        tipo: 'Alquiler',
        barrio: FormosaBarrios.CENTRO,
        direccion: 'Calle Rivadavia',
        precio: 280000,
        habitaciones: 2,
        descripcion: 'Depto 2 ambientes, calle Rivadavia.',
      },
      {
        tipo: 'Alquiler',
        barrio: FormosaBarrios.LNF,
        direccion: 'La Nueva Formosa',
        precio: 190000,
        habitaciones: 2,
        descripcion: 'Casa con patio y 2 dormitorios.',
      },
      {
        tipo: 'Venta',
        barrio: FormosaBarrios.C5,
        direccion: 'Circuito 5',
        precio: 12500000, // Convertido a ARS (12500 USD * 1000)
        descripcion: 'Lote de 10x30m con escritura.',
      },
      {
        tipo: 'Venta',
        barrio: FormosaBarrios.SF,
        direccion: 'San Francisco',
        precio: 85000000, // Convertido a ARS (85000 USD * 1000)
        habitaciones: 3,
        descripcion: 'Casa moderna, 3 dorm, cochera doble.',
      },
    ];

    await this.propertyModel.insertMany(initialData);
    // Usar Logger en lugar de console.log sería mejor, pero OnModuleInit no tiene acceso directo
    // Por ahora mantenemos console.log para el seed
    console.log('✅ Base de Datos de Formosa inicializada con éxito');
  }
}
