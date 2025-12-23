// src/properties/properties.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './entities/property.entity';
import { PropertiesService } from './properties.service';
import { PropertySeedService } from './property-seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  providers: [PropertiesService, PropertySeedService],
  exports: [PropertiesService], // Para que el Chatbot pueda usarlo
})
export class PropertiesModule {}
