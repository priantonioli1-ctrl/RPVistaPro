// routes/orcamentos.js — Venda Personalizada: orçamentos (evento, obra, serviço)
import express from "express";
import Orcamento from "../models/Orcamento.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const status = req.query.status;
    const filtro = { empresa };
    if (status) filtro.status = status;
    const lista = await Orcamento.find(filtro).sort({ createdAt: -1 }).lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar orçamentos:", err);
    res.status(500).json({ error: "Erro ao listar." });
  }
});

router.get("/acesso/:token", async (req, res) => {
  try {
    const orc = await Orcamento.findOne({ tokenAcesso: req.params.token }).lean();
    if (!orc) return res.status(404).json({ error: "Link inválido ou expirado." });
    res.json(orc);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.patch("/acesso/:token", async (req, res) => {
  try {
    const orc = await Orcamento.findOne({ tokenAcesso: req.params.token });
    if (!orc) return res.status(404).json({ error: "Link inválido ou expirado." });
    const { cliente, itens, dataEvento, tipoEvento, localEvento, qtdConvidados, respostasCustom } = req.body;
    if (cliente && typeof cliente === "object") orc.cliente = { ...orc.cliente, ...cliente };
    if (dataEvento !== undefined) orc.dataEvento = dataEvento ? new Date(dataEvento) : null;
    if (tipoEvento !== undefined) orc.tipoEvento = tipoEvento?.trim() || null;
    if (localEvento !== undefined) orc.localEvento = localEvento?.trim() || null;
    if (qtdConvidados !== undefined) orc.qtdConvidados = Number(qtdConvidados) || null;
    if (respostasCustom && typeof respostasCustom === "object") orc.respostasCustom = { ...orc.respostasCustom, ...respostasCustom };
    if (Array.isArray(itens)) orc.itens = itens.map((i) => ({ produtoId: i.produtoId, nome: i.nome || "", descricao: i.descricao, quantidade: i.quantidade || 1, precoUnitario: i.precoUnitario || 0, unidade: i.unidade || "un" }));
    orc.valorTotal = orc.itens.reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
    orc.status = "aguardando_cliente";
    await orc.save();
    res.json(orc);
  } catch (err) {
    console.error("Erro ao atualizar por link:", err);
    res.status(500).json({ error: "Erro ao salvar." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const orc = await Orcamento.findById(req.params.id).lean();
    if (!orc) return res.status(404).json({ error: "Orçamento não encontrado." });
    res.json(orc);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, codigo, cliente, dataEvento, tipoEvento, localEvento, qtdConvidados, fichaConfig, modeloFichaId } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const novo = await Orcamento.create({
      empresa,
      codigo: codigo?.trim() || null,
      cliente: cliente || {},
      fichaConfig: fichaConfig || {},
      modeloFichaId: modeloFichaId || null,
      dataEvento: dataEvento ? new Date(dataEvento) : null,
      tipoEvento: tipoEvento?.trim() || null,
      localEvento: localEvento?.trim() || null,
      qtdConvidados: qtdConvidados ? Number(qtdConvidados) : null,
    });
    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro ao criar orçamento:", err);
    res.status(500).json({ error: "Erro ao criar." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { codigo, cliente, dataEvento, tipoEvento, localEvento, qtdConvidados, itens, status } = req.body;
    const orc = await Orcamento.findById(req.params.id);
    if (!orc) return res.status(404).json({ error: "Orçamento não encontrado." });
    if (codigo !== undefined) orc.codigo = codigo?.trim() || null;
    if (cliente && typeof cliente === "object") orc.cliente = { ...orc.cliente, ...cliente };
    if (dataEvento !== undefined) orc.dataEvento = dataEvento ? new Date(dataEvento) : null;
    if (tipoEvento !== undefined) orc.tipoEvento = tipoEvento?.trim() || null;
    if (localEvento !== undefined) orc.localEvento = localEvento?.trim() || null;
    if (qtdConvidados !== undefined) orc.qtdConvidados = qtdConvidados ? Number(qtdConvidados) : null;
    if (Array.isArray(itens)) orc.itens = itens.map((i) => ({ produtoId: i.produtoId, nome: i.nome || "", descricao: i.descricao, quantidade: i.quantidade || 1, precoUnitario: i.precoUnitario || 0, unidade: i.unidade || "un" }));
    if (status) orc.status = status;
    orc.valorTotal = orc.itens.reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
    await orc.save();
    res.json(orc);
  } catch (err) {
    console.error("Erro ao atualizar:", err);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await Orcamento.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Orçamento não encontrado." });
    res.json({ message: "Orçamento excluído." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir." });
  }
});

export default router;
