import { Injectable } from '@nestjs/common';
import { TelegramService } from '../telegram/service';
import { EventMessage } from '../common/interfaces/event-message';

@Injectable()
export class EventsProcessor {
  constructor(private readonly telegramService: TelegramService) {}

  async process(message: EventMessage): Promise<void> {
    await this.telegramService.sendMessage(message);
  }
}
