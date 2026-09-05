const telegram = require("../adapters/telegram");
const {
    findProducts
} = require("../use-cases/find-products");

async function telegramRoutes(fastify) {

    fastify.post(
        "/telegram/webhook",
        async (request, reply) => {

            try {
                const update = request.body;

                const message = update.message;

                if (!message?.text) {
                    return {
                        ok: true
                    };
                }

                const chatId = message.chat.id;
                const text = message.text;

                fastify.log.info(
                    `Message: ${text}`
                );

                const answer = await findProducts(text);

                await telegram.sendMessage(
                    chatId,
                    answer
                );

                return {
                    ok: true
                };

            } catch (error) {

                fastify.log.error(error);

                reply.code(500);

                return {
                    ok: false
                };
            }
        }
    );
}

module.exports = telegramRoutes;