process.loadEnvFile();

const token = process.env.BOT_TOKEN;

const webhookUrl =
    "https://telegram-shop-assistant.vercel.app/telegram/webhook";

async function setWebhook() {
    const response = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: webhookUrl
            })
        }
    );

    const data = await response.json();

    console.log(data);
}

setWebhook();