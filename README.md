# Telegram Cron Bot on Vercel (Edge)

Отправляет сообщение в Telegram по расписанию через серверлес-функцию Vercel.

## Быстрый старт

1. Создай бота в Telegram через @BotFather → `/newbot` и получи токен.
2. Напиши своему боту любое сообщение (например, `/start`).
3. Узнай `CHAT_ID`:
   - Открой в браузере: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Найди `message.chat.id` (для групп может быть отрицательным).

4. Деплой на Vercel:
   - Импортируй этот проект в Vercel или запуш в GitHub и импортируй репозиторий.
   - В **Settings → Environment Variables** добавь:
     - `BOT_TOKEN` — токен бота от BotFather
     - `CHAT_ID` — твой chat id
     - (опц.) `MESSAGE` — текст, который будет отправляться
   - Нажми **Redeploy**.

5. Протестируй вручную:
   - Открой `https://<your-project>.vercel.app/api/send`
   - Должен прийти JSON `{ ok: true, result: ... }` и сообщение в Telegram.

## Расписание (cron)

В `vercel.json` по умолчанию стоит каждый день в 09:00 по `Europe/Madrid`:
```json
{
  "crons": [
    { "path": "/api/send", "schedule": "0 9 * * *", "timezone": "Europe/Madrid" }
  ]
}
```

Примеры:
- Каждый час: `"0 * * * *"`
- По будням в 10:30 и 17:45 (два правила):
  ```json
  {
    "crons": [
      { "path": "/api/send", "schedule": "30 10 * * 1-5", "timezone": "Europe/Madrid" },
      { "path": "/api/send", "schedule": "45 17 * * 1-5", "timezone": "Europe/Madrid" }
    ]
  }
  ```

## Безопасность
**Не** храни токен в коде и репозитории. Используй переменные окружения.
Если токен когда-либо попадал в открытый доступ — сгенерируй новый у @BotFather (`/revoke` или пересоздай).

## Файлы
- `api/send.ts` — edge-функция, которая шлёт `sendMessage` в Telegram
- `vercel.json` — расписание (cron)
- `.env.sample` — пример локальных переменных (для удобства)
- `.gitignore` — исключает `.env*`
