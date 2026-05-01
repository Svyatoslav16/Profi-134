import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EventMessage } from '../common/interfaces/event-message';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly apiUrl: string;
  private readonly chatId: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.getOrThrow<string>('TELEGRAM_CHAT_ID');
    this.apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  }

  async sendMessage(message: EventMessage) {
    const text = this.buildMessageText(message);

    try {
      await axios.post(this.apiUrl, {
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
      });

    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? error.response?.data ?? error.message
        : error;
      this.logger.error(`Telegram ошибка отправки уведомления: ${JSON.stringify(detail)}`);
      throw error;
    }
  }

  private buildMessageText(message: EventMessage) {
    return JSON.stringify(message.payload);
  }
}
