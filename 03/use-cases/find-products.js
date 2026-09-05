const productsAdapter = require("../adapters/products");

async function findProducts(text) {
    if (!text || text.trim().length === 0) {
        return "Напиши, какой товар ты хочешь найти.";
    }

    const products = await productsAdapter.findProducts(
        text.trim()
    );

    if (products.length === 0) {
        return "Я ничего не нашёл 😔";
    }

    const firstProducts = products.slice(0, 5);

    const result = firstProducts
        .map((product, index) => {
            return `${index + 1}. ${product.title}
Цена: $${product.price}
Остаток: ${product.stock}`;
        })
        .join("\n\n");

    return `Нашёл товары:\n\n${result}`;
}

module.exports = {
    findProducts
};