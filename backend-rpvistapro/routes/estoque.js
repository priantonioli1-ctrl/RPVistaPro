import express from "express";
import mongoose from "mongoose";
import Estoque from "../models/Estoque.js";
import Catalogo from "../models/Catalogo.js";

const router = express.Router();

// ============================================
// GET /api/estoque/:empresaId
// Sincronização automática com o catálogo: itens novos no catálogo são acrescentados ao estoque.
// ============================================
router.get("/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }
    const empresaId = new mongoose.Types.ObjectId(compradorId);

    const catalogo = await Catalogo.findOne({ empresa: empresaId }).lean();
    const listaCatalogo = catalogo?.catalogo && Array.isArray(catalogo.catalogo) ? catalogo.catalogo : [];

    let estoque = await Estoque.findOne({ empresa: empresaId });

    // se não existir estoque, cria a partir do catálogo
    if (!estoque) {
      if (listaCatalogo.length === 0) {
        return res.status(404).json({
          error: "Não há estoque nem catálogo para esta empresa.",
        });
      }
      const novosItens = listaCatalogo.map((item) => ({
        nome: item.nome,
        unidade: item.unidade || "un",
        quantidade: 0,
        minimo: 0,
        maximo: 0,
        emTransito: 0,
        contagemReal: 0,
        ultimaAtualizacao: null,
        ultimaEntrada: {},
      }));
      estoque = await Estoque.create({
        empresa: empresaId,
        itens: novosItens,
      });
      console.log(`🆕 Estoque criado automaticamente para ${compradorId}`);
      return res.json(estoque.itens);
    }

    // Sincronização com o catálogo: planilha de contagem real reflete sempre o catálogo
    const nomesCatalogo = new Set(
      listaCatalogo.map((c) => (c.nome || "").trim().toLowerCase()).filter(Boolean)
    );
    const mapaCatalogo = new Map();
    listaCatalogo.forEach((c) => {
      const nomeNorm = (c.nome || "").trim().toLowerCase();
      if (nomeNorm) mapaCatalogo.set(nomeNorm, { nome: (c.nome || "").trim(), unidade: (c.unidade || "").trim() || "un" });
    });

    let alterado = false;

    // 1) Remover do estoque itens que não estão mais no catálogo
    const antes = estoque.itens.length;
    estoque.itens = estoque.itens.filter((i) => {
      const n = (i.nome || "").toLowerCase();
      if (nomesCatalogo.has(n)) return true;
      alterado = true;
      return false;
    });
    if (estoque.itens.length !== antes) {
      alterado = true;
      console.log(`🔄 Estoque: ${antes - estoque.itens.length} item(ns) removido(s) (fora do catálogo).`);
    }

    // 2) Atualizar nome/unidade dos que existem e acrescentar os novos
    const nomesExistentes = new Set(estoque.itens.map((i) => (i.nome || "").toLowerCase()));
    for (const item of listaCatalogo) {
      const nomeNorm = (item.nome || "").trim().toLowerCase();
      if (!nomeNorm) continue;
      const ref = mapaCatalogo.get(nomeNorm);
      if (!ref) continue;

      const existente = estoque.itens.find((i) => (i.nome || "").toLowerCase() === nomeNorm);
      if (existente) {
        if (existente.nome !== ref.nome || (existente.unidade || "un") !== ref.unidade) {
          existente.nome = ref.nome;
          existente.unidade = ref.unidade;
          alterado = true;
        }
      } else {
        nomesExistentes.add(nomeNorm);
        estoque.itens.push({
          nome: ref.nome,
          unidade: ref.unidade,
          quantidade: 0,
          minimo: 0,
          maximo: 0,
          emTransito: 0,
          contagemReal: 0,
          ultimaAtualizacao: null,
          ultimaEntrada: {},
        });
        alterado = true;
      }
    }

    if (alterado) {
      estoque.markModified("itens");
      await estoque.save();
      console.log(`🔄 Estoque sincronizado com catálogo para ${compradorId} (contagem real atualizada).`);
    }

    console.log(
      `📦 Estoque carregado para ${compradorId} (${estoque.itens?.length || 0} itens)`
    );
    return res.json(estoque.itens || []);
  } catch (err) {
    console.error("❌ Erro ao buscar ou criar estoque:", err);
    res.status(500).json({ error: "Erro interno ao buscar estoque." });
  }
});

// ============================================
// POST /api/estoque/entrada/:empresaId
// ============================================
router.post("/entrada/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();
    const { produto, quantidade, unidade, fornecedor, nf } = req.body;

    if (!produto || !quantidade) {
      return res
        .status(400)
        .json({ error: "Produto e quantidade são obrigatórios." });
    }

    let estoque = await Estoque.findOne({ empresa: compradorId });

    if (!estoque) {
      return res.status(404).json({ error: "Estoque não encontrado." });
    }

    const item = estoque.itens.find(
      (i) => i.nome.toLowerCase() === produto.toLowerCase()
    );

    if (item) {
      item.quantidade += Number(quantidade);
      item.ultimaAtualizacao = new Date();
      item.ultimaEntrada = {
        fornecedor: fornecedor || "",
        nf: nf || "",
        quantidade: Number(quantidade),
        data: new Date(),
      };
    } else {
      estoque.itens.push({
        nome: produto,
        unidade: unidade || "un",
        quantidade: Number(quantidade),
        minimo: 0,
        maximo: 0,
        emTransito: 0,
        contagemReal: 0,
        ultimaAtualizacao: new Date(),
        ultimaEntrada: {
          fornecedor: fornecedor || "",
          nf: nf || "",
          quantidade: Number(quantidade),
          data: new Date(),
        },
      });
    }

    await estoque.save();

    res.json({ message: "Entrada registrada com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao registrar entrada:", err);
    res.status(500).json({ error: "Erro interno ao registrar entrada." });
  }
});

// ============================================
// POST /api/estoque/sincronizar/:empresaId
// ============================================
router.post("/sincronizar/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();

    const catalogo = await Catalogo.findOne({ empresa: compradorId }).lean();
    if (!catalogo || !Array.isArray(catalogo.catalogo)) {
      return res
        .status(404)
        .json({ error: "Catálogo não encontrado ou vazio." });
    }

    let estoque = await Estoque.findOne({ empresa: compradorId });

    // cria estoque novo se não existir
    if (!estoque) {
      estoque = await Estoque.create({
        empresa: compradorId,
        itens: catalogo.catalogo.map((item) => ({
          nome: item.nome,
          unidade: item.unidade || "un",
          quantidade: 0,
          minimo: 0,
          maximo: 0,
          emTransito: 0,
          contagemReal: 0,
          ultimaAtualizacao: null,
          ultimaEntrada: {},
        })),
      });

      return res.json({ message: "Estoque criado com sucesso." });
    }

    // mescla novos itens
    const nomesExistentes = new Set(
      estoque.itens.map((i) => i.nome.toLowerCase())
    );

    let novos = 0;

    catalogo.catalogo.forEach((item) => {
      if (!nomesExistentes.has(item.nome.toLowerCase())) {
        estoque.itens.push({
          nome: item.nome,
          unidade: item.unidade || "un",
          quantidade: 0,
          minimo: 0,
          maximo: 0,
          emTransito: 0,
          contagemReal: 0,
          ultimaAtualizacao: null,
          ultimaEntrada: {},
        });
        novos++;
      }
    });

    if (novos > 0) await estoque.save();

    res.json({
      message:
        novos > 0
          ? `${novos} novos produtos adicionados ao estoque.`
          : "Estoque já está sincronizado.",
      total: estoque.itens.length,
    });
  } catch (err) {
    console.error("❌ Erro ao sincronizar estoque:", err);
    res.status(500).json({ error: "Erro interno ao sincronizar estoque." });
  }
});

// ============================================
// POST /api/estoque/:empresaId  (salvar tudo)
// emTransito NÃO é aceito do cliente: só é atualizado pelos pedidos (aprovado/recebido)
// ============================================
router.post("/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();
    const { itens } = req.body;

    if (!Array.isArray(itens)) {
      return res
        .status(400)
        .json({ error: "Itens inválidos — esperado um array." });
    }

    let estoque = await Estoque.findOne({ empresa: compradorId });

    // Mapa do emTransito atual no servidor (por nome normalizado) — não sobrescrevemos com valor do cliente
    const emTransitoPorNome = new Map();
    if (estoque && Array.isArray(estoque.itens)) {
      for (const it of estoque.itens) {
        const nome = (it.nome || "").toString().trim().toLowerCase();
        if (nome) emTransitoPorNome.set(nome, Number(it.emTransito) || 0);
      }
    }

    const itensFormatados = itens.map((i) => {
      const nomeNorm = (i.nome || "").toString().trim().toLowerCase();
      const emTransitoServidor = emTransitoPorNome.has(nomeNorm)
        ? emTransitoPorNome.get(nomeNorm)
        : 0;
      return {
        nome: (i.nome || "").toString().trim(),
        unidade: i.unidade || "un",
        quantidade: Number(i.quantidade || 0),
        minimo: Number(i.minimo || 0),
        maximo: Number(i.maximo || 0),
        emTransito: emTransitoServidor,
        contagemReal: Number(i.contagemReal || 0),
        ultimaAtualizacao: i.ultimaAtualizacao
          ? new Date(i.ultimaAtualizacao)
          : null,
        ultimaEntrada: {
          fornecedor: i.ultimaEntrada?.fornecedor || "",
          nf: i.ultimaEntrada?.nf || "",
          quantidade: Number(i.ultimaEntrada?.quantidade || 0),
          data: i.ultimaEntrada?.data
            ? new Date(i.ultimaEntrada.data)
            : null,
        },
      };
    });

    if (!estoque) {
      estoque = new Estoque({
        empresa: compradorId,
        itens: itensFormatados,
      });
    } else {
      estoque.itens = itensFormatados;
    }

    await estoque.save();

    res.json({
      message: "Estoque salvo com sucesso.",
      total: itensFormatados.length,
    });
  } catch (err) {
    console.error("❌ Erro ao salvar estoque:", err);
    res.status(500).json({ error: "Erro interno ao salvar estoque." });
  }
});

// ============================================
// POST /api/estoque/contagem/:empresaId
// ============================================
router.post("/contagem/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();
    const { itens } = req.body;

    if (!Array.isArray(itens)) {
      return res.status(400).json({ error: "Itens inválidos." });
    }

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }
    const empresaId = new mongoose.Types.ObjectId(compradorId);
    const estoque = await Estoque.findOne({ empresa: empresaId });

    if (!estoque) {
      return res.status(404).json({ error: "Estoque não encontrado." });
    }

    itens.forEach((item) => {
      const registro = estoque.itens.find(
        (i) => (i.nome || "").toLowerCase() === (item.nome || "").toLowerCase()
      );

      if (registro) {
        registro.contagemReal = Number(item.contagemReal) || 0;
        registro.ultimaAtualizacao = new Date();
      }
    });

    estoque.markModified("itens");
    await estoque.save();

    res.json({
      message: "Contagem real atualizada com sucesso!",
      count: itens.length,
    });
  } catch (err) {
    console.error("❌ Erro ao atualizar contagem real:", err);
    res.status(500).json({ error: "Erro interno ao salvar contagem real." });
  }
});

export default router;