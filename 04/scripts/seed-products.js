process.loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в .env");
    process.exit(1);
}

// limit=0 у dummyjson означает «все товары»
const DUMMYJSON_URL = "https://dummyjson.com/products?limit=0";

async function main() {
    console.log("Загружаю товары из dummyjson...");

    const response = await fetch(DUMMYJSON_URL);

    if (!response.ok) {
        throw new Error(`dummyjson error: ${response.status}`);
    }

    const data = await response.json();

    const rows = data.products.map((product) => ({
        dummyjson_id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        stock: product.stock
    }));

    console.log(`Получено ${rows.length} товаров, заливаю в Supabase...`);

    const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/products?on_conflict=dummyjson_id`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
                // повторный запуск не создаст дубли
                "Prefer": "resolution=ignore-duplicates"
            },
            body: JSON.stringify(rows)
        }
    );

    if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        throw new Error(`Supabase error ${insertResponse.status}: ${errorText}`);
    }

    console.log(`Готово! Товары в таблице products.`);
}

main().catch((error) => {
    console.error("Ошибка:", error.message);
    process.exit(1);
});
