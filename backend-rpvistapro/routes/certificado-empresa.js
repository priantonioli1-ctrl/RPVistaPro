// routes/certificado-empresa.js — Gestão do certificado digital da empresa
import express from "express";
import mongoose from "mongoose";
import CertificadoEmpresa from "../models/CertificadoEmpresa.js";

const router = express.Router();

// GET /api/certificado-empresa/:empresaId — Verificar se existe certificado (não retorna o arquivo)
router.get("/:empresaId", async (req, res) => {
  try {
    const empresaId = req.params.empresaId.trim();
    if (!mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }
    const doc = await CertificadoEmpresa.findOne({
      empresa: new mongoose.Types.ObjectId(empresaId),
    })
      .select("-certificadoBase64 -senhaCriptografada")
      .lean();
    if (!doc) {
      return res.json({ configurado: false, message: "Nenhum certificado configurado." });
    }
    res.json({
      configurado: true,
      tipo: doc.tipo,
      validadeAte: doc.validadeAte,
      ultimoUso: doc.ultimoUso,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar certificado:", err);
    res.status(500).json({ error: "Erro ao buscar certificado." });
  }
});

// POST /api/certificado-empresa/:empresaId — Salvar certificado (arquivo em base64 + senha)
router.post("/:empresaId", async (req, res) => {
  try {
    const empresaId = req.params.empresaId.trim();
    const { certificadoBase64, senha, validadeAte } = req.body;

    if (!mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }
    if (!certificadoBase64 || typeof certificadoBase64 !== "string") {
      return res.status(400).json({ error: "Envie o certificado em base64 (arquivo .pfx convertido)." });
    }

    const empresaObjId = new mongoose.Types.ObjectId(empresaId);

    const doc = await CertificadoEmpresa.findOneAndUpdate(
      { empresa: empresaObjId },
      {
        certificadoBase64: certificadoBase64.trim(),
        senhaCriptografada: senha ? String(senha) : "", // TODO: criptografar em produção
        validadeAte: validadeAte ? new Date(validadeAte) : null,
        tipo: "A1",
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Certificado salvo com sucesso.",
      validadeAte: doc.validadeAte,
    });
  } catch (err) {
    console.error("❌ Erro ao salvar certificado:", err);
    res.status(500).json({ error: "Erro ao salvar certificado." });
  }
});

// DELETE /api/certificado-empresa/:empresaId — Remover certificado
router.delete("/:empresaId", async (req, res) => {
  try {
    const empresaId = req.params.empresaId.trim();
    if (!mongoose.Types.ObjectId.isValid(empresaId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }
    await CertificadoEmpresa.deleteOne({ empresa: new mongoose.Types.ObjectId(empresaId) });
    res.json({ message: "Certificado removido." });
  } catch (err) {
    console.error("❌ Erro ao remover certificado:", err);
    res.status(500).json({ error: "Erro ao remover certificado." });
  }
});

export default router;
