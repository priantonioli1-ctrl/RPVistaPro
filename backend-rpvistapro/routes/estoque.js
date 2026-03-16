import express from "express";
import mongoose from "mongoose";
import Estoque from "../models/Estoque.js";
import Catalogo from "../models/Catalogo.js";
import Venda from "../models/Venda.js";
import MovimentoEstoque from "../models/MovimentoEstoque.js";

const router = express.Router();

// ============================================
// GET /api/estoque/metricas/:compradorId
// relatorio: estoqueExcedente | produtosMenosSaida | todasSaidas | todasEntradas | proximosValidade | abaixoMinimo
// dias, apenasBonificados (para entradas)
// ============================================
router.get("/metricas/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();
    const { dias = 30, relatorio = "produtosMenosSaida", apenasBonificados } = req.query;
    const diasNum = Math.min(Math.max(Number(dias) || 30, 7), 365);
    const filtrarBonificados = apenasBonificados === "true" || apenasBonificados === "1";

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }
    const empresaId = new mongoose.Types.ObjectId(compradorId);

    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasNum);
    dataInicio.setHours(0, 0, 0, 0);

    const estoque = await Estoque.findOne({ empresa: empresaId }).lean();
    const vendas = await Venda.find({
      empresa: empresaId,
      createdAt: { $gte: dataInicio },
    }).lean();

    let resultado = { relatorio, diasAnalise: diasNum };

    if (relatorio === "estoqueExcedente") {
      resultado.dados = (estoque?.itens || [])
        .filter((i) => {
          const qtd = Number(i.quantidade) || 0;
          const emTransito = Number(i.emTransito) || 0;
          const maximo = Number(i.maximo) || 0;
          return maximo > 0 && qtd + emTransito > maximo;
        })
        .map((i) => ({
          nome: i.nome,
          unidade: i.unidade || "un",
          quantidade: i.quantidade,
          emTransito: i.emTransito || 0,
          maximo: i.maximo,
          excedente: (Number(i.quantidade) || 0) + (Number(i.emTransito) || 0) - (Number(i.maximo) || 0),
        }))
        .sort((a, b) => b.excedente - a.excedente);
    } else if (relatorio === "produtosMenosSaida") {
      const saidaPorProduto = new Map();
      vendas.forEach((v) => {
        (v.itens || []).forEach((i) => {
          const chave = `${(i.nome || "").toLowerCase()}::${(i.unidade || "un").toLowerCase()}`;
          const atual = saidaPorProduto.get(chave) || { nome: i.nome, unidade: i.unidade || "un", quantidade: 0 };
          atual.quantidade += Number(i.quantidade) || 0;
          saidaPorProduto.set(chave, atual);
        });
      });
      resultado.dados = Array.from(saidaPorProduto.values())
        .sort((a, b) => a.quantidade - b.quantidade)
        .map((p) => ({ nome: p.nome, unidade: p.unidade, quantidade: p.quantidade }));
    } else if (relatorio === "todasSaidas") {
      const saidas = [];
      vendas.forEach((v) => {
        (v.itens || []).forEach((i) => {
          saidas.push({
            data: v.createdAt,
            produto: i.nome,
            unidade: i.unidade || "un",
            quantidade: i.quantidade,
            total: (i.quantidade || 0) * (i.precoUnitario || 0),
            vendaId: v._id,
          });
        });
      });
      resultado.dados = saidas.sort((a, b) => new Date(b.data) - new Date(a.data));
      resultado.totalRegistros = saidas.length;
    } else if (relatorio === "todasEntradas") {
      const filtro = { empresa: empresaId, tipo: "entrada", data: { $gte: dataInicio } };
      if (filtrarBonificados) filtro.bonificacao = true;
      const entradas = await MovimentoEstoque.find(filtro).sort({ data: -1 }).lean();
      resultado.dados = entradas.map((e) => ({
        data: e.data,
        produto: e.produto,
        unidade: e.unidade || "un",
        quantidade: e.quantidade,
        fornecedor: e.fornecedor,
        nf: e.nf,
        bonificacao: e.bonificacao,
        validade: e.validade,
        origem: e.origem,
      }));
      resultado.totalRegistros = entradas.length;
    } else if (relatorio === "proximosValidade") {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limiteValidade = new Date();
      limiteValidade.setDate(limiteValidade.getDate() + 90);
      resultado.dados = (estoque?.itens || [])
        .filter((i) => i.validadeProxima && new Date(i.validadeProxima) <= limiteValidade)
        .map((i) => ({
          nome: i.nome,
          unidade: i.unidade || "un",
          quantidade: i.quantidade,
          validadeProxima: i.validadeProxima,
          diasRestantes: Math.ceil((new Date(i.validadeProxima) - hoje) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => new Date(a.validadeProxima) - new Date(b.validadeProxima));
    } else if (relatorio === "abaixoMinimo") {
      resultado.dados = (estoque?.itens || [])
        .filter((i) => {
          const qtd = Number(i.quantidade) || 0;
          const emTransito = Number(i.emTransito) || 0;
          const minimo = Number(i.minimo) || 0;
          return minimo > 0 && qtd + emTransito < minimo;
        })
        .map((i) => ({
          nome: i.nome,
          unidade: i.unidade || "un",
          quantidade: i.quantidade,
          minimo: i.minimo,
          emTransito: i.emTransito || 0,
        }));
    } else {
      resultado.dados = [];
    }

    res.json(resultado);
  } catch (err) {
    console.error("❌ Erro ao buscar métricas:", err);
    res.status(500).json({ error: "Erro ao buscar métricas." });
  }
});

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
        codigoBarras: (item.codigoBarras || "").trim() || "",
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
    const chavesCatalogo = new Set(
      listaCatalogo
        .filter((c) => (c.nome || "").trim())
        .map((c) => `${(c.nome || "").trim().toLowerCase()}::${((c.unidade || "").trim() || "un").toLowerCase()}`)
    );
    const mapaCatalogo = new Map();
    listaCatalogo.forEach((c) => {
      const nomeNorm = (c.nome || "").trim().toLowerCase();
      const unidadeNorm = ((c.unidade || "").trim() || "un").toLowerCase();
      const chave = `${nomeNorm}::${unidadeNorm}`;
      if (nomeNorm) mapaCatalogo.set(chave, {
        nome: (c.nome || "").trim(),
        unidade: (c.unidade || "").trim() || "un",
        codigoBarras: (c.codigoBarras || "").trim() || "",
      });
    });

    let alterado = false;

    // 1) Remover do estoque itens que não estão mais no catálogo
    const antes = estoque.itens.length;
    estoque.itens = estoque.itens.filter((i) => {
      const chave = `${(i.nome || "").toLowerCase()}::${(i.unidade || "un").toLowerCase()}`;
      if (chavesCatalogo.has(chave)) return true;
      alterado = true;
      return false;
    });
    if (estoque.itens.length !== antes) {
      alterado = true;
      console.log(`🔄 Estoque: ${antes - estoque.itens.length} item(ns) removido(s) (fora do catálogo).`);
    }

    // 2) Atualizar nome/unidade/codigoBarras dos que existem e acrescentar os novos
    const chavesExistentes = new Set(
      estoque.itens.map((i) => `${(i.nome || "").toLowerCase()}::${(i.unidade || "un").toLowerCase()}`)
    );
    for (const item of listaCatalogo) {
      const nomeNorm = (item.nome || "").trim().toLowerCase();
      const unidadeNorm = ((item.unidade || "").trim() || "un").toLowerCase();
      if (!nomeNorm) continue;
      const chave = `${nomeNorm}::${unidadeNorm}`;
      const ref = mapaCatalogo.get(chave);
      if (!ref) continue;

      const existente = estoque.itens.find(
        (i) => (i.nome || "").toLowerCase() === nomeNorm && (i.unidade || "un").toLowerCase() === unidadeNorm
      );
      if (existente) {
        if (
          existente.nome !== ref.nome ||
          (existente.unidade || "un") !== ref.unidade ||
          (existente.codigoBarras || "") !== (ref.codigoBarras || "")
        ) {
          existente.nome = ref.nome;
          existente.unidade = ref.unidade;
          if (ref.codigoBarras !== undefined) existente.codigoBarras = ref.codigoBarras;
          alterado = true;
        }
      } else {
        chavesExistentes.add(chave);
        estoque.itens.push({
          nome: ref.nome,
          unidade: ref.unidade,
          codigoBarras: ref.codigoBarras || "",
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
    const { produto, quantidade, unidade, fornecedor, nf, validade, bonificacao } = req.body;

    if (!produto || !quantidade) {
      return res
        .status(400)
        .json({ error: "Produto e quantidade são obrigatórios." });
    }

    let estoque = await Estoque.findOne({ empresa: compradorId });

    if (!estoque) {
      return res.status(404).json({ error: "Estoque não encontrado." });
    }

    const dataValidade = validade ? new Date(validade) : null;
    const qtdNum = Number(quantidade) || 0;
    const isBonificacao = bonificacao === true || bonificacao === "true" || bonificacao === 1;

    const item = estoque.itens.find(
      (i) => i.nome.toLowerCase() === produto.toLowerCase()
    );

    if (item) {
      item.quantidade += qtdNum;
      item.ultimaAtualizacao = new Date();
      item.ultimaEntrada = {
        fornecedor: fornecedor || "",
        nf: nf || "",
        quantidade: qtdNum,
        data: new Date(),
        validade: dataValidade,
      };
      if (dataValidade) {
        if (!item.validadeProxima || dataValidade < item.validadeProxima) {
          item.validadeProxima = dataValidade;
        }
      }
    } else {
      estoque.itens.push({
        nome: produto,
        unidade: unidade || "un",
        quantidade: qtdNum,
        minimo: 0,
        maximo: 0,
        emTransito: 0,
        contagemReal: 0,
        validadeProxima: dataValidade,
        ultimaAtualizacao: new Date(),
        ultimaEntrada: {
          fornecedor: fornecedor || "",
          nf: nf || "",
          quantidade: qtdNum,
          data: new Date(),
          validade: dataValidade,
        },
      });
    }

    await estoque.save();

    // Registrar no histórico de movimentações para relatórios
    await MovimentoEstoque.create({
      empresa: compradorId,
      tipo: "entrada",
      produto,
      unidade: unidade || "un",
      quantidade: qtdNum,
      fornecedor: fornecedor || "",
      nf: nf || "",
      bonificacao: isBonificacao,
      validade: dataValidade,
      origem: "manual",
    });

    res.json({ message: "Entrada registrada com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao registrar entrada:", err);
    res.status(500).json({ error: "Erro interno ao registrar entrada." });
  }
});

// ============================================
// POST /api/estoque/entrada-nf/:compradorId
// Entrada em lote por Nota Fiscal (XML parseado no frontend)
// Body: { numeroNF, dataEmissao, fornecedor, itens: [{ nome, unidade, quantidade, bonificacao? }] }
// ============================================
router.post("/entrada-nf/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();
    const { numeroNF, dataEmissao, fornecedor, itens } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Envie um array de itens com nome, unidade e quantidade." });
    }

    let estoque = await Estoque.findOne({ empresa: compradorId });
    if (!estoque) {
      return res.status(404).json({ error: "Estoque não encontrado." });
    }

    const nfRef = numeroNF ? String(numeroNF).trim() : "";
    const fornecedorRef = fornecedor ? String(fornecedor).trim() : "";
    const dataEntrada = new Date();

    for (const item of itens) {
      const nome = String(item.nome || "").trim();
      const unidade = (item.unidade || "un").trim() || "un";
      const quantidade = Number(item.quantidade) || 0;
      const isBonificacao = item.bonificacao === true || item.bonificacao === "true" || item.bonificacao === 1;
      const dataValidade = item.validade ? new Date(item.validade) : null;
      if (!nome || quantidade <= 0) continue;

      const existente = estoque.itens.find(
        (i) => (i.nome || "").toLowerCase() === nome.toLowerCase() && (i.unidade || "un") === unidade
      );
      if (existente) {
        existente.quantidade += quantidade;
        existente.ultimaAtualizacao = new Date();
        existente.ultimaEntrada = {
          fornecedor: fornecedorRef,
          nf: nfRef,
          quantidade,
          data: dataEntrada,
          validade: dataValidade,
        };
        if (dataValidade && (!existente.validadeProxima || dataValidade < existente.validadeProxima)) {
          existente.validadeProxima = dataValidade;
        }
      } else {
        estoque.itens.push({
          nome,
          unidade,
          quantidade,
          minimo: 0,
          maximo: 0,
          emTransito: 0,
          contagemReal: 0,
          validadeProxima: dataValidade,
          ultimaAtualizacao: new Date(),
          ultimaEntrada: {
            fornecedor: fornecedorRef,
            nf: nfRef,
            quantidade,
            data: dataEntrada,
            validade: dataValidade,
          },
        });
      }

      await MovimentoEstoque.create({
        empresa: compradorId,
        tipo: "entrada",
        produto: nome,
        unidade,
        quantidade,
        fornecedor: fornecedorRef,
        nf: nfRef,
        bonificacao: isBonificacao,
        validade: dataValidade,
        origem: "entrada_nf",
      });
    }

    await estoque.save();

    res.json({
      message: "Entrada por nota fiscal registrada com sucesso.",
      itensProcessados: itens.filter((i) => i.nome && Number(i.quantidade) > 0).length,
    });
  } catch (err) {
    console.error("❌ Erro ao registrar entrada por NF:", err);
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