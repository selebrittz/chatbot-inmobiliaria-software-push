import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [forwardRef(() => ChatbotModule)], // forwardRef para evitar dependencia circular
  providers: [WhatsappService],
  controllers: [WhatsappController],
  exports: [WhatsappService], // Exportamos para que otros módulos puedan usarlo
})
export class WhatsappModule {}
