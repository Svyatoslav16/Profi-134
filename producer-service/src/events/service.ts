import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RabbitMQService } from '../rabbitmq/service';
import { EventMessage } from '../common/interfaces/event-message';
import { CreateEventDto } from './dto/create-event.dto';

export interface SendEventResult {
  success: boolean;
  message?: EventMessage;
  reason?: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly rabbitmqService: RabbitMQService) {}

  async send(dto: CreateEventDto): Promise<SendEventResult> {
    const message: EventMessage = {
      id: uuidv4(),
      type: dto.type,
      payload: dto.payload,
      retryCount: 0,
    };

    try {
      await this.rabbitmqService.publish(message);
      return { success: true, message };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      return { success: false, reason };
    }
  }
}
