import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from "amqp-connection-manager";
import {
  MAX_RETRY_COUNT,
  RABBITMQ_EXCHANGE,
  RABBITMQ_QUEUE,
  RABBITMQ_ROUTING_KEY,
  RETRY_DELAY_MS,
} from "./constants";
import { EventMessage } from "../common/interfaces/event-message";
import { EventsProcessor } from "../events/processor";

export const NO_ACK = false; // Не удалять сообщение из очереди после обработки
export const PREFETCH = 1; // Одно сообщение за раз

@Injectable()
export class RabbitMQConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventsProcessor: EventsProcessor,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.channelWrapper?.close();
    await this.connection?.close();
  }

  private async connect(): Promise<void> {
    const url = this.configService.getOrThrow<string>("RABBITMQ_URL");

    this.connection = connect([url], { reconnectTimeInSeconds: 5 });

    this.channelWrapper = this.connection.createChannel({
      setup: (channel: amqp.Channel) => this.setupChannel(channel),
    });

    await this.channelWrapper.waitForConnect();
  }

  private async setupChannel(channel: amqp.Channel): Promise<void> {
    await channel.assertExchange(RABBITMQ_EXCHANGE, "direct", {
      durable: true,
    });
    await channel.assertQueue(RABBITMQ_QUEUE, { durable: true });

    await channel.bindQueue(
      RABBITMQ_QUEUE,
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEY,
    );

    await channel.prefetch(PREFETCH);

    await channel.consume(
      RABBITMQ_QUEUE,
      (raw) => {
        if (raw) this.handleMessage(channel, raw);
      },
      {
        noAck: NO_ACK,
      },
    );
  }

  private async handleMessage(
    channel: amqp.Channel,
    raw: amqp.ConsumeMessage,
  ): Promise<void> {
    let message: EventMessage;

    try {
      message = JSON.parse(raw.content.toString()) as EventMessage;
    } catch {
      this.logger.error("Получено некорректное сообщение");
      channel.nack(raw, false, false);
      return;
    }

    try {
      await this.eventsProcessor.process(message);
      channel.ack(raw);
      this.logger.log(`Отправляем сообщение id=${message.id}`);
    } catch (error) {
      this.logger.error(
        `Ошибка id=${message.id}, причина=${error instanceof Error ? error.message : error}`,
      );
      await this.handleRetry(channel, raw, message);
    }
  }

  private async handleRetry(
    channel: amqp.Channel,
    raw: amqp.ConsumeMessage,
    message: EventMessage,
  ): Promise<void> {
    if (message.retryCount >= MAX_RETRY_COUNT) {
      // TODO: тут намеренно упростил возврат в очередь, для реального проекта DLQ + DLX нужно использовать
      channel.nack(raw, false, true);
      this.logger.error(
        `Не обработанное сообщение id=${message.id}, возвращено в очередь`,
      );
      return;
    }

    channel.ack(raw);

    const nextMessage: EventMessage = {
      ...message,
      retryCount: message.retryCount + 1,
    };

    const delay = RETRY_DELAY_MS * Math.pow(2, message.retryCount);

    this.logger.warn(
      `Повторная отправка сообщения id=${message.id}, попытка ${nextMessage.retryCount}`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    await this.channelWrapper.publish(
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEY,
      Buffer.from(JSON.stringify(nextMessage)),
      {
        persistent: true,
        messageId: nextMessage.id,
        contentType: "application/json",
      },
    );
  }
}
