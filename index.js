const express = require("express");
const cartRouter = require("./routes/cart");
const salesRouter = require("./routes/sales");
const productsRouter = require("./routes/products");
const app = express();
app.use(express.json());

app.use(cartRouter);
app.use(salesRouter);
app.use(productsRouter);

app.listen(8000);
