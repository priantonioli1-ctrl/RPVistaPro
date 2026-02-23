import express from "express";
import NotaFiscal from "../models/NotaFiscal.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { fornecedor, empresa } = req.query;
    const filter = {};
    if (fornecedor && (fornecedor + "").trim()) filter.fornecedor = (fornecedor + "").trim();
    if (empresa && (empresa + "").trim()) {
      const emp = (empresa + "").trim();
      filter.$or = [{ compradorId: emp }, { comprador: emp }];
    }
    const lista = await NotaFiscal.find(filter)
      .populate("pedido", "status createdAt")
      .sort({ dataEmissao: -1 })
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("❌ Erro ao listar notas fiscais:", err);
    res.status(500).json({ error: "Erro ao listar notas fiscais." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await NotaFiscal.findById(req.params.id)
      .populate("pedido", "status createdAt dataEntrega")
      .lean();
    if (!doc) return res.status(404).json({ error: "Nota fiscal não encontrada." });
    res.json(doc);
  } catch (err) {
    console.error("❌ Erro ao buscar nota fiscal:", err);
    res.status(500).json({ error: "Erro ao buscar nota fiscal." });
  }
});

export default router;
