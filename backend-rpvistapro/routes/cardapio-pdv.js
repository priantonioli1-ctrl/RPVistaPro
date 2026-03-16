// routes/cardapio-pdv.js — Cardápio do PDV (pratos prontos)
import express from "express";
import CardapioPDV from "../models/CardapioPDV.js";
import Catalogo from "../models/Catalogo.js";

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

// POST /excluir-todos — precisa vir ANTES de /:id para não ser capturado
router.post("/excluir-todos", async (req, res) => {
  try {
    const { empresa } = req.body;
    const emp = empresa || req.query.empresa;
    if (!emp) return res.status(400).json({ error: "empresa é obrigatório." });
    const result = await CardapioPDV.deleteMany({ empresa: String(emp).trim() });
    res.json({ message: `${result.deletedCount} item(ns) excluído(s).`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Erro ao excluir todos:", err);
    res.status(500).json({ error: "Erro ao excluir itens." });
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

const CATEGORIAS_TRIB = ["ALÍQUOTA_ZERO", "ALÍQUOTA_REDUZIDA", "ALÍQUOTA_PADRÃO"];

router.post("/", async (req, res) => {
  try {
    const { empresa, codigo, codigoBarras, nome, descricao, categoria, preco, unidade, categoriaTributaria } = req.body;
    if (!empresa || !nome?.trim()) return res.status(400).json({ error: "empresa e nome são obrigatórios." });
    const precoNum = parseFloat(String(preco || 0).replace(",", ".")) || 0;
    const catTrib = categoriaTributaria?.trim() && CATEGORIAS_TRIB.includes(categoriaTributaria.trim()) ? categoriaTributaria.trim() : "ALÍQUOTA_PADRÃO";
    const novo = await CardapioPDV.create({
      empresa,
      codigo: codigo?.trim() || null,
      codigoBarras: codigoBarras?.trim() || null,
      nome: nome.trim(),
      descricao: descricao?.trim() || "",
      categoria: categoria?.trim() || "Geral",
      preco: precoNum,
      unidade: unidade?.trim() || "un",
      categoriaTributaria: catTrib,
    });
    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro ao criar item:", err);
    res.status(500).json({ error: "Erro ao criar item." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { codigo, codigoBarras, nome, descricao, categoria, preco, unidade, ativo, categoriaTributaria } = req.body;
    const update = {};
    if (codigo !== undefined) update.codigo = codigo?.trim() || null;
    if (codigoBarras !== undefined) update.codigoBarras = codigoBarras?.trim() || null;
    if (nome !== undefined) update.nome = nome?.trim();
    if (descricao !== undefined) update.descricao = descricao?.trim() || "";
    if (categoria !== undefined) update.categoria = categoria?.trim() || "Geral";
    if (preco !== undefined) update.preco = parseFloat(String(preco).replace(",", ".")) || 0;
    if (unidade !== undefined) update.unidade = unidade?.trim() || "un";
    if (ativo !== undefined) update.ativo = !!ativo;
    if (categoriaTributaria !== undefined && CATEGORIAS_TRIB.includes(categoriaTributaria?.trim())) {
      update.categoriaTributaria = categoriaTributaria.trim();
    }
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

// POST /sincronizar-codigo-barras — Copia codigoBarras do Catálogo para itens do Cardápio PDV (match por nome+unidade)
router.post("/sincronizar-codigo-barras", async (req, res) => {
  try {
    const { empresa } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });

    const catalogo = await Catalogo.findOne({ empresa }).lean();
    if (!catalogo?.catalogo?.length) {
      return res.status(404).json({ error: "Catálogo não encontrado ou vazio." });
    }
    const mapaCat = new Map();
    catalogo.catalogo.forEach((c) => {
      const chave = `${(c.nome || "").trim().toLowerCase()}::${((c.unidade || "").trim() || "un").toLowerCase()}`;
      if ((c.codigoBarras || "").trim()) mapaCat.set(chave, c.codigoBarras.trim());
    });

    const itensPDV = await CardapioPDV.find({ empresa });
    let atualizados = 0;
    for (const item of itensPDV) {
      const chave = `${(item.nome || "").trim().toLowerCase()}::${(item.unidade || "un").trim().toLowerCase()}`;
      const codigoBarras = mapaCat.get(chave);
      if (codigoBarras && !(item.codigoBarras || "").trim()) {
        item.codigoBarras = codigoBarras;
        await item.save();
        atualizados++;
      }
    }
    res.json({ message: `${atualizados} item(ns) atualizado(s) com código de barras do catálogo.`, atualizados });
  } catch (err) {
    console.error("Erro ao sincronizar códigos de barras:", err);
    res.status(500).json({ error: "Erro ao sincronizar." });
  }
});

// POST /importar — Recebe itens parseados do frontend (xlsx, xls, csv)
router.post("/importar", async (req, res) => {
  try {
    const { empresa, itens } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ error: "Envie um array de itens." });

    const toStr = (v) => (v != null ? String(v).trim() : "");
    const docs = itens
      .map((r) => {
        const nome = toStr(r.nome || r.produto);
        if (!nome) return null;
        const catTrib = toStr(r.categoriaTributaria || r.categoria_tributaria);
        return {
          empresa,
          codigo: toStr(r.codigo) || null,
          codigoBarras: toStr(r.codigoBarras) || null,
          nome,
          descricao: toStr(r.descricao) || "",
          categoria: toStr(r.categoria || r.secao || r.seção) || "Geral",
          preco: parseFloat(String(r.preco ?? r.valor ?? 0).replace(",", ".")) || 0,
          unidade: toStr(r.unidade) || "un",
          categoriaTributaria: CATEGORIAS_TRIB.includes(catTrib) ? catTrib : "ALÍQUOTA_PADRÃO",
        };
      })
      .filter(Boolean);
    if (docs.length === 0) return res.status(400).json({ error: "Nenhum item válido (nome obrigatório)." });
    const criados = await CardapioPDV.insertMany(docs);
    res.json({ message: `${criados.length} itens importados.`, count: criados.length });
  } catch (err) {
    console.error("Erro ao importar:", err);
    const msg = err.message || "Erro ao importar. Verifique o formato.";
    res.status(500).json({ error: msg });
  }
});

export default router;
