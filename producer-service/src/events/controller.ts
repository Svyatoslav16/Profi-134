import {
  Body,
  Controller,
  HttpCode,
  ServiceUnavailableException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { EventsService } from './service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEventDto) {
    const result = await this.eventsService.send(dto);

    if (!result.success || !result.message) {
      throw new ServiceUnavailableException({
        success: false,
        status: HttpStatus.SERVICE_UNAVAILABLE,
        reason: result.reason ?? 'Не удалось отправить сообщение',
      });
    }

    const { message } = result;

    return {
      success: true,
      messageId: message.id,
      type: message.type,
    };
  }
}
