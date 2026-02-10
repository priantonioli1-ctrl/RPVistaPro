// controllers/estoqueController.js
import Estoque from "../models/Estoque.js";

/**
 * 🔹 LISTAR ESTOQUE DA EMPRESA
 * Retorna apenas o array de itens
 */
export async function listarEstoque(req, res) {
  try {
    const { compradorId } = req.params;

    let estoque = await Estoque.findOne({ empresa: compradorId });

    if (!estoque) {
      return res.json([]); // empresa ainda sem estoque
    }

    return res.json(estoque.itens);
  } catch (err) {
    console.error("❌ Erro ao listar estoque:", err);
    res.status(500).json({ error: "Erro ao listar estoque" });
  }
}

/**
 * 🔹 ATUALIZAR UM ITEM DO ESTOQUE
 * Atualiza um item dentro do array itens[] da empresa
 */
export async function atualizarItem(req, res) {
  try {
    const { compradorId } = req.params;
    const item = req.body;

    let estoque = await Estoque.findOne({ empresa: compradorId });

    if (!estoque) {
      return res.status(404).json({
        error: "Estoque não encontrado para esta empresa",
      });
    }

    const index = estoque.itens.findIndex((i) => i.nome === item.nome);

    if (index === -1) {
      // Item novo → adiciona
      estoque.itens.push(item);
    } else {
      // Item existente → atualiza
      estoque.itens[index] = item;
    }

    await estoque.save();

    return res.json(
      estoque.itens[index] || item
    );
  } catch (err) {
    console.error("❌ Erro ao atualizar item do estoque:", err);
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
}

/**
 * 🔹 REGISTRAR ENTRADA NO ESTOQUE
 * Atualiza quantidade, última atualização e informações da NF
 */
export async function registrarEntrada(req, res) {
  try {
    const { compradorId } = req.params;
    const { produto, quantidade, fornecedor, nf } = req.body;

    let estoque = await Estoque.findOne({ empresa: compradorId });

    if (!estoque) {
      return res.status(404).json({ error: "Estoque não encontrado" });
    }

    const item = estoque.itens.find((i) => i.nome === produto);

    if (!item) {
      return res.status(404).json({
        error: `Produto "${produto}" não encontrado no estoque`,
      });
    }

    item.quantidade += Number(quantidade);
    item.ultimaAtualizacao = new Date();
    item.ultimaEntrada = {
      fornecedor,
      nf,
      quantidade,
      data: new Date(),
    };

    await estoque.save();

    return res.json(item);
  } catch (err) {
    console.error("❌ Erro ao registrar entrada:", err);
    res.status(500).json({ error: "Erro ao registrar entrada" });
  }
}

/**
 * 🔹 RECRIAR ESTOQUE A PARTIR DO CATÁLOGO
 * Usado quando estoque está vazio ou precisa sincronizar
 */
export async function reconstruirEstoque(req, res) {
  try {
    const { compradorId } = req.params;
    const { itens } = req.body; // receber itens do catálogo

    if (!Array.isArray(itens)) {
      return res.status(400).json({ error: "Lista de itens inválida" });
    }

    let estoque = await Estoque.findOne({ empresa: compradorId });

    if (!estoque) {
      estoque = new Estoque({
        empresa: compradorId,
        itens,
      });
    } else {
      estoque.itens = itens;
    }

    await estoque.save();

    res.json({
      message: "Estoque recriado com sucesso!",
      itens: estoque.itens.length,
    });
  } catch (err) {
    console.error("❌ Erro ao reconstruir estoque:", err);
    res.status(500).json({ error: "Erro ao reconstruir estoque" });
  }
}

/**
 * 🔹 SALVAR ESTOQUE COMPLETO (usado quando o comprador clica em "Salvar Estoque")
 */
export async function salvarEstoque(req, res) {
  try {
    const { compradorId } = req.params;
    const { itens } = req.body;

    if (!Array.isArray(itens)) {
      return res.status(400).json({
        error: "Formato inválido. 'itens' deve ser uma lista.",
      });
    }

    let estoque = await Estoque.findOne({ empresa: compradorId });

    if (!estoque) {
      estoque = new Estoque({
        empresa: compradorId,
        itens,
      });
    } else {
      estoque.itens = itens;
    }

    await estoque.save();

    res.json({
      message: "Estoque salvo com sucesso!",
      quantidade: estoque.itens.length,
    });
  } catch (err) {
    console.error("❌ Erro ao salvar estoque:", err);
    res.status(500).json({ error: "Erro ao salvar estoque" });
  }
}