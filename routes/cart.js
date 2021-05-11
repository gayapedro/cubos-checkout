const express = require("express");
const {
  listCart,
  addProductToCart,
  patchProduct,
  deleteProduct,
  deleteCart,
  finishCart,
} = require("../controllers/cart");
const cartRouter = express();

cartRouter.get("/carrinho", listCart);
cartRouter.post("/carrinho/produtos", addProductToCart);
cartRouter.patch("/carrinho/produtos/:idProduto", patchProduct);
cartRouter.delete("/carrinho/produtos/:idProduto", deleteProduct);
cartRouter.delete("/carrinho", deleteCart);
cartRouter.post("/finalizar-compra", finishCart);

module.exports = cartRouter;
