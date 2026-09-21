# Этап 04 — бот на Supabase

Вся версия этапа: webhook работает как Supabase Edge Function (Deno), товары лежат
в Postgres самой базы Supabase. Этап `03/` (Vercel) не тронут и продолжает работать
параллельно — у него свой бот (свой токен), у этого этапа свой второй бот.

## Шаги запуска

### 1. Создать проект Supabase и второго бота
- [supabase.com](https://supabase.com) → New project (регион Central EU / Frankfurt).
- У [@BotFather](https://t.me/BotFather): `/newbot` → имя → username (должен
  заканчиваться на `bot`) → получить токен.

### 2. Заполнить `.env`
```
copy .env.example .env
```
Вписать: `BOT_TOKEN` (второго бота), `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`
(Settings → API в дашборде), `WEBHOOK_SECRET` — любая случайная строка, например:
`node -e "console.log(crypto.randomUUID())"`.

### 3. Создать таблицу
В дашборде Supabase: **SQL Editor → New query**, вставить содержимое
`supabase/migrations/001_products.sql`, выполнить **Run**.

### 4. Залить товары
```
npm run seed
```
(импорт ~194 товаров из dummyjson; повторный запуск дубли не создаёт)

### 5. Установить Supabase CLI и задеплоить функцию
```
npm install -g supabase
supabase login
supabase link --project-ref <ref>
```
`<ref>` — это поддомен из `SUPABASE_URL` (для `https://abc123.supabase.co` это `abc123`).

Секреты функции (не путать с `.env` — их надо задать и в Supabase):
```
supabase secrets set BOT_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... WEBHOOK_SECRET=...
```
(значения те же, что в `.env`)

Деплой:
```
supabase functions deploy telegram-webhook
```

### 6. Направить бота на функцию
```
npm run set-webhook
```

### 7. Проверить
Написать второму боту `/start`, потом например `phone`.

## Отличия от этапа 03
- Источник товаров — Postgres Supabase вместо dummyjson.com.
- Проверка `x-telegram-bot-api-secret-token` — фейковые апдейты отбиваются (403).
- Ошибки отвечают 200, а не 500 — Telegram не ретраит, дублей сообщений нет.
- `/start` ловится через `startsWith` — deep-link запуск `/start <payload>` работает.

## Структура
```
supabase/
  config.toml                          — настройки CLI (verify_jwt = false)
  functions/telegram-webhook/index.ts  — весь бот (Edge Function, Deno)
  migrations/001_products.sql          — таблица products + RLS
scripts/
  seed-products.js                     — разовая заливка товаров из dummyjson
  set-webhook-supabase.js              — setWebhook на URL функции
```
