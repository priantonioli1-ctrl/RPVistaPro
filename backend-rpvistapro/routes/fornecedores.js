// routes/fornecedores.js
// Rotas para gerenciar clientes de fornecedores
import express from "express";
import mongoose from "mongoose";
import FornecedorCliente from "../models/FornecedorCliente.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();

/* ============================================================
   📌 GET /:fornecedorId/clientes — Listar clientes do fornecedor
============================================================ */
router.get("/:fornecedorId/clientes", async (req, res) => {
  try {
    const { fornecedorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fornecedorId)) {
      return res.status(400).json({ error: "ID de fornecedor inválido." });
    }

    const clientes = await FornecedorCliente.find({ fornecedorId })
      .populate("compradorId", "nome empresa cnpj email ramoAtuacao")
      .lean();

    const clientesFormatados = clientes.map((c) => ({
      _id: c.compradorId._id,
      compradorId: c.compradorId._id,
      nome: c.compradorId.nome || c.compradorId.empresa,
      empresa: c.compradorId.empresa,
      cnpj: c.compradorId.cnpj,
      email: c.compradorId.email,
      ramoAtuacao: c.compradorId.ramoAtuacao || "",
    }));

    res.json({ clientes: clientesFormatados });
  } catch (err) {
    console.error("❌ Erro ao listar clientes:", err);
    res.status(500).json({ error: "Erro ao listar clientes do fornecedor." });
  }
});

/* ============================================================
   📌 POST /:fornecedorId/clientes — Adicionar cliente
============================================================ */
router.post("/:fornecedorId/clientes", async (req, res) => {
  try {
    const { fornecedorId } = req.params;
    const { compradorId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fornecedorId)) {
      return res.status(400).json({ error: "ID de fornecedor inválido." });
    }

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de comprador inválido." });
    }

    // Verificar se o comprador existe e é do tipo comprador
    const comprador = await Usuario.findById(compradorId);
    if (!comprador) {
      return res.status(404).json({ error: "Comprador não encontrado." });
    }

    if (comprador.tipo?.toLowerCase() !== "comprador") {
      return res.status(400).json({ error: "O usuário selecionado não é um comprador." });
    }

    // Verificar se já existe
    const existente = await FornecedorCliente.findOne({
      fornecedorId,
      compradorId,
    });

    if (existente) {
      return res.status(400).json({ error: "Este comprador já está na sua lista de clientes." });
    }

    // Criar relação
    const novo = await FornecedorCliente.create({
      fornecedorId,
      compradorId,
    });

    const cliente = await FornecedorCliente.findById(novo._id)
      .populate("compradorId", "nome empresa cnpj email")
      .lean();

    res.json({
      _id: cliente.compradorId._id,
      compradorId: cliente.compradorId._id,
      nome: cliente.compradorId.nome || cliente.compradorId.empresa,
      empresa: cliente.compradorId.empresa,
      cnpj: cliente.compradorId.cnpj,
      email: cliente.compradorId.email,
    });
  } catch (err) {
    console.error("❌ Erro ao adicionar cliente:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Este comprador já está na sua lista de clientes." });
    }
    res.status(500).json({ error: "Erro ao adicionar cliente." });
  }
});

/* ============================================================
   📌 DELETE /:fornecedorId/clientes/:compradorId — Remover cliente
============================================================ */
router.delete("/:fornecedorId/clientes/:compradorId", async (req, res) => {
  try {
    const { fornecedorId, compradorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fornecedorId) || !mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "IDs inválidos." });
    }

    const removido = await FornecedorCliente.findOneAndDelete({
      fornecedorId,
      compradorId,
    });

    if (!removido) {
      return res.status(404).json({ error: "Cliente não encontrado na sua lista." });
    }

    res.json({ message: "Cliente removido com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao remover cliente:", err);
    res.status(500).json({ error: "Erro ao remover cliente." });
  }
});

export default router;
