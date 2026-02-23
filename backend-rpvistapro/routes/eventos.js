// routes/eventos.js
import express from "express";
import Evento from "../models/Evento.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const status = req.query.status;
    const filtro = { empresa };
    if (status) filtro.status = status;
    const lista = await Evento.find(filtro).sort({ createdAt: -1 }).lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar eventos:", err);
    res.status(500).json({ error: "Erro ao listar." });
  }
});

// Acesso público por token — deve vir antes de /:id
router.get("/acesso/:token", async (req, res) => {
  try {
    const evento = await Evento.findOne({ tokenAcesso: req.params.token }).lean();
    if (!evento) return res.status(404).json({ error: "Link inválido ou expirado." });
    res.json(evento);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.patch("/acesso/:token", async (req, res) => {
  try {
    const evento = await Evento.findOne({ tokenAcesso: req.params.token });
    if (!evento) return res.status(404).json({ error: "Link inválido ou expirado." });
    const { cliente, itens, dataEvento, tipoEvento, localEvento, qtdConvidados } = req.body;
    if (cliente && typeof cliente === "object") {
      evento.cliente = { ...evento.cliente, ...cliente };
    }
    if (dataEvento !== undefined) evento.dataEvento = dataEvento ? new Date(dataEvento) : null;
    if (tipoEvento !== undefined) evento.tipoEvento = tipoEvento?.trim() || null;
    if (localEvento !== undefined) evento.localEvento = localEvento?.trim() || null;
    if (qtdConvidados !== undefined) evento.qtdConvidados = Number(qtdConvidados) || null;
    if (Array.isArray(itens)) evento.itens = itens.map((i) => ({ produtoId: i.produtoId, nome: i.nome || "", descricao: i.descricao, quantidade: i.quantidade || 1, precoUnitario: i.precoUnitario || 0, unidade: i.unidade || "un" }));
    evento.valorTotal = evento.itens.reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
    evento.status = "aguardando_cliente";
    await evento.save();
    res.json(evento);
  } catch (err) {
    console.error("Erro ao atualizar por link:", err);
    res.status(500).json({ error: "Erro ao salvar." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id).lean();
    if (!evento) return res.status(404).json({ error: "Evento não encontrado." });
    res.json(evento);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { empresa, codigo, cliente, dataEvento, tipoEvento, localEvento, qtdConvidados } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const novo = await Evento.create({
      empresa,
      codigo: codigo?.trim() || null,
      cliente: cliente || {},
      dataEvento: dataEvento ? new Date(dataEvento) : null,
      tipoEvento: tipoEvento?.trim() || null,
      localEvento: localEvento?.trim() || null,
      qtdConvidados: qtdConvidados ? Number(qtdConvidados) : null,
    });
    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro ao criar evento:", err);
    res.status(500).json({ error: "Erro ao criar." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { codigo, cliente, dataEvento, tipoEvento, localEvento, qtdConvidados, itens, status } = req.body;
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: "Evento não encontrado." });
    if (codigo !== undefined) evento.codigo = codigo?.trim() || null;
    if (cliente && typeof cliente === "object") evento.cliente = { ...evento.cliente, ...cliente };
    if (dataEvento !== undefined) evento.dataEvento = dataEvento ? new Date(dataEvento) : null;
    if (tipoEvento !== undefined) evento.tipoEvento = tipoEvento?.trim() || null;
    if (localEvento !== undefined) evento.localEvento = localEvento?.trim() || null;
    if (qtdConvidados !== undefined) evento.qtdConvidados = qtdConvidados ? Number(qtdConvidados) : null;
    if (Array.isArray(itens)) {
      evento.itens = itens.map((i) => ({
        produtoId: i.produtoId,
        nome: i.nome || "",
        descricao: i.descricao,
        quantidade: i.quantidade || 1,
        precoUnitario: i.precoUnitario || 0,
        unidade: i.unidade || "un",
      }));
    }
    if (status) evento.status = status;
    evento.valorTotal = evento.itens.reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
    await evento.save();
    res.json(evento);
  } catch (err) {
    console.error("Erro ao atualizar:", err);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const excluido = await Evento.findByIdAndDelete(req.params.id);
    if (!excluido) return res.status(404).json({ error: "Evento não encontrado." });
    res.json({ message: "Evento excluído." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir." });
  }
});

export default router;
