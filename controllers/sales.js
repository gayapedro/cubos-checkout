const fs = require("fs/promises");

async function listSales(req, res) {
  const { produto, categoria, dataInicial, dataFinal } = req.query;
  let dataInicialTimestamp = 0;
  let dataFinalTimestamp = 0;
  if (dataInicial) {
    const arrayData = dataInicial.split("-");
    dataInicialTimestamp = new Date(
      Number(arrayData[0]),
      Number(arrayData[1]) - 1,
      Number(arrayData[2])
    ).getTime();
  } else {
    dataInicialTimestamp = 0;
  }
  if (dataFinal) {
    const arrayData = dataFinal.split("-");
    dataFinalTimestamp = new Date(
      Number(arrayData[0]),
      Number(arrayData[1]) - 1,
      Number(arrayData[2])
    ).getTime();
  } else {
    dataFinalTimestamp = Infinity;
  }
  try {
    const responseSales = await fs.readFile(__dirname + "/../sales.json");
    const objetoSales = JSON.parse(responseSales);
    const responseEstoque = await fs.readFile(__dirname + "/../data.json");
    const objetoEstoque = JSON.parse(responseEstoque);
    if (!produto && !categoria && !dataInicial && !dataFinal) {
      return res.status(200).json(objetoSales);
    } else if (produto && !isNaN(produto)) {
      const produtoEstoque = objetoEstoque.produtos.find(
        item => item.id === Number(produto)
      );
      if (!produtoEstoque) {
        return res.status(404).json({ mensagem: "Esse produto não existe!" });
      }
      const respostaProduto = {
        relatorioProduto: {
          id: Number(produto),
          produto: produtoEstoque.nome,
          quantidadeVendida: 0,
          valorAcumuladoEmVendas: 0,
        },
      };
      for (const venda of objetoSales) {
        const dataVenda = new Date(venda.dataVenda).getTime();
        if (
          dataVenda >= dataInicialTimestamp &&
          dataVenda <= dataFinalTimestamp
        ) {
          const prod = venda.produtos[0].find(
            item => item.id === Number(produto)
          );
          console.log(venda.produtos[0]);
          if (prod) {
            respostaProduto.relatorioProduto.quantidadeVendida +=
              prod.quantidade;
            respostaProduto.relatorioProduto.valorAcumuladoEmVendas +=
              prod.preco * prod.quantidade;
          }
        }
      }
      return res.status(200).json(respostaProduto);
    }
  } catch (error) {
    res.status(500).json({
      erro: "Algo de errado aconteceu. Tente novamente mais tarde.",
    });
    console.log(error);
  }
}

module.exports = { listSales };
