// routes/nfce.js — Emissão de NFC-e (modelo 65) — SEFAZ-RJ
import express from "express";
import mongoose from "mongoose";
import ConfiguracaoNFCe from "../models/ConfiguracaoNFCe.js";
import { emitirNFCe } from "../services/nfce/emissorNFCe.js";

const router = express.Router();

// GET / — Configuração NFC-e da empresa
router.get("/config", async (req, res) => {
  try {
    const empresa = req.query.empresa;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const empresaId = mongoose.Types.ObjectId.isValid(empresa) ? new mongoose.Types.ObjectId(empresa) : null;
    if (!empresaId) return res.status(400).json({ error: "ID de empresa inválido." });

    const config = await ConfiguracaoNFCe.findOne({ empresa: empresaId }).lean();
    if (!config) {
      return res.json({ ativo: false, message: "Configure a emissão de NFC-e em Administrativo." });
    }
    res.json(config);
  } catch (err) {
    console.error("Erro ao buscar config NFC-e:", err);
    res.status(500).json({ error: "Erro ao buscar configuração." });
  }
});

// PUT /config — Salvar configuração NFC-e
router.put("/config", async (req, res) => {
  try {
    const { empresa, ...resto } = req.body;
    if (!empresa) return res.status(400).json({ error: "empresa é obrigatório." });
    const empresaId = mongoose.Types.ObjectId.isValid(empresa) ? new mongoose.Types.ObjectId(empresa) : null;
    if (!empresaId) return res.status(400).json({ error: "ID de empresa inválido." });

    const update = {
      empresa: empresaId,
      tpAmb: [1, 2].includes(Number(resto.tpAmb)) ? Number(resto.tpAmb) : 2,
      cnpj: String(resto.cnpj || "").replace(/\D/g, ""),
      razaoSocial: String(resto.razaoSocial || "").trim(),
      nomeFantasia: String(resto.nomeFantasia || "").trim(),
      inscricaoEstadual: String(resto.inscricaoEstadual || "").trim(),
      crt: [1, 2, 3].includes(Number(resto.crt)) ? Number(resto.crt) : 1,
      csc: String(resto.csc || "").trim(),
      idCsc: Number(resto.idCsc) || 1,
      serie: Number(resto.serie) || 1,
      ativo: !!resto.ativo,
    };
    if (resto.endereco && typeof resto.endereco === "object") {
      update.endereco = {
        xLgr: String(resto.endereco.xLgr || "").trim(),
        nro: String(resto.endereco.nro || "").trim(),
        xBairro: String(resto.endereco.xBairro || "").trim(),
        cMun: String(resto.endereco.cMun || "").trim(),
        xMun: String(resto.endereco.xMun || "").trim(),
        uf: String(resto.endereco.uf || "RJ").trim(),
        cep: String(resto.endereco.cep || "").replace(/\D/g, "").slice(0, 8),
      };
    }

    const config = await ConfiguracaoNFCe.findOneAndUpdate(
      { empresa: empresaId },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    res.json(config);
  } catch (err) {
    console.error("Erro ao salvar config NFC-e:", err);
    res.status(500).json({ error: "Erro ao salvar configuração." });
  }
});

// POST /emitir — Emitir NFC-e a partir de uma venda
router.post("/emitir", async (req, res) => {
  try {
    const { empresa, venda, contingencia } = req.body;
    if (!empresa || !venda) {
      return res.status(400).json({ error: "empresa e venda são obrigatórios." });
    }
    const empresaId = mongoose.Types.ObjectId.isValid(empresa) ? new mongoose.Types.ObjectId(empresa) : null;
    if (!empresaId) return res.status(400).json({ error: "ID de empresa inválido." });

    const config = await ConfiguracaoNFCe.findOne({ empresa: empresaId }).lean();
    if (!config?.ativo) {
      return res.status(400).json({ error: "Emissão de NFC-e não configurada ou inativa." });
    }

    const vendaFormatada = {
      itens: Array.isArray(venda.itens) ? venda.itens : [],
      total: Number(venda.total) || 0,
      formaPagamento: String(venda.formaPagamento || "Dinheiro").trim(),
      desconto: Number(venda.desconto) || 0,
      observacoes: String(venda.observacoes || "").trim(),
    };

    const resultado = await emitirNFCe(config, vendaFormatada, empresaId, !!contingencia);

    if (!resultado.sucesso) {
      return res.status(400).json({ error: resultado.erro });
    }

    res.json(resultado);
  } catch (err) {
    console.error("Erro ao emitir NFC-e:", err);
    res.status(500).json({ error: err.message || "Erro ao emitir NFC-e." });
  }
});

export default router;
