// routes/tipo-proposta.js — Tipos de proposta/orçamento (Vista Lagoa, etc.)
import express from "express";
import TipoProposta from "../models/TipoProposta.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa obrigatório." });
    const filtro = { empresa };
    if (req.query.ativo !== undefined) filtro.ativo = req.query.ativo === "true";
    const lista = await TipoProposta.find(filtro).sort({ nome: 1 }).lean();
    res.json(lista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await TipoProposta.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: "Não encontrado." });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, nome, subtitulo, config } = req.body;
    if (!empresa || !nome?.trim()) return res.status(400).json({ error: "empresa e nome obrigatórios." });
    const novo = await TipoProposta.create({
      empresa,
      nome: nome.trim(),
      subtitulo: subtitulo?.trim() || "",
      config: config || {},
    });
    res.status(201).json(novo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nome, subtitulo, config, ativo } = req.body;
    const update = {};
    if (nome !== undefined) update.nome = nome?.trim();
    if (subtitulo !== undefined) update.subtitulo = subtitulo?.trim() || "";
    if (config !== undefined) update.config = config;
    if (ativo !== undefined) update.ativo = !!ativo;
    const atualizado = await TipoProposta.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!atualizado) return res.status(404).json({ error: "Não encontrado." });
    res.json(atualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await TipoProposta.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Não encontrado." });
    res.json({ message: "Excluído." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir." });
  }
});

export default router;
