const express = require("express");
const { listProducts } = require("../controllers/products");
const productsRouter = express();

productsRouter.get("/produtos", listProducts);

module.exports = productsRouter;
