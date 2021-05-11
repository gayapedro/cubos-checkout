const express = require("express");
const { listSales } = require("../controllers/sales");
const salesRouter = express();

salesRouter.get("/relatorio", listSales);

module.exports = salesRouter;
