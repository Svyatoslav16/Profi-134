# Profi-134

Ссылка на видео демонстрацию https://disk.yandex.ru/i/GpJDDLOXaRM11w

Тестовое задание по микросервисной архитектуре на Nest.js с RabbitMQ и Telegram API

## Настройка
### .env
В корне нужно переименовать .env на env.example и настроить переменные:
### npm
```bash
cd producer-service && npm i
```

```bash
cd consumer-service && npm i
```

### Telegram переменные, которые необходимо настроить для отправки сообщений
TELEGRAM_BOT_TOKEN - токен бота от https://t.me/BotFather

TELEGRAM_CHAT_ID - id чата или канала, куда бот будет слать уведомления

## Запуск
```bash
docker compose up --build
```

**Пример с curl:**

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order.created",
    "payload": { "Message": "Сообщение от приложения" }
  }'
```
