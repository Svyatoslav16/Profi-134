import { Module } from '@nestjs/common';
import { EventsController } from './controller';
import { EventsService } from './service';
import { RabbitMQModule } from '../rabbitmq/module';

@Module({
  imports: [RabbitMQModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
