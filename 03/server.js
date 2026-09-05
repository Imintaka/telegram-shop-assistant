
const Fastify = require("fastify");
const telegramRoutes = require("./routes/telegram.routes");

const fastify = Fastify({
    logger: true
});

fastify.get("/", async () => {
    return {
        message: "Shop bot backend is running"
    };
});

fastify.register(telegramRoutes);

async function start() {
    const port = process.env.PORT || 3000;

    await fastify.listen({
        port,
        host: "0.0.0.0"
    });
}

start().catch((error) => {
    fastify.log.error(error);
    process.exit(1);
});