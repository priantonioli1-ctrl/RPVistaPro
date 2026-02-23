import express from "express";
import EstoqueFornecedor from "../models/EstoqueFornecedor.js";
import CatalogoFornecedor from "../models/CatalogoFornecedor.js";

const router = express.Router();

router.get("/:fornecedorId", async (req, res) => {
  try {
    const id = (req.params.fornecedorId || "").trim();
    if (!id) return res.status(400).json({ error: "Fornecedor não informado." });
    let estoque = await EstoqueFornecedor.findOne({ empresa: id }).lean();
    if (!estoque) {
      const cat = await CatalogoFornecedor.findOne({ empresa: id }).lean();
      const itensCat = Array.isArray(cat?.catalogo) ? cat.catalogo : [];
      const itens = itensCat.map((i) => ({
        nome: (i.nome || "").trim(),
        unidade: (i.unidade || "").trim() || "un",
        quantidade: 0,
      }));
      estoque = await EstoqueFornecedor.create({ empresa: id, itens });
    }
    res.json(Array.isArray(estoque.itens) ? estoque.itens : []);
  } catch (err) {
    console.error("❌ Erro ao buscar estoque do fornecedor:", err);
    res.status(500).json({ error: "Erro ao buscar estoque." });
  }
});

router.post("/:fornecedorId", async (req, res) => {
  try {
    const id = (req.params.fornecedorId || "").trim();
    const { itens } = req.body;
    if (!id) return res.status(400).json({ error: "Fornecedor não informado." });
    if (!Array.isArray(itens)) return res.status(400).json({ error: "itens deve ser um array." });
    const itensNorm = itens.map((i) => ({
      nome: (i.nome || "").trim(),
      unidade: (i.unidade || "un").trim(),
      quantidade: Number(i.quantidade) || 0,
    }));
    let estoque = await EstoqueFornecedor.findOne({ empresa: id });
    if (!estoque) {
      estoque = await EstoqueFornecedor.create({ empresa: id, itens: itensNorm });
    } else {
      estoque.itens = itensNorm;
      await estoque.save();
    }
    res.json(estoque.itens || []);
  } catch (err) {
    console.error("❌ Erro ao salvar estoque do fornecedor:", err);
    res.status(500).json({ error: "Erro ao salvar estoque." });
  }
});

export default router;
