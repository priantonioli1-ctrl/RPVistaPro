// models/CertificadoEmpresa.js — Certificado digital A1 (.pfx) da empresa
// Usado para consultar NF-e na SEFAZ, manifestar destino, etc.
import mongoose from "mongoose";

const CertificadoEmpresaSchema = new mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      unique: true,
      index: true,
    },
    // Certificado em base64 (arquivo .pfx)
    certificadoBase64: { type: String, default: "" },
    // Senha do certificado — em produção, criptografar com crypto
    senhaCriptografada: { type: String, default: "" },
    // Tipo: A1 (arquivo) ou A3 (token/smartcard) — A3 exige driver no servidor
    tipo: { type: String, enum: ["A1", "A3"], default: "A1" },
    // Validade do certificado (para alertar antes de vencer)
    validadeAte: { type: Date, default: null },
    // Última utilização bem-sucedida
    ultimoUso: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("CertificadoEmpresa", CertificadoEmpresaSchema);
