const http = require("http");

const server = http.createServer((req, res) => {

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    switch (req.url) {
        case "/":
            res.end("Hello");
            break;

        case "/hello":
            res.end("Hello!");
            break;

        case "/time":
            res.end(new Date().toLocaleTimeString());
            break;

        default:
            res.statusCode = 404;
            res.end("Not Found");
    }
});

server.listen(3000, () => {
    console.log("Server started on http://localhost:3000");
});