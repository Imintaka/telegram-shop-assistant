// Telegram-бот «магазинный ассистент» как Supabase Edge Function.
// Аналог этапа 03, но: товары из Postgres (Supabase), проверка секретного
// токена вебхука, ответ 200 вместо 500 при ошибках (без ретраев Telegram).
// Плюс журнал: каждая реплика пишется в messages, уникальные пользователи
// ведутся карточками в clients (даты последнего контакта в обе стороны).

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

// «Тетрадка»: запись одной реплики диалога. text передаётся отдельно —
// для 'out' это текст ответа бота, а не echo сообщения клиента.
// Ошибка журнала не должна ломать ответы покупателю — только console.error.
async function logMessage(message, text, direction) {
    try {
        const { error } = await supabase.from("messages").insert({
            user_id: message.from.id,
            username: message.from.username ?? null,
            chat_id: message.chat.id,
            text: text,
            direction: direction,
        });

        if (error) {
            throw new Error(error.message);
        }
    } catch (error) {
        console.error("logMessage error:", error);
    }
}

// «Картотека»: upsert — карточка создаётся при первом сообщении и обновляется
// при каждом следующем (актуальные ник/имя + одна из дат контакта).
async function touchClient(message, kind) {
    const now = new Date().toISOString();

    try {
        const { error } = await supabase.from("clients").upsert({
            user_id: message.from.id,
            username: message.from.username ?? null,
            first_name: message.from.first_name ?? null,
            ...(kind === "in"
                ? { last_client_message_at: now }
                : { last_bot_reply_at: now }),
        });

        if (error) {
            throw new Error(error.message);
        }
    } catch (error) {
        console.error("touchClient error:", error);
    }
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

        // журнал + карточка: входящее фиксируем до обработки
        await logMessage(message, text, "in");
        await touchClient(message, "in");

        // startsWith, чтобы работал deep-link запуск /start <payload>
        if (text.startsWith("/start")) {
            const greeting = "Привет! 👋 Я помогу тебе найти товар.\n\nНапиши название товара, например: shoes, phone или laptop.";

            await sendMessage(chatId, greeting);
            await logMessage(message, greeting, "out");
            await touchClient(message, "out");

            return Response.json({ ok: true });
        }

        const answer = await findProducts(text);

        await sendMessage(chatId, answer);
        // 'out' фиксируем после успешной отправки: если Telegram не примет ответ,
        // даты в карточке разойдутся — и это будет видно как сигнал проблемы
        await logMessage(message, answer, "out");
        await touchClient(message, "out");

        return Response.json({ ok: true });

    } catch (error) {
        console.error("Webhook error:", error);

        // 200 вместо 500: Telegram не ретраит и не шлёт дубли
        return Response.json({ ok: false });
    }
});
