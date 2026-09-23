-- Картотека клиентов: одна строка на уникального пользователя Telegram.
-- Быстрая сводка «кто когда последний раз был на связи» без чтения всего журнала.
-- Telegram user_id вечен (главный ключ), ник/имя обновляются при каждом заходе.
create table if not exists public.clients (
    user_id bigint primary key,
    username text,
    first_name text,
    created_at timestamptz not null default now(),
    last_client_message_at timestamptz,  -- когда клиент последний раз НАПИСАЛ
    last_bot_reply_at timestamptz        -- когда бот последний раз ОТВЕТИЛ
);

alter table public.clients enable row level security;

-- Намеренно БЕЗ политик: карточки приватны, аноним снаружи не читает.
-- Бот обновляет их через service_role (обходит RLS), владелец смотрит в Table Editor.
