import express from "express";
import mongoose from "mongoose";
import FichaTecnica from "../models/FichaTecnica.js";
import Estoque from "../models/Estoque.js";

const router = express.Router();

// Listar fichas da empresa
router.get("/", async (req, res) => {
  try {
    const { empresa } = req.query;
    if (!empresa) {
      return res.status(400).json({ error: "empresa é obrigatório." });
    }
    const lista = await FichaTecnica.find({ empresa }).sort({ nome: 1 }).lean();
    res.json(lista);
  } catch (err) {
    console.error("❌ Erro ao listar fichas técnicas:", err);
    res.status(500).json({ error: "Erro ao listar fichas técnicas." });
  }
});

// Buscar uma ficha
router.get("/:id", async (req, res) => {
  try {
    const ficha = await FichaTecnica.findById(req.params.id).lean();
    if (!ficha) return res.status(404).json({ error: "Ficha técnica não encontrada." });
    res.json(ficha);
  } catch (err) {
    console.error("❌ Erro ao buscar ficha:", err);
    res.status(500).json({ error: "Erro ao buscar ficha." });
  }
});

// Criar ficha
router.post("/", async (req, res) => {
  try {
    const { empresa, nome, descricao, rendimento, itens } = req.body;
    if (!empresa || !nome) {
      return res.status(400).json({ error: "empresa e nome são obrigatórios." });
    }
    const itensNorm = (Array.isArray(itens) ? itens : []).map((i) => ({
      nome: (i.nome || "").trim(),
      unidade: (i.unidade || "un").trim(),
      quantidade: Number(i.quantidade) || 0,
    })).filter((i) => i.nome && i.quantidade > 0);

    const nova = await FichaTecnica.create({
      empresa,
      nome: (nome || "").trim(),
      descricao: (descricao || "").trim(),
      rendimento: (rendimento || "1 unidade").trim(),
      itens: itensNorm,
    });
    res.status(201).json(nova);
  } catch (err) {
    console.error("❌ Erro ao criar ficha técnica:", err);
    res.status(500).json({ error: "Erro ao criar ficha técnica." });
  }
});

// Atualizar ficha
router.put("/:id", async (req, res) => {
  try {
    const { nome, descricao, rendimento, itens } = req.body;
    const itensNorm = (Array.isArray(itens) ? itens : []).map((i) => ({
      nome: (i.nome || "").trim(),
      unidade: (i.unidade || "un").trim(),
      quantidade: Number(i.quantidade) || 0,
    })).filter((i) => i.nome && i.quantidade > 0);

    const atualizada = await FichaTecnica.findByIdAndUpdate(
      req.params.id,
      {
        ...(nome != null && { nome: nome.trim() }),
        ...(descricao != null && { descricao: descricao.trim() }),
        ...(rendimento != null && { rendimento: rendimento.trim() }),
        ...(Array.isArray(itens) && { itens: itensNorm }),
      },
      { new: true }
    );
    if (!atualizada) return res.status(404).json({ error: "Ficha técnica não encontrada." });
    res.json(atualizada);
  } catch (err) {
    console.error("❌ Erro ao atualizar ficha técnica:", err);
    res.status(500).json({ error: "Erro ao atualizar ficha técnica." });
  }
});

// Excluir ficha
router.delete("/:id", async (req, res) => {
  try {
    const excluida = await FichaTecnica.findByIdAndDelete(req.params.id);
    if (!excluida) return res.status(404).json({ error: "Ficha técnica não encontrada." });
    res.json({ message: "Ficha técnica excluída." });
  } catch (err) {
    console.error("❌ Erro ao excluir ficha técnica:", err);
    res.status(500).json({ error: "Erro ao excluir ficha técnica." });
  }
});

// Aplicar ficha: dar baixa no estoque conforme a composição (quantidade = multiplicador, ex. 5 porções)
router.post("/:id/aplicar", async (req, res) => {
  try {
    const { quantidade } = req.body; // ex.: 5 (para 5 porções)
    const multiplicador = Number(quantidade);
    if (!Number.isFinite(multiplicador) || multiplicador <= 0) {
      return res.status(400).json({ error: "Informe uma quantidade válida (ex.: 5 para 5 porções)." });
    }

    const ficha = await FichaTecnica.findById(req.params.id).lean();
    if (!ficha) return res.status(404).json({ error: "Ficha técnica não encontrada." });

    const empresaId = mongoose.Types.ObjectId.isValid(ficha.empresa)
      ? new mongoose.Types.ObjectId(ficha.empresa)
      : ficha.empresa;

    const estoque = await Estoque.findOne({ empresa: empresaId });
    if (!estoque || !Array.isArray(estoque.itens)) {
      return res.status(404).json({ error: "Estoque não encontrado." });
    }

    const mapaEstoque = new Map();
    estoque.itens.forEach((i) => {
      const chave = `${(i.nome || "").toLowerCase()}::${(i.unidade || "un").toLowerCase()}`;
      mapaEstoque.set(chave, { item: i, quantidade: Number(i.quantidade) || 0 });
    });

    const faltando = [];
    for (const it of ficha.itens || []) {
      const nome = (it.nome || "").trim();
      const unidade = (it.unidade || "un").trim();
      const qtdNecessaria = (Number(it.quantidade) || 0) * multiplicador;
      const chave = `${nome.toLowerCase()}::${unidade.toLowerCase()}`;
      const reg = mapaEstoque.get(chave);
      if (!reg) {
        faltando.push({ nome, unidade, necessario: qtdNecessaria, disponivel: 0 });
        continue;
      }
      if (qtdNecessaria > reg.quantidade) {
        faltando.push({ nome, unidade, necessario: qtdNecessaria, disponivel: reg.quantidade });
      }
    }

    if (faltando.length > 0) {
      return res.status(400).json({
        error: "Estoque insuficiente para aplicar esta ficha na quantidade informada.",
        faltando,
      });
    }

    // Dar baixa
    for (const it of ficha.itens || []) {
      const nome = (it.nome || "").trim();
      const unidade = (it.unidade || "un").trim();
      const qtdBaixa = (Number(it.quantidade) || 0) * multiplicador;
      const itemEstoque = estoque.itens.find(
        (i) =>
          (i.nome || "").toLowerCase() === nome.toLowerCase() &&
          (i.unidade || "un").toLowerCase() === unidade.toLowerCase()
      );
      if (itemEstoque) {
        itemEstoque.quantidade = Math.max(0, (Number(itemEstoque.quantidade) || 0) - qtdBaixa);
        itemEstoque.ultimaAtualizacao = new Date();
      }
    }

    estoque.markModified("itens");
    await estoque.save();

    res.json({
      message: `Ficha "${ficha.nome}" aplicada (${multiplicador} un.). Baixa realizada no estoque.`,
      ficha: ficha.nome,
      quantidade: multiplicador,
    });
  } catch (err) {
    console.error("❌ Erro ao aplicar ficha técnica:", err);
    res.status(500).json({ error: "Erro ao aplicar ficha técnica." });
  }
});

export default router;
