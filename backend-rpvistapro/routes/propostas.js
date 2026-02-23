// routes/propostas.js — Propostas salvas (formulário PropostaVistaLagoa)
import express from "express";
import Proposta from "../models/Proposta.js";
import { enviarPropostaContrato } from "../services/emailService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const status = req.query.status;
    const filtro = { empresa };
    if (status) filtro.status = status;
    const lista = await Proposta.find(filtro)
      .populate("tipoProposta", "nome subtitulo")
      .sort({ createdAt: -1 })
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar propostas:", err);
    res.status(500).json({ error: "Erro ao listar." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const proposta = await Proposta.findById(req.params.id)
      .populate("tipoProposta")
      .lean();
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json(proposta);
  } catch (err) {
    console.error("Erro ao buscar proposta:", err);
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, tipoProposta, dados, escopo, gastronomia, bar, pagamento, valorTotal } = req.body;
    if (!empresa || !tipoProposta) return res.status(400).json({ error: "empresa e tipoProposta são obrigatórios." });
    const novo = await Proposta.create({
      empresa,
      tipoProposta,
      dados: dados || {},
      escopo: escopo || {},
      gastronomia: gastronomia || {},
      bar: bar || {},
      pagamento: pagamento || {},
      valorTotal: valorTotal || 0,
    });
    const pop = await Proposta.findById(novo._id).populate("tipoProposta", "nome subtitulo").lean();
    res.status(201).json(pop);
  } catch (err) {
    console.error("Erro ao criar proposta:", err);
    res.status(500).json({ error: "Erro ao criar." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { dados, escopo, gastronomia, bar, pagamento, valorTotal, status } = req.body;
    const proposta = await Proposta.findById(req.params.id);
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada." });
    if (dados !== undefined) proposta.dados = dados;
    if (escopo !== undefined) proposta.escopo = escopo;
    if (gastronomia !== undefined) proposta.gastronomia = gastronomia;
    if (bar !== undefined) proposta.bar = bar;
    if (pagamento !== undefined) proposta.pagamento = pagamento;
    if (valorTotal !== undefined) proposta.valorTotal = valorTotal;
    if (status && ["em_aberto", "rejeitada", "aceita", "paga"].includes(status)) proposta.status = status;
    await proposta.save();
    const pop = await Proposta.findById(proposta._id).populate("tipoProposta", "nome subtitulo").lean();
    res.json(pop);
  } catch (err) {
    console.error("Erro ao atualizar proposta:", err);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["em_aberto", "rejeitada", "aceita", "paga"].includes(status)) {
      return res.status(400).json({ error: "status inválido. Use: em_aberto, rejeitada, aceita, paga." });
    }
    const proposta = await Proposta.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    )
      .populate("tipoProposta", "nome subtitulo")
      .lean();
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json(proposta);
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.post("/:id/enviar", async (req, res) => {
  try {
    const proposta = await Proposta.findById(req.params.id)
      .populate("tipoProposta")
      .lean();
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada." });
    const emailCliente = proposta.dados?.email;
    if (!emailCliente?.trim()) return res.status(400).json({ error: "Proposta sem email do cliente." });
    const pdfBase64 = req.body.pdfBase64;
    if (!pdfBase64) return res.status(400).json({ error: "pdfBase64 é obrigatório." });
    const enviado = await enviarPropostaContrato(emailCliente, proposta.dados?.nome || "Cliente", proposta, pdfBase64);
    if (!enviado) return res.status(500).json({ error: "Erro ao enviar email." });
    res.json({ message: "Contrato enviado por email com sucesso." });
  } catch (err) {
    console.error("Erro ao enviar proposta:", err);
    res.status(500).json({ error: "Erro ao enviar." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await Proposta.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ message: "Proposta excluída." });
  } catch (err) {
    console.error("Erro ao excluir proposta:", err);
    res.status(500).json({ error: "Erro ao excluir." });
  }
});

export default router;
