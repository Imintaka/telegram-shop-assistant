process.loadEnvFile();

const token = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!token || !SUPABASE_URL) {
    console.error("Нет BOT_TOKEN / SUPABASE_URL в .env");
    process.exit(1);
}

const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;

async function setWebhook() {
    const response = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: webhookUrl,
                ...(WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : {})
            })
        }
    );

    const data = await response.json();

    if (!data.ok) {
        console.error("Ошибка Telegram:", JSON.stringify(data));
        process.exit(1);
    }

    console.log(`Webhook установлен: ${webhookUrl}`);
    console.log(JSON.stringify(data.result, null, 2));
}

setWebhook();
