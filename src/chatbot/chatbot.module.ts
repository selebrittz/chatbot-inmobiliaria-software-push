import { Module, forwardRef } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotProcessor } from './chatbot.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PropertiesModule } from '../properties/properties.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    forwardRef(() => WhatsappModule), // forwardRef para evitar dependencia circular
    PropertiesModule,
    DatabaseModule, // Módulo de sesiones MongoDB
  ],
  providers: [ChatbotService, ChatbotProcessor],
  exports: [ChatbotService, ChatbotProcessor],
})
export class ChatbotModule {}
