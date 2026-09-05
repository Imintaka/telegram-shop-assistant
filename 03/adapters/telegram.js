const token = process.env.BOT_TOKEN;

async function sendMessage(chatId, text) {
    const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            `Telegram API error: ${response.status}`
        );
    }

    return response.json();
}

module.exports = {
    sendMessage
};