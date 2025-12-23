import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PropertySeedService } from '../properties/property-seed.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(PropertySeedService);

  try {
    await seedService.seed();
    console.log('✅ Seed ejecutado exitosamente');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error al ejecutar el seed:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

seed();
