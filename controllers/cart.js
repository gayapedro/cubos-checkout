const fs = require("fs/promises");

function updateCart(objetoCarrinho, quantidade, preco) {
  const dataAtual = new Date();
  dataAtual.setDate(dataAtual.getDate() + 15);
  objetoCarrinho.subtotal += preco * quantidade;
  objetoCarrinho.valorDoFrete = objetoCarrinho.subtotal <= 20000 ? 5000 : 0;
  objetoCarrinho.dataDeEntrega = dataAtual;
  objetoCarrinho.totalAPagar =
    objetoCarrinho.subtotal + objetoCarrinho.valorDoFrete;
  return objetoCarrinho;
}

async function listCart(req, res) {
  try {
    const response = await fs.readFile(__dirname + "/../cart.json");
    const objeto = JSON.parse(response);
    res.status(200).json(objeto);
  } catch (error) {
    res
      .status(500)
      .json({ erro: "Algo de errado aconteceu. Tente novamente mais tarde." });
    console.log(error);
  }
}

async function addProductToCart(req, res) {
  const { id, quantidade } = req.body;
  if (id && quantidade && !isNaN(id) && !isNaN(quantidade)) {
    const idTratado = Number(id);
    const qtdTratado = Number(quantidade);
    if (qtdTratado > 0) {
      try {
        const estoque = await fs.readFile(__dirname + "/../data.json");
        const objetoEstoque = JSON.parse(estoque);
        const responseEstoque = objetoEstoque.produtos.find(
          item => item.id === idTratado
        );
        if (!responseEstoque) {
          return res.status(404).json({ mensagem: "Esse produto não existe!" });
        }
        if (qtdTratado <= responseEstoque.estoque) {
          const leituraCarrinho = await fs.readFile(
            __dirname + "/../cart.json"
          );
          let objetoCarrinho = JSON.parse(leituraCarrinho);
          objetoCarrinho = updateCart(
            objetoCarrinho,
            qtdTratado,
            responseEstoque.preco
          );
          if (
            objetoCarrinho.produtos.find(item => item.id === responseEstoque.id)
          ) {
            //produto no carrinho, usar patch para alterar
            return res
              .status(400)
              .json({ mensagem: "Produto já adicionado ao carrinho." });
          } else {
            //adiciona produto novo ao carrinho
            const novoObjeto = {
              id: responseEstoque.id,
              nome: responseEstoque.nome,
              preco: responseEstoque.preco,
              quantidade: qtdTratado,
              categoria: responseEstoque.categoria,
            };
            objetoCarrinho.produtos.push(novoObjeto);
          }

          await fs.writeFile(
            __dirname + "/../cart.json",
            JSON.stringify(objetoCarrinho, null, "  ")
          );
          return res.status(201).json(objetoCarrinho);
        } else {
          res
            .status(404)
            .json({ mensagem: "Esse produto não tem estoque suficiente!" });
        }
      } catch (error) {
        res.status(500).json({
          erro: "Algo de errado aconteceu. Tente novamente mais tarde.",
        });
        console.log(error);
      }
    } else {
      return res.status(400).json({
        mensagem: "A quantidade deve ser um número positivo.",
      });
    }
  } else {
    return res.status(400).json({
      mensagem:
        "É preciso passar id e quantidade do produto! Ambos devem ser um número.",
    });
  }
}

async function patchProduct(req, res) {
  const { idProduto } = req.params;
  const { quantidade } = req.body;
  if (!isNaN(idProduto) && !isNaN(quantidade)) {
    const idTratado = Number(idProduto);
    const qtdTratado = Number(quantidade);
    try {
      const respostaCarrinho = await fs.readFile(__dirname + "/../cart.json");
      let objetoCarrinho = JSON.parse(respostaCarrinho);
      const produtoAlterar = objetoCarrinho.produtos.filter(
        item => item.id === idTratado
      );
      const indice = objetoCarrinho.produtos.indexOf(produtoAlterar[0]);
      if (indice !== -1) {
        const respostaEstoque = await fs.readFile(__dirname + "/../data.json");
        const objetoEstoque = JSON.parse(respostaEstoque);
        const produto = objetoEstoque.produtos.filter(
          item => item.id === idTratado
        );
        if (
          produto[0].estoque >= qtdTratado + produtoAlterar[0].quantidade &&
          qtdTratado > 0
        ) {
          produtoAlterar[0].quantidade += qtdTratado;
          objetoCarrinho = updateCart(
            objetoCarrinho,
            qtdTratado,
            produtoAlterar[0].preco
          );
          await fs.writeFile(
            __dirname + "/../cart.json",
            JSON.stringify(objetoCarrinho, null, "  ")
          );
          return res.status(200).json(objetoCarrinho);
        } else if (
          qtdTratado < 0 &&
          produtoAlterar[0].quantidade >= Math.abs(qtdTratado)
        ) {
          produtoAlterar[0].quantidade += qtdTratado;
          objetoCarrinho = updateCart(
            objetoCarrinho,
            qtdTratado,
            produtoAlterar[0].preco
          );
          if (produtoAlterar[0].quantidade === 0) {
            objetoCarrinho.produtos.splice(indice, 1);
            if (objetoCarrinho.produtos.length === 0) {
              objetoCarrinho.dataDeEntrega = null;
              objetoCarrinho.valorDoFrete = 0;
              objetoCarrinho.totalAPagar = 0;
            }
          }
          await fs.writeFile(
            __dirname + "/../cart.json",
            JSON.stringify(objetoCarrinho, null, "  ")
          );
          return res.status(200).json(objetoCarrinho);
        } else if (
          qtdTratado < 0 &&
          produtoAlterar[0].quantidade < qtdTratado
        ) {
          res.status(404).json({
            mensagem: "Você está tentando remover mais que o possível!",
          });
        } else {
          res
            .status(404)
            .json({ mensagem: "Esse produto não tem estoque suficiente!" });
        }
      } else {
        return res
          .status(404)
          .json({ mensagem: "Esse produto não está no carrinho!" });
      }
    } catch (error) {
      res.status(500).json({
        erro: "Algo de errado aconteceu. Tente novamente mais tarde.",
      });
      console.log(error);
    }
  } else {
    res
      .status(400)
      .json({ mensagem: "O id e a quantidade informado devem ser um número." });
  }
}

async function deleteProduct(req, res) {
  const { idProduto } = req.params;
  if (!isNaN(idProduto)) {
    const idTratado = Number(idProduto);
    try {
      const responseCarrinho = await fs.readFile(__dirname + "/../cart.json");
      let objetoCarrinho = JSON.parse(responseCarrinho);
      const produtoRemover = objetoCarrinho.produtos.filter(
        item => item.id === idTratado
      );
      const indice = objetoCarrinho.produtos.indexOf(produtoRemover[0]);
      if (indice !== -1) {
        objetoCarrinho = updateCart(
          objetoCarrinho,
          produtoRemover[0].quantidade,
          produtoRemover[0].preco * -1
        );
        objetoCarrinho.produtos.splice(indice, 1);
        if (objetoCarrinho.produtos.length === 0) {
          objetoCarrinho.dataDeEntrega = null;
          objetoCarrinho.valorDoFrete = 0;
          objetoCarrinho.totalAPagar = 0;
        }
        await fs.writeFile(
          __dirname + "/../cart.json",
          JSON.stringify(objetoCarrinho, null, "  ")
        );
        return res.status(201).json(objetoCarrinho);
      } else {
        return res
          .status(404)
          .json({ mensagem: "Esse produto não está no carrinho!" });
      }
    } catch (error) {
      res.status(500).json({
        erro: "Algo de errado aconteceu. Tente novamente mais tarde.",
      });
      console.log(error);
    }
  } else {
    return res
      .status(400)
      .json({ mensagem: "O id informado deve ser um número." });
  }
}

async function deleteCart(req, res) {
  try {
    const responseCarrinho = await fs.readFile(__dirname + "/../cart.json");
    const objetoCarrinho = JSON.parse(responseCarrinho);
    objetoCarrinho.produtos = [];
    objetoCarrinho.subtotal = 0;
    objetoCarrinho.dataDeEntrega = null;
    objetoCarrinho.valorDoFrete = 0;
    objetoCarrinho.totalAPagar = 0;
    await fs.writeFile(
      __dirname + "/../cart.json",
      JSON.stringify(objetoCarrinho, null, "  ")
    );
    return res
      .status(200)
      .json({ mensagem: "O carrinho foi limpo com sucesso." });
  } catch (error) {
    res.status(500).json({
      erro: "Algo de errado aconteceu. Tente novamente mais tarde.",
    });
    console.log(error);
  }
}

module.exports = {
  listCart,
  addProductToCart,
  patchProduct,
  deleteProduct,
  deleteCart,
};
