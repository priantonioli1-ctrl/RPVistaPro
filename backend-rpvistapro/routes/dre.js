// routes/dre.js — DRE (Demonstração do Resultado do Exercício) e Despesas
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Venda from "../models/Venda.js";
import Despesa from "../models/Despesa.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "segredo123";

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não fornecido." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
}

function getEmpresaId(req) {
  return req.user?.compradorId || req.user?.empresa || req.user?.id || req.user?._id;
}

// GET /api/dre — Resumo DRE do período
router.get("/", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });

    const empresaObj = mongoose.Types.ObjectId.isValid(empresaId) ? new mongoose.Types.ObjectId(empresaId) : null;
    if (!empresaObj) return res.status(400).json({ error: "ID de empresa inválido." });

    let { inicio, fim } = req.query;
    const hoje = new Date();
    const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const dataInicio = inicio ? new Date(inicio) : iniMes;
    const dataFim = fim ? new Date(fim) : fimMes;

    // 1. Receita Bruta (vendas do período)
    const vendas = await Venda.find({
      empresa: empresaObj,
      createdAt: { $gte: dataInicio, $lte: dataFim },
    }).lean();

    const receitaBruta = vendas.reduce((s, v) => s + (v.total || 0), 0);
    const totalDescontos = vendas.reduce((s, v) => s + (v.desconto || 0), 0);

    // 2. Despesas por categoria
    const despesas = await Despesa.find({
      empresa: empresaObj,
      data: { $gte: dataInicio, $lte: dataFim },
    }).lean();

    const porCategoria = {};
    despesas.forEach((d) => {
      porCategoria[d.categoria] = (porCategoria[d.categoria] || 0) + d.valor;
    });

    const deducoes = porCategoria.deducoes || 0;
    const cmv = porCategoria.cmv || 0;
    const despesasVendas = porCategoria.vendas || 0;
    const despesasAdmin = porCategoria.administrativas || 0;
    const despesasFinanceiras = porCategoria.financeiras || 0;
    const receitaFinanceira = porCategoria.receita_financeira || 0;
    const irCsll = porCategoria.ir_csll || 0;
    const outras = porCategoria.outras || 0;

    const receitaLiquida = receitaBruta - deducoes;
    const lucroBruto = receitaLiquida - cmv;
    const despesasOperacionais = despesasVendas + despesasAdmin + outras;
    const lucroOperacional = lucroBruto - despesasOperacionais;
    const resultadoFinanceiro = receitaFinanceira - despesasFinanceiras;
    const lair = lucroOperacional + resultadoFinanceiro;
    const lucroLiquido = lair - irCsll;

    res.json({
      periodo: { inicio: dataInicio, fim: dataFim },
      dre: {
        receitaBruta,
        deducoes,
        receitaLiquida,
        cmv,
        lucroBruto,
        despesasVendas,
        despesasAdministrativas: despesasAdmin,
        outrasDespesas: outras,
        lucroOperacional,
        receitaFinanceira,
        despesasFinanceiras,
        resultadoFinanceiro,
        lair,
        irCsll,
        lucroLiquido,
      },
      despesasDetalhadas: despesas,
      qtdeVendas: vendas.length,
    });
  } catch (err) {
    console.error("Erro ao gerar DRE:", err);
    res.status(500).json({ error: "Erro ao gerar DRE." });
  }
});

// GET /api/dre/despesas — Listar despesas do período
router.get("/despesas", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });

    const empresaObj = mongoose.Types.ObjectId.isValid(empresaId) ? new mongoose.Types.ObjectId(empresaId) : null;
    if (!empresaObj) return res.status(400).json({ error: "ID de empresa inválido." });

    const { inicio, fim, categoria, limit = 200 } = req.query;
    const query = { empresa: empresaObj };
    if (inicio || fim) {
      query.data = {};
      if (inicio) query.data.$gte = new Date(inicio);
      if (fim) query.data.$lte = new Date(fim);
    }
    if (categoria) query.categoria = categoria;

    const lista = await Despesa.find(query).sort({ data: -1 }).limit(Math.min(Number(limit) || 200, 500)).lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar despesas:", err);
    res.status(500).json({ error: "Erro ao listar despesas." });
  }
});

// POST /api/dre/despesas — Cadastrar despesa
router.post("/despesas", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });

    const empresaObj = mongoose.Types.ObjectId.isValid(empresaId) ? new mongoose.Types.ObjectId(empresaId) : null;
    if (!empresaObj) return res.status(400).json({ error: "ID de empresa inválido." });

    const { categoria, descricao, valor, data } = req.body;
    const cats = ["cmv", "deducoes", "vendas", "administrativas", "financeiras", "receita_financeira", "ir_csll", "outras"];
    if (!categoria || !cats.includes(categoria)) {
      return res.status(400).json({ error: "Categoria inválida. Use: cmv, deducoes, vendas, administrativas, financeiras, receita_financeira, ir_csll, outras." });
    }
    const v = Number(valor);
    if (isNaN(v)) return res.status(400).json({ error: "Valor inválido." });

    const doc = await Despesa.create({
      empresa: empresaObj,
      categoria,
      descricao: String(descricao || "").trim(),
      valor: v,
      data: data ? new Date(data) : new Date(),
    });
    res.status(201).json(doc.toObject());
  } catch (err) {
    console.error("Erro ao cadastrar despesa:", err);
    res.status(500).json({ error: "Erro ao cadastrar despesa." });
  }
});

// DELETE /api/dre/despesas/:id — Excluir despesa
router.delete("/despesas/:id", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });

    const doc = await Despesa.findOne({ _id: req.params.id, empresa: empresaId });
    if (!doc) return res.status(404).json({ error: "Despesa não encontrada." });
    await Despesa.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir despesa:", err);
    res.status(500).json({ error: "Erro ao excluir despesa." });
  }
});

export default router;
