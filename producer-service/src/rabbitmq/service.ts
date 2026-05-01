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
  RABBITMQ_EXCHANGE,
  RABBITMQ_QUEUE,
  RABBITMQ_ROUTING_KEY,
} from "./constants";
import { EventMessage } from "../common/interfaces/event-message";

@Injectable()
export class RabbitMQService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  constructor(private readonly configService: ConfigService) {}

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
      json: true,
      setup: (channel: amqp.Channel) => this.setup(channel),
    });

    await this.channelWrapper.waitForConnect();
  }

  private async setup(channel: amqp.Channel): Promise<void> {
    await channel.assertExchange(RABBITMQ_EXCHANGE, "direct", {
      durable: true,
    });
    await channel.assertQueue(RABBITMQ_QUEUE, { durable: true });

    await channel.bindQueue(
      RABBITMQ_QUEUE,
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEY,
    );
  }

  async publish(message: EventMessage): Promise<void> {
    try {
      await this.channelWrapper.publish(
        RABBITMQ_EXCHANGE,
        RABBITMQ_ROUTING_KEY,
        message,
        {
          persistent: true,
          messageId: message.id,
          contentType: "application/json",
        },
      );
      this.logger.log(`Добавлено в очередь id=${message.id}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка отправки id=${message.id} причина=${reason}`);
      throw error;
    }
  }
}
