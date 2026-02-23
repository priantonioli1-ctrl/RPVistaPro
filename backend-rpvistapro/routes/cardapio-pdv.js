// routes/cardapio-pdv.js — Cardápio do PDV (pratos prontos)
import express from "express";
import CardapioPDV from "../models/CardapioPDV.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const ativo = req.query.ativo;
    const filtro = { empresa };
    if (ativo !== undefined) filtro.ativo = ativo === "true";
    const lista = await CardapioPDV.find(filtro).sort({ categoria: 1, nome: 1 }).lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar cardápio:", err);
    res.status(500).json({ error: "Erro ao listar cardápio." });
  }
});

router.get("/categorias", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const raw = await CardapioPDV.distinct("categoria", { empresa });
    const normalizadas = (raw || []).map((c) => (String(c || "").trim() || "Geral"));
    const unicas = [...new Set(normalizadas)].filter(Boolean).sort((a, b) => (a === "Geral" ? -1 : b === "Geral" ? 1 : a.localeCompare(b)));
    res.json(unicas.length ? unicas : ["Geral"]);
  } catch (err) {
    console.error("Erro ao listar categorias:", err);
    res.status(500).json({ error: "Erro ao listar categorias." });
  }
});

router.get("/buscar", async (req, res) => {
  try {
    const { empresa, q, codigo, codigoBarras } = req.query;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const filtro = { empresa, ativo: true };
    if (codigoBarras && String(codigoBarras).trim()) {
      const item = await CardapioPDV.findOne({ ...filtro, codigoBarras: String(codigoBarras).trim() }).lean();
      return res.json(item ? [item] : []);
    }
    if (codigo && String(codigo).trim()) {
      const item = await CardapioPDV.findOne({ ...filtro, codigo: String(codigo).trim() }).lean();
      return res.json(item ? [item] : []);
    }
    if (q && String(q).trim()) {
      const termo = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const lista = await CardapioPDV.find({
        ...filtro,
        $or: [{ nome: termo }, { descricao: termo }, { codigo: termo }, { codigoBarras: termo }],
      })
        .sort({ categoria: 1, nome: 1 })
        .lean();
      return res.json(lista);
    }
    const lista = await CardapioPDV.find(filtro).sort({ categoria: 1, nome: 1 }).lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao buscar cardápio:", err);
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await CardapioPDV.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: "Item não encontrado." });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar item." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, codigo, codigoBarras, nome, descricao, categoria, preco, unidade } = req.body;
    if (!empresa || !nome?.trim()) return res.status(400).json({ error: "empresa e nome são obrigatórios." });
    const precoNum = parseFloat(String(preco || 0).replace(",", ".")) || 0;
    const novo = await CardapioPDV.create({
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
    console.error("Erro ao criar item:", err);
    res.status(500).json({ error: "Erro ao criar item." });
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
    const atualizado = await CardapioPDV.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!atualizado) return res.status(404).json({ error: "Item não encontrado." });
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await CardapioPDV.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Item não encontrado." });
    res.json({ message: "Item excluído." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir." });
  }
});

// POST /importar — Recebe itens parseados do frontend (xlsx, xls, csv)
router.post("/importar", async (req, res) => {
  try {
    const { empresa, itens } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ error: "Envie um array de itens." });

    const criados = await CardapioPDV.insertMany(
      itens.map((r) => ({
        empresa,
        codigo: r.codigo?.trim() || null,
        codigoBarras: r.codigoBarras?.trim() || null,
        nome: (r.nome || r.produto || "").trim(),
        descricao: (r.descricao || "").trim() || "",
        categoria: (r.categoria || r.secao || r.seção || "Geral").trim() || "Geral",
        preco: parseFloat(String(r.preco || r.valor || 0).replace(",", ".")) || 0,
        unidade: (r.unidade || "un").trim() || "un",
      }))
    );
    res.json({ message: `${criados.length} itens importados.`, count: criados.length });
  } catch (err) {
    console.error("Erro ao importar:", err);
    res.status(500).json({ error: "Erro ao importar. Verifique o formato." });
  }
});

export default router;
