// routes/modelos-ficha-orcamento.js — Modelos de ficha para orçamentos
import express from "express";
import ModeloFichaOrcamento from "../models/ModeloFichaOrcamento.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const lista = await ModeloFichaOrcamento.find({ empresa }).sort({ nome: 1 }).lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar modelos:", err);
    res.status(500).json({ error: "Erro ao listar." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const m = await ModeloFichaOrcamento.findById(req.params.id).lean();
    if (!m) return res.status(404).json({ error: "Modelo não encontrado." });
    res.json(m);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, nome, camposDados, perguntasCustom } = req.body;
    if (!empresa || !nome?.trim()) return res.status(400).json({ error: "empresa e nome são obrigatórios." });
    const novo = await ModeloFichaOrcamento.create({
      empresa,
      nome: nome.trim(),
      camposDados: Array.isArray(camposDados) ? camposDados : [],
      perguntasCustom: Array.isArray(perguntasCustom) ? perguntasCustom : [],
    });
    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro ao criar modelo:", err);
    res.status(500).json({ error: "Erro ao criar." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nome, camposDados, perguntasCustom } = req.body;
    const m = await ModeloFichaOrcamento.findById(req.params.id);
    if (!m) return res.status(404).json({ error: "Modelo não encontrado." });
    if (nome !== undefined) m.nome = nome.trim();
    if (Array.isArray(camposDados)) m.camposDados = camposDados;
    if (Array.isArray(perguntasCustom)) m.perguntasCustom = perguntasCustom;
    await m.save();
    res.json(m);
  } catch (err) {
    console.error("Erro ao atualizar modelo:", err);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await ModeloFichaOrcamento.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Modelo não encontrado." });
    res.json({ message: "Modelo excluído." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir." });
  }
});

export default router;
