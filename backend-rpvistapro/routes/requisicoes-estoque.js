import express from "express";
import mongoose from "mongoose";
import RequisicaoEstoque from "../models/RequisicaoEstoque.js";
import Catalogo from "../models/Catalogo.js";
import Estoque from "../models/Estoque.js";

export default function requisicoesEstoqueRoutes(io) {
  const router = express.Router();

  // 🔗 GET estoque disponível por token (itens com quantidade > 0 — base para a página de requisição por link)
  router.get("/estoque/:token", async (req, res) => {
    try {
      const token = req.params.token;
      let empresaId;
      try {
        empresaId = Buffer.from(token, "base64").toString("utf8");
      } catch {
        return res.status(400).json({ error: "Link inválido." });
      }
      if (!mongoose.Types.ObjectId.isValid(empresaId)) {
        return res.status(400).json({ error: "Link inválido." });
      }
      const empresaObjId = new mongoose.Types.ObjectId(empresaId);
      const estoque = await Estoque.findOne({ empresa: empresaObjId }).lean();
      if (!estoque || !estoque.itens?.length) {
        return res.json({ itens: [] });
      }
      const disponiveis = estoque.itens
        .filter((i) => Number(i.quantidade) > 0)
        .map((i) => ({
          nome: i.nome,
          unidade: i.unidade || "un",
          quantidade: Number(i.quantidade),
        }));
      res.json({ itens: disponiveis });
    } catch (err) {
      console.error("❌ Erro ao buscar estoque por link:", err);
      res.status(500).json({ error: "Erro ao carregar estoque." });
    }
  });

  // 🔗 GET catálogo com estoque por token (categorias/seções + itens com quantidade disponível)
  router.get("/catalogo-com-estoque/:token", async (req, res) => {
    try {
      const token = req.params.token;
      let empresaId;
      try {
        empresaId = Buffer.from(token, "base64").toString("utf8");
      } catch {
        return res.status(400).json({ error: "Link inválido." });
      }
      if (!mongoose.Types.ObjectId.isValid(empresaId)) {
        return res.status(400).json({ error: "Link inválido." });
      }
      const empresaObjId = new mongoose.Types.ObjectId(empresaId);

      const [catalogo, estoque] = await Promise.all([
        Catalogo.findOne({ empresa: empresaObjId }).lean(),
        Estoque.findOne({ empresa: empresaObjId }).lean(),
      ]);

      const itensCatalogo = Array.isArray(catalogo?.catalogo) ? catalogo.catalogo : [];
      const itensEstoque = Array.isArray(estoque?.itens) ? estoque.itens : [];

      const mapaEstoque = new Map();
      itensEstoque.forEach((i) => {
        const chave = `${(i.nome || "").trim().toLowerCase()}::${(i.unidade || "un").trim().toLowerCase()}`;
        mapaEstoque.set(chave, Number(i.quantidade) || 0);
      });

      const itens = itensCatalogo.map((item) => {
        const nome = (item.nome || "").trim();
        const unidade = (item.unidade || "").trim() || "un";
        const chave = `${nome.toLowerCase()}::${unidade.toLowerCase()}`;
        const quantidadeDisponivel = mapaEstoque.get(chave) ?? 0;
        return {
          secao: (item.secao || "").trim() || "Sem seção",
          nome,
          marca: (item.marca || "").trim(),
          unidade,
          quantidadeDisponivel,
        };
      });

      const categorias = [...new Set(itens.map((i) => i.secao).filter(Boolean))].sort();

      res.json({ categorias, itens });
    } catch (err) {
      console.error("❌ Erro ao buscar catálogo com estoque por link:", err);
      res.status(500).json({ error: "Erro ao carregar catálogo." });
    }
  });

  // 🔗 GET catálogo por token (mantido para compatibilidade; preferir /estoque para requisição por link)
  router.get("/catalogo/:token", async (req, res) => {
    try {
      const token = req.params.token;
      let empresaId;
      try {
        empresaId = Buffer.from(token, "base64").toString("utf8");
      } catch {
        return res.status(400).json({ error: "Link inválido." });
      }
      const catalogo = await Catalogo.findOne({ empresa: empresaId }).lean();
      if (!catalogo || !catalogo.catalogo?.length) {
        return res.status(404).json({ error: "Catálogo não encontrado." });
      }
      res.json({ catalogo: catalogo.catalogo, empresaId });
    } catch (err) {
      console.error("❌ Erro ao buscar catálogo por link:", err);
      res.status(500).json({ error: "Erro ao carregar catálogo." });
    }
  });

  // 🔗 POST criar requisição por link (quantidade solicitada não pode superar o disponível em estoque)
  router.post("/por-link", async (req, res) => {
    try {
      const { token, setorOrigem, funcionarioNome, observacoes, itens } = req.body;
      if (!token || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: "Token e itens são obrigatórios." });
      }
      let empresaId;
      try {
        empresaId = Buffer.from(token, "base64").toString("utf8");
      } catch {
        return res.status(400).json({ error: "Link inválido." });
      }
      const itensNorm = itens
        .filter((i) => i.nome && Number(i.quantidade) > 0)
        .map((i) => ({
          produtoId: i.produtoId || null,
          nome: i.nome,
          unidade: i.unidade || "un",
          quantidade: Number(i.quantidade),
        }));
      if (itensNorm.length === 0) {
        return res.status(400).json({ error: "Nenhum item válido." });
      }

      const empresaObjId = new mongoose.Types.ObjectId(empresaId);
      const estoque = await Estoque.findOne({ empresa: empresaObjId }).lean();
      if (!estoque || !estoque.itens?.length) {
        return res.status(400).json({ error: "Estoque não encontrado." });
      }
      const mapaEstoque = new Map(
        estoque.itens.map((i) => [(i.nome || "").toLowerCase(), Number(i.quantidade) || 0])
      );
      for (const i of itensNorm) {
        const disp = mapaEstoque.get((i.nome || "").toLowerCase());
        if (disp === undefined || i.quantidade > disp) {
          return res.status(400).json({
            error: `Quantidade solicitada de "${i.nome}" não pode ser maior que o disponível em estoque (${disp ?? 0}).`,
          });
        }
      }

      const numero = await gerarNumero(empresaId);
      const novaReq = await RequisicaoEstoque.create({
        numero,
        empresa: empresaId,
        setorOrigem: setorOrigem || "Requisição por link",
        criadoPor: funcionarioNome || "Requisição por link",
        prioridade: "Normal",
        observacoes: observacoes || "",
        itens: itensNorm,
        status: "Pendente",
      });
      io.emit("requisicao_estoque_nova", novaReq);
      res.status(201).json(novaReq);
    } catch (err) {
      console.error("❌ Erro ao criar requisição por link:", err);
      res.status(500).json({ error: "Erro ao criar requisição." });
    }
  });

  // 🔢 Função para gerar número sequencial por empresa
  async function gerarNumero(empresa) {
    const ultima = await RequisicaoEstoque
      .findOne({ empresa })
      .sort({ numero: -1 });

    return ultima ? ultima.numero + 1 : 1;
  }

  // 🚀 CRIAR REQUISIÇÃO
  router.post("/", async (req, res) => {
    try {
      const {
        empresa,
        setorOrigem,
        criadoPor,
        prioridade,
        observacoes,
        itens,
      } = req.body;

      const numero = await gerarNumero(empresa);

      const novaReq = await RequisicaoEstoque.create({
        numero,
        empresa,
        setorOrigem,
        criadoPor,
        prioridade,
        observacoes,
        itens,
        status: "Pendente",
      });

      // 🔔 Disparar atualização tempo real
      io.emit("requisicao_estoque_nova", novaReq);

      res.status(201).json(novaReq);
    } catch (err) {
      console.error("❌ Erro ao criar requisição:", err);
      res.status(500).json({ error: "Erro ao criar requisição." });
    }
  });

  // 📌 LISTAR REQUISIÇÕES
  router.get("/", async (req, res) => {
    try {
      const { empresa, setorOrigem } = req.query;

      const filtro = { empresa };
      if (setorOrigem) filtro.setorOrigem = setorOrigem;

      const lista = await RequisicaoEstoque.find(filtro).sort({ createdAt: -1 });

      res.json(lista);
    } catch (err) {
      console.error("❌ Erro ao listar requisições:", err);
      res.status(500).json({ error: "Erro ao listar requisições." });
    }
  });

  // 🔄 ATUALIZAR STATUS DA REQUISIÇÃO
  router.patch("/:id/status", async (req, res) => {
    try {
      const { status } = req.body;

      const reqAtualizada = await RequisicaoEstoque.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      // 🔔 avisar cozinha que mudou
      io.emit("requisicao_estoque_atualizada", reqAtualizada);

      res.json(reqAtualizada);
    } catch (err) {
      console.error("❌ Erro ao atualizar status:", err);
      res.status(500).json({ error: "Erro ao atualizar status." });
    }
  });

  return router;
}