process.loadEnvFile();

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
    try {
        await fastify.listen({
            port: 3000
        });
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
}

start();