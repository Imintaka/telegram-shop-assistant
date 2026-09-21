// Telegram-бот «магазинный ассистент» как Supabase Edge Function.
// Аналог этапа 03, но: товары из Postgres (Supabase), проверка секретного
// токена вебхука, ответ 200 вместо 500 при ошибках (без ретраев Telegram).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BOT_TOKEN) {
    throw new Error("Нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / BOT_TOKEN в секретах функции");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendMessage(chatId, text) {
    const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
    }

    return response.json();
}

// В PostgREST-фильтре or(...) запятая, скобки и двоеточие — разделители синтаксиса,
// из поискового запроса их выкидываем
function sanitizeQuery(raw) {
    return raw.replace(/[,():*%]/g, " ").trim();
}

async function findProducts(text) {
    const query = sanitizeQuery(text);

    if (query.length === 0) {
        return "Напиши, какой товар ты хочешь найти.";
    }

    const { data: products, error } = await supabase
        .from("products")
        .select("title, price, stock")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order("price")
        .limit(5);

    if (error) {
        throw new Error(`Supabase error: ${error.message}`);
    }

    if (!products || products.length === 0) {
        return "Я ничего не нашёл 😔";
    }

    const result = products
        .map((product, index) => {
            return `${index + 1}. ${product.title}
Цена: $${product.price}
Остаток: ${product.stock}`;
        })
        .join("\n\n");

    return `Нашёл товары:\n\n${result}`;
}

Deno.serve(async (req) => {
    // Telegram передаёт secret_token в этом заголовке — отсекаем фейковые апдейты
    if (WEBHOOK_SECRET && req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
    }

    try {
        const update = await req.json();
        const message = update?.message;

        if (!message?.text) {
            return Response.json({ ok: true });
        }

        const chatId = message.chat.id;
        const text = message.text;

        console.log("Message:", text);

        // startsWith, чтобы работал deep-link запуск /start <payload>
        if (text.startsWith("/start")) {
            await sendMessage(
                chatId,
                "Привет! 👋 Я помогу тебе найти товар.\n\nНапиши название товара, например: shoes, phone или laptop."
            );

            return Response.json({ ok: true });
        }

        const answer = await findProducts(text);

        await sendMessage(chatId, answer);

        return Response.json({ ok: true });

    } catch (error) {
        console.error("Webhook error:", error);

        // 200 вместо 500: Telegram не ретраит и не шлёт дубли
        return Response.json({ ok: false });
    }
});
