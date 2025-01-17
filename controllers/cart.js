const fs = require("fs/promises");
const pagarme = require("../services/pagarme");

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
    const objetoCarrinho = JSON.parse(await fs.readFile("./data/cart.json"));
    res.status(200).json(objetoCarrinho);
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
        const objetoEstoque = JSON.parse(await fs.readFile("./data/data.json"));
        const responseEstoque = objetoEstoque.produtos.find(
          item => item.id === idTratado
        );
        if (!responseEstoque) {
          return res.status(404).json({ mensagem: "Esse produto não existe!" });
        }
        if (qtdTratado <= responseEstoque.estoque) {
          let objetoCarrinho = JSON.parse(
            await fs.readFile("./data/cart.json")
          );
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
            "./data/cart.json",
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
      let objetoCarrinho = JSON.parse(await fs.readFile("./data/cart.json"));
      const produtoAlterar = objetoCarrinho.produtos.filter(
        item => item.id === idTratado
      );
      const indice = objetoCarrinho.produtos.indexOf(produtoAlterar[0]);
      if (indice !== -1) {
        const objetoEstoque = JSON.parse(await fs.readFile("./data/data.json"));
        const produto = objetoEstoque.produtos.filter(
          item => item.id === idTratado
        );
        if (
          (produto[0].estoque >= qtdTratado + produtoAlterar[0].quantidade &&
            qtdTratado > 0) ||
          (qtdTratado < 0 &&
            produtoAlterar[0].quantidade >= Math.abs(qtdTratado))
        ) {
          //altera a quantidade no carrinho
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
            "./data/cart.json",
            JSON.stringify(objetoCarrinho, null, "  ")
          );
          return res.status(200).json(objetoCarrinho);
        } else if (
          qtdTratado < 0 &&
          produtoAlterar[0].quantidade < Math.abs(qtdTratado)
        ) {
          // trata caso o número a remover seja maior que o número no carrinho
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
      let objetoCarrinho = JSON.parse(await fs.readFile("./data/cart.json"));
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
          "./data/cart.json",
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
    const objetoCarrinho = JSON.parse(await fs.readFile("./data/cart.json"));
    objetoCarrinho.produtos = [];
    objetoCarrinho.subtotal = 0;
    objetoCarrinho.dataDeEntrega = null;
    objetoCarrinho.valorDoFrete = 0;
    objetoCarrinho.totalAPagar = 0;
    await fs.writeFile(
      "./data/cart.json",
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

async function finishCart(req, res) {
  let objetoCarrinho = JSON.parse(await fs.readFile("./data/cart.json"));
  const objetoEstoque = JSON.parse(await fs.readFile("./data/data.json"));
  // verifica se carrinho está vazio
  if (objetoCarrinho.produtos.length === 0) {
    return res.status(400).json({ mensagem: "O carrinho está vazio." });
  }
  //verifica se existe quantidade solicitada
  for (const produto of objetoCarrinho.produtos) {
    const registroEstoque = objetoEstoque.produtos.find(
      item => item.id === produto.id
    );
    if (produto.quantidade > registroEstoque.estoque) {
      return res.status(404).json({
        mensagem: `O produto ${produto.nome} não possui a quantidade solicitada em estoque.`,
      });
    }
  }
  const { type, country, name, documents } = req.body;
  if (type && country && name && documents[0].type && documents[0].number) {
    if (type !== "individual")
      return res
        .status(400)
        .json({ mensagem: "O cliente deve ser pessoa física." });
    else if (country.length !== 2)
      return res.status(400).json({
        mensagem: "O campo country deve ser o código do país (2 caracteres).",
      });
    else if (name.split(" ").length < 2)
      return res.status(400).json({
        mensagem: "O campo name deve conter, pelo menos, nome e sobrenome.",
      });
    else if (documents[0].type !== "cpf")
      return res.status(400).json({
        mensagem: "O campo documents deve conter um cpf.",
      });
    else if (documents[0].number.length !== 11)
      return res.status(400).json({
        mensagem: "O campo documents deve conter um cpf de 11 dígitos.",
      });
    for (const digito of documents[0].number) {
      if (isNaN(digito)) {
        return res.status(400).json({
          mensagem: "O campo documents deve conter um cpf apenas numérico.",
        });
      }
    }
    try {
      const objetoCarrinho = JSON.parse(await fs.readFile("./data/cart.json"));
      const objetoEstoque = JSON.parse(await fs.readFile("./data/data.json"));
      for (const produto of objetoCarrinho.produtos) {
        const produtoBaixa = objetoEstoque.produtos.find(
          item => item.id === produto.id
        );
        produtoBaixa.estoque -= produto.quantidade;
      }
      const { produtos, totalAPagar } = objetoCarrinho;
      objetoCarrinho.produtos = [];
      objetoCarrinho.subtotal = 0;
      objetoCarrinho.dataDeEntrega = null;
      objetoCarrinho.valorDoFrete = 0;
      objetoCarrinho.totalAPagar = 0;
      const data = new Date();
      data.setDate(data.getDate() + 3);
      const stringData = `${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
      const objetoPagarme = {
        amount: totalAPagar,
        payment_method: "boleto",
        boleto_expiration_date: stringData,
        customer: {
          external_id: "1",
          name,
          type,
          country,
          email: "test@gmail.com",
          documents: [
            {
              type: documents[0].type,
              number: documents[0].number,
            },
          ],
          phone_numbers: ["+5571983176317"],
          birthday: "1994-01-09",
        },
      };

      try {
        const pedido = await pagarme.post("transactions", objetoPagarme);
        const pedidoFinalizado = {
          id: pedido.data.id,
          dataVenda: pedido.data.date_created,
          produtos: produtos,
          valorVenda: pedido.data.amount,
          linkBoleto: pedido.data.boleto_url,
        };
        const objetoVendas = JSON.parse(await fs.readFile("./data/sales.json"));
        objetoVendas.push(pedidoFinalizado);
        await fs.writeFile(
          "./data/sales.json",
          JSON.stringify(objetoVendas, null, "  ")
        );
        await fs.writeFile(
          "./data/data.json",
          JSON.stringify(objetoEstoque, null, "  ")
        );
        await fs.writeFile(
          "./data/cart.json",
          JSON.stringify(objetoCarrinho, null, "  ")
        );
        return res.status(200).json(pedidoFinalizado);
      } catch (error) {
        console.log(error.response.data);
        res.status(500).json({ mensagem: "Erro ao gerar boleto," });
      }
    } catch (error) {
      res.status(500).json({
        erro: "Algo de errado aconteceu. Tente novamente mais tarde.",
      });
      console.log(error);
    }
  } else {
    return res.status(400).json({ mensagem: "Dados do cliente incompletos." });
  }
}

module.exports = {
  listCart,
  addProductToCart,
  patchProduct,
  deleteProduct,
  deleteCart,
  finishCart,
};
