process.loadEnvFile();

const token = process.env.BOT_TOKEN;

let offset = 0;

async function getUpdates() {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Ошибка Telegram API`);
        }

        console.log(JSON.stringify(data, null, 2));

        for (const update of data.result) {
            offset = update.update_id + 1;
        }

    } catch (error) {
        console.error("Ошибка:", error.message);
    }
}

getUpdates();

setInterval(getUpdates, 5000)