// routes/produtos-evento.js — Catálogo de produtos para eventos
import express from "express";
import ProdutoEvento from "../models/ProdutoEvento.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa obrigatório." });
    const filtro = { empresa };
    if (req.query.ativo !== undefined) filtro.ativo = req.query.ativo === "true";
    const lista = await ProdutoEvento.find(filtro).sort({ categoria: 1, nome: 1 }).lean();
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar." });
  }
});

router.get("/categorias", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa obrigatorio." });
    const cats = await ProdutoEvento.distinct("categoria", { empresa });
    const unicas = [...new Set(cats.map((c) => (String(c || "").trim() || "Geral")))].filter(Boolean).sort();
    res.json(unicas);
  } catch (err) {
    console.error("Erro ao listar categorias:", err);
    res.status(500).json({ error: "Erro ao listar categorias." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await ProdutoEvento.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: "Não encontrado." });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, codigo, codigoBarras, nome, descricao, categoria, preco, unidade } = req.body;
    if (!empresa || !nome?.trim()) return res.status(400).json({ error: "empresa e nome obrigatórios." });
    const precoNum = parseFloat(String(preco || 0).replace(",", ".")) || 0;
    const novo = await ProdutoEvento.create({
      empresa,
      codigo: codigo?.trim() || null,
      codigoBarras: codigoBarras?.trim() || null,
      nome: nome.trim(),
      descricao: descricao?.trim() || "",
      categoria: categoria?.trim() || "Geral",
      preco: precoNum,
      unidade: unidade?.trim() || "un",
    });
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { codigo, codigoBarras, nome, descricao, categoria, preco, unidade, ativo } = req.body;
    const update = {};
    if (codigo !== undefined) update.codigo = codigo?.trim() || null;
    if (codigoBarras !== undefined) update.codigoBarras = codigoBarras?.trim() || null;
    if (nome !== undefined) update.nome = nome?.trim();
    if (descricao !== undefined) update.descricao = descricao?.trim() || "";
    if (categoria !== undefined) update.categoria = categoria?.trim() || "Geral";
    if (preco !== undefined) update.preco = parseFloat(String(preco).replace(",", ".")) || 0;
    if (unidade !== undefined) update.unidade = unidade?.trim() || "un";
    if (ativo !== undefined) update.ativo = !!ativo;
    const atualizado = await ProdutoEvento.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!atualizado) return res.status(404).json({ error: "Não encontrado." });
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await ProdutoEvento.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Não encontrado." });
    res.json({ message: "Excluído." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir." });
  }
});

router.post("/importar", async (req, res) => {
  try {
    const { empresa, itens } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa obrigatório." });
    if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ error: "Array de itens vazio." });
    const criados = await ProdutoEvento.insertMany(
      itens.map((r) => ({
        empresa,
        codigo: r.codigo?.trim() || null,
        codigoBarras: r.codigoBarras?.trim() || null,
        nome: (r.nome || r.produto || "").trim(),
        descricao: (r.descricao || "").trim() || "",
        categoria: (r.categoria || r.secao || "Geral").trim() || "Geral",
        preco: parseFloat(String(r.preco || r.valor || 0).replace(",", ".")) || 0,
        unidade: (r.unidade || "un").trim() || "un",
      }))
    );
    res.json({ message: `${criados.length} importados.`, count: criados.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao importar." });
  }
});

export default router;
