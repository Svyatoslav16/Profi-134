import { Module } from '@nestjs/common';
import { EventsProcessor } from './processor';
import { TelegramModule } from '../telegram/module';

@Module({
  imports: [TelegramModule],
  providers: [EventsProcessor],
  exports: [EventsProcessor],
})
export class EventsModule {}
