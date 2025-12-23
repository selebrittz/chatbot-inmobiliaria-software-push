// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSession, UserSessionSchema } from './entities/user-session.entity';
import { UserSessionService } from './user-session.service';

@Module({
  imports: [
    // Registramos el schema de UserSession
    MongooseModule.forFeature([
      { name: UserSession.name, schema: UserSessionSchema },
    ]),
  ],
  providers: [UserSessionService],
  exports: [UserSessionService], // Exportamos el servicio para que otros módulos puedan usarlo
})
export class DatabaseModule {}
