// routes/impressora-fiscal.js — Configuração e emissão de cupom fiscal
import express from "express";
import mongoose from "mongoose";
import ImpressoraFiscal from "../models/ImpressoraFiscal.js";
import Venda from "../models/Venda.js";

const router = express.Router();

// GET / — Buscar configuração da impressora fiscal da empresa
router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const empresaId = mongoose.Types.ObjectId.isValid(empresa) ? new mongoose.Types.ObjectId(empresa) : null;
    if (!empresaId) return res.status(400).json({ error: "ID de empresa inválido." });

    const config = await ImpressoraFiscal.findOne({ empresa: empresaId }).lean();
    res.json(config || { ativo: false, tipo: "agente_local", urlAgente: "http://localhost:9999" });
  } catch (err) {
    console.error("Erro ao buscar impressora fiscal:", err);
    res.status(500).json({ error: "Erro ao buscar configuração." });
  }
});

// PUT / — Salvar configuração da impressora fiscal
router.put("/", async (req, res) => {
  try {
    const { empresa, ativo, modelo, tipo, urlAgente, porta, ip, nomeFantasia, cnpj, endereco } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const empresaId = mongoose.Types.ObjectId.isValid(empresa) ? new mongoose.Types.ObjectId(empresa) : null;
    if (!empresaId) return res.status(400).json({ error: "ID de empresa inválido." });

    const update = {
      empresa: empresaId,
      ativo: !!ativo,
      modelo: String(modelo || "").trim(),
      tipo: ["ecf", "termica", "nfce_api", "agente_local"].includes(tipo) ? tipo : "agente_local",
      urlAgente: String(urlAgente || "http://localhost:9999").trim(),
      porta: String(porta || "").trim(),
      ip: String(ip || "").trim(),
      nomeFantasia: String(nomeFantasia || "").trim(),
      cnpj: String(cnpj || "").trim(),
      endereco: String(endereco || "").trim(),
    };

    const config = await ImpressoraFiscal.findOneAndUpdate(
      { empresa: empresaId },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    res.json(config);
  } catch (err) {
    console.error("Erro ao salvar impressora fiscal:", err);
    res.status(500).json({ error: "Erro ao salvar configuração." });
  }
});

// GET /dados-venda/:id — Retorna dados da venda para impressão (fallback se o agente precisar buscar)
router.get("/dados-venda/:id", async (req, res) => {
  try {
    const venda = await Venda.findById(req.params.id).lean();
    if (!venda) return res.status(404).json({ error: "Venda não encontrada." });
    res.json(venda);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar venda." });
  }
});

export default router;
