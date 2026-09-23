// Админ-функция: вся картотека клиентов, недавно активные — первыми.
// Зачем: внешняя проверка, что бот меняет состояние сервера (таблица clients).
// Защита та же, что у вебхука: заголовок x-telegram-bot-api-secret-token,
// потому что переписка приватная и читать её через URL нельзя.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
    throw new Error("Нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / WEBHOOK_SECRET в секретах функции");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
    if (req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
    }

    // «Самый недавний» = когда клиент последний раз написал
    // (у каждой карточки эта дата есть: без сообщения клиента карточки не бывает)
    const { data: clients, error } = await supabase
        .from("clients")
        .select("user_id, username, first_name, created_at, last_client_message_at, last_bot_reply_at")
        .order("last_client_message_at", { ascending: false, nullsFirst: false });

    if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, count: clients.length, clients: clients });
});
