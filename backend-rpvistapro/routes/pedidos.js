// routes/pedidos.js
import express from "express";
import mongoose from "mongoose";
import Pedido from "../models/Pedido.js";
import Estoque from "../models/Estoque.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();

/** Obtém o ObjectId do comprador a partir de pedido.empresa (pode ser nome ou _id). */
async function getCompradorIdFromEmpresa(empresa) {
  if (!empresa) return null;
  const str = (empresa + "").trim();
  if (mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str) {
    const user = await Usuario.findOne({ _id: str, tipo: "comprador" }).lean();
    return user ? user._id : null;
  }
  const user = await Usuario.findOne({ nome: str, tipo: "comprador" }).lean();
  return user ? user._id : null;
}

// 🆕 Criar novo pedido (comprador envia do Resumo da Cotação)
router.post("/", async (req, res) => {
  try {
    const { clienteNome, empresa, fornecedor, itens, total, status } = req.body;
    const empresaNome = (empresa || clienteNome || "").toString().trim();
    const fornecedorNome = (fornecedor || "").toString().trim();
    if (!fornecedorNome) {
      return res.status(400).json({ error: "Fornecedor é obrigatório." });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Itens do pedido são obrigatórios." });
    }

    const itensNorm = itens.map((i) => ({
      nome: (i.nome || "").toString().trim(),
      unidade: (i.unidade || "un").toString().trim(),
      quantidade: Number(i.quantidade) || 0,
      precoUnitario: Number(i.precoUnitario) || Number(i.preco) || 0,
    }));

    const totalCalc = itensNorm.reduce(
      (s, i) => s + i.quantidade * i.precoUnitario,
      0
    );

    const doc = new Pedido({
      empresa: empresaNome || "Comprador",
      fornecedor: fornecedorNome,
      itens: itensNorm,
      total: Number(total) || totalCalc,
      status: (status || "Enviado").toString().trim(),
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    console.error("❌ Erro ao salvar pedido:", error);
    res.status(500).json({ error: error.message || "Erro ao salvar pedido" });
  }
});

// 📋 Listar pedidos (com filtro opcional por fornecedor ou empresa)
router.get("/", async (req, res) => {
  try {
    const { fornecedor, empresa } = req.query;
    const filter = {};
    if (fornecedor && (fornecedor + "").trim()) filter.fornecedor = (fornecedor + "").trim();
    if (empresa && (empresa + "").trim()) filter.empresa = (empresa + "").trim();

    const pedidos = await Pedido.find(filter).sort({ createdAt: -1 }).lean();
    res.json(pedidos);
  } catch (error) {
    console.error("❌ Erro ao listar pedidos:", error);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
});

// 📌 DELETE item do pedido (rota mais específica antes de /:id)
router.delete("/:id/itens/:itemId", async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
    pedido.itens = (pedido.itens || []).filter(
      (it) => String(it._id) !== String(req.params.itemId)
    );
    pedido.total = pedido.itens.reduce(
      (s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0),
      0
    );
    await pedido.save();
    res.json(pedido);
  } catch (error) {
    console.error("❌ Erro ao remover item:", error);
    res.status(500).json({ error: "Erro ao remover item do pedido" });
  }
});

// 📌 POST avaliar pedido (rota mais específica antes de /:id)
router.post("/:id/avaliar", async (req, res) => {
  try {
    const { nota, comentario } = req.body || {};
    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      {
        avaliacao: {
          nota: Number(nota) || 0,
          comentario: (comentario || "").toString().trim(),
          data: new Date(),
        },
      },
      { new: true }
    ).lean();
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
    res.json(pedido);
  } catch (error) {
    console.error("❌ Erro ao avaliar pedido:", error);
    res.status(500).json({ error: "Erro ao avaliar pedido" });
  }
});

// 📌 POST marcar pedido como recebido (comprador) → concluído, baixa em trânsito para quantidade
router.post("/:id/receber", async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id).lean();
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
    const statusAtual = (pedido.status || "").toString().trim().toLowerCase();
    if (statusAtual !== "aprovado") {
      return res.status(400).json({
        error: "Só é possível marcar como recebido um pedido já aprovado pelo fornecedor.",
      });
    }

    const compradorId = await getCompradorIdFromEmpresa(pedido.empresa);
    if (!compradorId) {
      return res.status(400).json({ error: "Comprador do pedido não identificado." });
    }

    const estoque = await Estoque.findOne({ empresa: compradorId });
    if (!estoque) {
      return res.status(404).json({ error: "Estoque do comprador não encontrado." });
    }

    for (const item of pedido.itens || []) {
      const nome = (item.nome || "").toString().trim();
      const qtd = Number(item.quantidade) || 0;
      if (!nome || qtd <= 0) continue;
      const idx = estoque.itens.findIndex((i) => (i.nome || "").toLowerCase() === nome.toLowerCase());
      if (idx >= 0) {
        const reg = estoque.itens[idx];
        const emTransitoAtual = Number(reg.emTransito) || 0;
        reg.emTransito = Math.max(0, emTransitoAtual - qtd);
        reg.quantidade = (Number(reg.quantidade) || 0) + qtd;
        reg.ultimaAtualizacao = new Date();
        reg.ultimaEntrada = {
          fornecedor: pedido.fornecedor || "",
          nf: "",
          quantidade: qtd,
          data: new Date(),
        };
      }
    }
    await estoque.save();

    const pedidoAtualizado = await Pedido.findByIdAndUpdate(
      req.params.id,
      { status: "Concluído", dataRecebimento: new Date() },
      { new: true }
    ).lean();

    console.log(`✅ Pedido ${pedido._id} marcado como recebido (concluído).`);
    res.json(pedidoAtualizado);
  } catch (error) {
    console.error("❌ Erro ao marcar pedido como recebido:", error);
    res.status(500).json({ error: "Erro ao marcar pedido como recebido" });
  }
});

// 📌 GET por ID
router.get("/:id", async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id).lean();
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
    res.json(pedido);
  } catch (error) {
    console.error("❌ Erro ao buscar pedido:", error);
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
});

// 📌 PUT atualizar pedido (ex.: fornecedor aprova ou altera status)
router.put("/:id", async (req, res) => {
  try {
    const pedidoAntes = await Pedido.findById(req.params.id).lean();
    if (!pedidoAntes) return res.status(404).json({ error: "Pedido não encontrado." });

    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).lean();
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });

    // Quando o status passa a "Aprovado", somar itens ao emTransito do estoque do comprador
    const novoStatus = (pedido.status || "").toString().trim();
    const eraAprovado = (pedidoAntes.status || "").toString().trim().toLowerCase() === "aprovado";
    if (novoStatus.toLowerCase() === "aprovado" && !eraAprovado && Array.isArray(pedido.itens) && pedido.itens.length > 0) {
      const compradorId = await getCompradorIdFromEmpresa(pedido.empresa);
      if (compradorId) {
        let estoque = await Estoque.findOne({ empresa: compradorId });
        if (!estoque) {
          estoque = new Estoque({ empresa: compradorId, itens: [] });
          await estoque.save();
        }
        for (const item of pedido.itens) {
          const nome = (item.nome || "").toString().trim();
          const qtd = Number(item.quantidade) || 0;
          if (!nome || qtd <= 0) continue;
          const idx = estoque.itens.findIndex((i) => (i.nome || "").toLowerCase() === nome.toLowerCase());
          if (idx >= 0) {
            estoque.itens[idx].emTransito = (Number(estoque.itens[idx].emTransito) || 0) + qtd;
          } else {
            estoque.itens.push({
              nome,
              unidade: (item.unidade || "un").toString().trim(),
              quantidade: 0,
              minimo: 0,
              maximo: 0,
              emTransito: qtd,
              contagemReal: 0,
              ultimaAtualizacao: null,
              ultimaEntrada: {},
            });
          }
        }
        await estoque.save();
        console.log(`📦 Em trânsito atualizado para comprador ${compradorId} (pedido ${pedido._id})`);
      }
    }

    res.json(pedido);
  } catch (error) {
    console.error("❌ Erro ao atualizar pedido:", error);
    res.status(500).json({ error: "Erro ao atualizar pedido" });
  }
});

// 📌 DELETE pedido
router.delete("/:id", async (req, res) => {
  try {
    const pedido = await Pedido.findByIdAndDelete(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
    res.json({ message: "Pedido excluído." });
  } catch (error) {
    console.error("❌ Erro ao excluir pedido:", error);
    res.status(500).json({ error: "Erro ao excluir pedido" });
  }
});

export default router;