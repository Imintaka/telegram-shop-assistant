async function findProducts(query) {
    const response = await fetch(
        `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
        throw new Error(
            `Products API error: ${response.status}`
        );
    }

    const data = await response.json();

    return data.products;
}

module.exports = {
    findProducts
};