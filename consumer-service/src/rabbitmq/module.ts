import { Module } from '@nestjs/common';
import { RabbitMQConsumer } from './consumer';
import { EventsModule } from '../events/module';

@Module({
  imports: [EventsModule],
  providers: [RabbitMQConsumer],
})
export class RabbitMQModule {}
