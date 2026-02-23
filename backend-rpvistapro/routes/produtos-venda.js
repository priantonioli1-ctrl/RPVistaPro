import express from "express";
import ProdutoVenda from "../models/ProdutoVenda.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { empresa } = req.query;
    if (!empresa) {
      return res.status(400).json({ error: "empresa é obrigatório." });
    }
    const lista = await ProdutoVenda.find({ empresa })
      .populate("fichaTecnica", "nome rendimento itens")
      .sort({ nome: 1 })
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("❌ Erro ao listar produtos para venda:", err);
    res.status(500).json({ error: "Erro ao listar produtos." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const produto = await ProdutoVenda.findById(req.params.id)
      .populate("fichaTecnica", "nome descricao rendimento itens")
      .lean();
    if (!produto) return res.status(404).json({ error: "Produto não encontrado." });
    res.json(produto);
  } catch (err) {
    console.error("❌ Erro ao buscar produto:", err);
    res.status(500).json({ error: "Erro ao buscar produto." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, nome, descricao, fichaTecnica } = req.body;
    if (!empresa || !nome) {
      return res.status(400).json({ error: "empresa e nome são obrigatórios." });
    }
    const novo = await ProdutoVenda.create({
      empresa,
      nome: (nome || "").trim(),
      descricao: (descricao || "").trim(),
      fichaTecnica: fichaTecnica || null,
    });
    const pop = await ProdutoVenda.findById(novo._id)
      .populate("fichaTecnica", "nome rendimento itens")
      .lean();
    res.status(201).json(pop);
  } catch (err) {
    console.error("❌ Erro ao criar produto para venda:", err);
    res.status(500).json({ error: "Erro ao criar produto." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nome, descricao, fichaTecnica } = req.body;
    const atualizado = await ProdutoVenda.findByIdAndUpdate(
      req.params.id,
      {
        ...(nome != null && { nome: nome.trim() }),
        ...(descricao != null && { descricao: descricao.trim() }),
        ...(fichaTecnica !== undefined && { fichaTecnica: fichaTecnica || null }),
      },
      { new: true }
    )
      .populate("fichaTecnica", "nome rendimento itens")
      .lean();
    if (!atualizado) return res.status(404).json({ error: "Produto não encontrado." });
    res.json(atualizado);
  } catch (err) {
    console.error("❌ Erro ao atualizar produto:", err);
    res.status(500).json({ error: "Erro ao atualizar produto." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await ProdutoVenda.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Produto não encontrado." });
    res.json({ message: "Produto excluído." });
  } catch (err) {
    console.error("❌ Erro ao excluir produto:", err);
    res.status(500).json({ error: "Erro ao excluir produto." });
  }
});

export default router;
