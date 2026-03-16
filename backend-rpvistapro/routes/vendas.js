// routes/vendas.js — Vendas do Frente de Loja com baixa automática no estoque
// Reforma Tributária (EC 132/2023): IBS/CBS fase transição 2026
import express from "express";
import mongoose from "mongoose";
import Venda from "../models/Venda.js";
import Estoque from "../models/Estoque.js";
import Caixa from "../models/Caixa.js";
import { calcularImpostosReforma } from "../services/reformaTributaria.js";

const CAT_PADRAO = "ALÍQUOTA_PADRÃO";

const router = express.Router();

// POST /api/vendas — Registrar venda e dar baixa no estoque
router.post("/", async (req, res) => {
  try {
    const { empresa, itens, formaPagamento, desconto, operador, observacoes } = req.body;

    if (!empresa || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "empresa e itens são obrigatórios." });
    }

    const empresaId = mongoose.Types.ObjectId.isValid(empresa) ? new mongoose.Types.ObjectId(empresa) : null;
    if (!empresaId) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }

    const itensFormatados = itens.map((i) => {
      const qtd = Number(i.quantidade) || 0;
      const preco = Number(i.precoUnitario) || 0;
      const subtotal = qtd * preco;
      const categoriaTrib = (i.categoriaTributaria || CAT_PADRAO).trim();
      const impostos = calcularImpostosReforma(subtotal, categoriaTrib);
      return {
        nome: String(i.nome || "").trim(),
        unidade: (i.unidade || "un").trim() || "un",
        quantidade: qtd,
        precoUnitario: preco,
        subtotal,
        categoriaTributaria: categoriaTrib,
        valorIBS: impostos.valorIBS,
        valorCBS: impostos.valorCBS,
      };
    }).filter((i) => i.nome && i.quantidade > 0);

    if (itensFormatados.length === 0) {
      return res.status(400).json({ error: "Nenhum item válido na venda." });
    }

    const subtotal = itensFormatados.reduce((s, i) => s + i.subtotal, 0);
    const totalIBS = itensFormatados.reduce((s, i) => s + (i.valorIBS || 0), 0);
    const totalCBS = itensFormatados.reduce((s, i) => s + (i.valorCBS || 0), 0);
    const descValor = Number(desconto) || 0;
    const total = Math.max(0, subtotal - descValor);

    const estoque = await Estoque.findOne({ empresa: empresaId });
    if (!estoque || !Array.isArray(estoque.itens)) {
      return res.status(404).json({ error: "Estoque não encontrado para esta empresa." });
    }

    const errosEstoque = [];
    for (const item of itensFormatados) {
      const nomeNorm = (item.nome || "").toLowerCase();
      const unidadeNorm = (item.unidade || "un").toLowerCase();
      const registro = estoque.itens.find(
        (e) =>
          (e.nome || "").toLowerCase() === nomeNorm &&
          ((e.unidade || "un").toLowerCase() === unidadeNorm)
      );
      if (registro) {
        const disp = Number(registro.quantidade) || 0;
        if (item.quantidade > disp) {
          errosEstoque.push(`"${item.nome}": disponível ${disp} ${item.unidade}, solicitado ${item.quantidade}`);
        }
      }
    }

    if (errosEstoque.length > 0) {
      return res.status(400).json({
        error: "Quantidade indisponível em estoque.",
        detalhes: errosEstoque,
      });
    }

    for (const item of itensFormatados) {
      const nomeNorm = (item.nome || "").toLowerCase();
      const unidadeNorm = (item.unidade || "un").toLowerCase();
      const registro = estoque.itens.find(
        (e) =>
          (e.nome || "").toLowerCase() === nomeNorm &&
          ((e.unidade || "un").toLowerCase() === unidadeNorm)
      );
      if (registro) {
        registro.quantidade = Math.max(0, (Number(registro.quantidade) || 0) - item.quantidade);
        registro.ultimaAtualizacao = new Date();
      }
    }

    estoque.markModified("itens");
    await estoque.save();

    const formaPgto = String(formaPagamento || "Dinheiro").trim();
    const caixaAberto = await Caixa.findOne({ empresa: empresaId, status: "aberto" }).lean();

    const venda = await Venda.create({
      empresa: empresaId,
      itens: itensFormatados,
      subtotal,
      desconto: descValor,
      total,
      totalIBS,
      totalCBS,
      formaPagamento: formaPgto,
      caixaId: caixaAberto?._id || null,
      operador: String(operador || "").trim(),
      observacoes: String(observacoes || "").trim(),
    });

    res.status(201).json({
      message: "Venda registrada e baixa no estoque realizada.",
      venda: venda.toObject(),
    });
  } catch (err) {
    console.error("❌ Erro ao registrar venda:", err);
    res.status(500).json({ error: "Erro interno ao registrar venda." });
  }
});

// GET /api/vendas — Listar vendas (opcional, para histórico)
router.get("/", async (req, res) => {
  try {
    const { empresa, limit = 50, offset = 0 } = req.query;
    if (!empresa) {
      return res.status(400).json({ error: "empresa é obrigatório." });
    }
    const empresaId = mongoose.Types.ObjectId.isValid(empresa) ? new mongoose.Types.ObjectId(empresa) : null;
    if (!empresaId) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }
    const lista = await Venda.find({ empresa: empresaId })
      .sort({ createdAt: -1 })
      .skip(Number(offset) || 0)
      .limit(Math.min(Number(limit) || 50, 200))
      .lean();
    const total = await Venda.countDocuments({ empresa: empresaId });
    res.json({ vendas: lista, total });
  } catch (err) {
    console.error("❌ Erro ao listar vendas:", err);
    res.status(500).json({ error: "Erro ao listar vendas." });
  }
});

export default router;
