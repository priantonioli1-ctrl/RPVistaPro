// routes/catalogos-fornecedores.js
import express from "express";
import CatalogoFornecedor from "../models/CatalogoFornecedor.js";
import EstoqueFornecedor from "../models/EstoqueFornecedor.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();

async function obterAliquotaDoFornecedor(empresa) {
  const emp = (empresa || "").trim();
  if (!emp) return { aliquota: null, estadoSigla: "" };
  const u = await Usuario.findOne({
    tipo: "fornecedor",
    $or: [{ empresa: emp }, { nome: emp }],
  }).lean();
  return u ? { aliquota: u.aliquota ?? null, estadoSigla: u.estado || "" } : { aliquota: null, estadoSigla: "" };
}
// ✅ POST - Criar ou atualizar catálogo do fornecedor
router.post("/", async (req, res) => {
  try {
    const { empresa, catalogo, usuarioEmail, comprador } = req.body;

    // 🧠 Log para depuração — confirma que o POST chegou e o body está correto
    console.log("📥 POST recebido em /api/catalogos-fornecedores");
    console.log("→ Body:", JSON.stringify(req.body, null, 2));

    // 🧩 Validação básica
    if (!empresa || typeof empresa !== "string" || !empresa.trim()) {
      return res
        .status(400)
        .json({ error: "Dados inválidos. É necessário empresa (nome do fornecedor)." });
    }
    if (!Array.isArray(catalogo)) {
      return res
        .status(400)
        .json({ error: "Dados inválidos. O campo catálogo deve ser uma lista." });
    }

    // Remove itens sem nome para evitar erro de validação do Mongoose
    const catalogoLimpo = catalogo.filter(
      (item) => item && (item.nome || "").toString().trim()
    ).map((item) => ({
      nome: (item.nome || "").toString().trim(),
      secao: (item.secao || "").toString().trim() || undefined,
      marca: (item.marca || "").toString().trim() || undefined,
      unidade: (item.unidade || "").toString().trim() || "",
      similar: item.similar !== false,
      codigo: (item.codigo || "").toString().trim() || undefined,
      preco: Number(item.preco) || 0,
    }));

    // 🔍 Busca pelo catálogo deste fornecedor (comprador vazio = catálogo geral do fornecedor)
    const compradorVal = (comprador || "").toString().trim();
    let existente = await CatalogoFornecedor.findOne({
      empresa: empresa.trim(),
      comprador: compradorVal,
    });
    if (existente) {
      existente.catalogo = catalogoLimpo;
      const { aliquota, estadoSigla } = await obterAliquotaDoFornecedor(empresa.trim());
      existente.aliquota = aliquota;
      existente.estadoSigla = estadoSigla;
      await existente.save();

      console.log(
        `🔁 Catálogo atualizado para o fornecedor "${empresa}" (${usuarioEmail || "usuário não informado"}) com ${catalogo.length} itens.`
      );

      return res.json({
        ok: true,
        message: `Catálogo do fornecedor "${empresa}" atualizado com sucesso.`,
        catalogo: existente,
      });
    }

    // 🆕 Cria novo catálogo
    const { aliquota, estadoSigla } = await obterAliquotaDoFornecedor(empresa.trim());
    const novoCatalogo = new CatalogoFornecedor({
      empresa: empresa.trim(),
      comprador: compradorVal,
      catalogo: catalogoLimpo,
      aliquota,
      estadoSigla,
    });

    await novoCatalogo.save();

    console.log(
      `✅ Novo catálogo criado para o fornecedor "${empresa}" (${usuarioEmail || "usuário não informado"}) com ${catalogo.length} itens.`
    );

    return res.json({
      ok: true,
      message: `Catálogo do fornecedor "${empresa}" criado com sucesso.`,
      catalogo: novoCatalogo,
    });
  } catch (error) {
    console.error("❌ Erro ao salvar catálogo do fornecedor:", error);
    const msg = error.message || "Erro interno ao salvar catálogo do fornecedor.";
    const status = error.code === 11000 ? 409 : 500; // 11000 = duplicate key
    res.status(status).json({ error: msg });
  }
});
router.get("/", async (req, res) => {
  try {
    const comDisponibilidade = (req.query.comDisponibilidade || "").toString() === "1" || req.query.comDisponibilidade === true;
    const todos = await CatalogoFornecedor.find({}, "-__v").sort({ empresa: 1 }).lean();

    if (!todos.length) {
      return res.status(200).json([]);
    }

    if (!comDisponibilidade) {
      return res.json(todos);
    }

    const resultado = [];
    for (const doc of todos) {
      const empresa = (doc.empresa || "").toString().trim();
      let aliquota = doc.aliquota;
      let estadoSigla = doc.estadoSigla || "";
      if (aliquota == null && empresa) {
        const d = await obterAliquotaDoFornecedor(empresa);
        aliquota = d.aliquota;
        estadoSigla = d.estadoSigla;
      }
      let estoqueMap = new Map();
      const est = await EstoqueFornecedor.findOne({ empresa }).lean();
      if (est && Array.isArray(est.itens)) {
        est.itens.forEach((i) => {
          const chave = `${(i.nome || "").toLowerCase()}::${(i.unidade || "un").toLowerCase()}`;
          estoqueMap.set(chave, Number(i.quantidade) || 0);
        });
      }
      const catalogo = (doc.catalogo || []).map((item) => {
        const nome = (item.nome || "").trim();
        const unidade = (item.unidade || "").trim() || "un";
        const chave = `${nome.toLowerCase()}::${unidade.toLowerCase()}`;
        const disponivel = estoqueMap.get(chave) ?? 0;
        return { ...item, disponivel };
      });
      resultado.push({ ...doc, catalogo, aliquota, estadoSigla });
    }
    return res.json(resultado);
  } catch (err) {
    console.error("❌ Erro ao listar catálogos de fornecedores:", err);
    return res.status(500).json({ error: "Erro interno ao listar catálogos de fornecedores." });
  }
});

// GET /:fornecedor — retorna o catálogo do fornecedor (primeiro encontrado com comprador vazio ou qualquer)
router.get("/:fornecedor", async (req, res) => {
  try {
    const fornecedor = (req.params.fornecedor || "").trim();
    if (!fornecedor) {
      return res.status(400).json({ error: "Fornecedor não informado." });
    }
    const doc = await CatalogoFornecedor.findOne({ empresa: fornecedor }).lean();
    if (!doc) {
      return res.status(404).json({ error: "Catálogo do fornecedor não encontrado." });
    }
    return res.json(doc);
  } catch (err) {
    console.error("❌ Erro ao buscar catálogo do fornecedor:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/:fornecedor/:comprador", async (req, res) => {
  try {
    const fornecedor = (req.params.fornecedor || "").trim();
    const comprador = (req.params.comprador || "").trim();

    if (!fornecedor || !comprador) {
      return res.status(400).json({ error: "Fornecedor ou comprador não informado." });
    }

    const doc = await CatalogoFornecedor.findOne({
      empresa: fornecedor,
      comprador,
    }).lean();

    if (!doc) {
      console.warn(
        `⚠️ Nenhum catálogo encontrado para o fornecedor "${fornecedor}" e comprador "${comprador}".`
      );
      return res
        .status(404)
        .json({ error: "Catálogo do fornecedor não encontrado." });
    }

    console.log(
      `📘 Catálogo carregado para o fornecedor "${fornecedor}" e comprador "${comprador}" (${doc.catalogo?.length || 0} itens).`
    );

    return res.json(doc);
  } catch (err) {
    console.error("❌ Erro ao buscar catálogo do fornecedor:", err);
    return res
      .status(500)
      .json({ error: "Erro interno ao buscar catálogo do fornecedor." });
  }
});
export default router;
