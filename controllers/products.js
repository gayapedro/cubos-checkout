const fs = require("fs/promises");

async function listProducts(req, res) {
  let { categoria, precoInicial, precoFinal } = req.query;
  if (!precoInicial) {
    precoInicial = 0;
  }
  if (!precoFinal) {
    precoFinal = Infinity;
  }
  try {
    const objetoEstoque = JSON.parse(await fs.readFile("./data/data.json"));
    const response = objetoEstoque.produtos.filter(item => {
      if (categoria && (precoInicial || precoFinal)) {
        //busca usando categoria, com ou sem faixa de preço
        return (
          item.estoque > 0 &&
          item.preco >= Number(precoInicial) &&
          item.preco <= Number(precoFinal) &&
          item.categoria === categoria[0].toUpperCase() + categoria.slice(1)
        );
      } else if (precoInicial || precoFinal) {
        // busca usando apenas faixa de preço
        return (
          item.estoque > 0 &&
          item.preco >= Number(precoInicial) &&
          item.preco <= Number(precoFinal)
        );
      } else {
        // retorna todos produtos com estoque
        return item.estoque > 0;
      }
    });
    return res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ erro: "Algo de errado aconteceu. Tente novamente mais tarde." });
    console.log(error);
  }
}

module.exports = { listProducts };
