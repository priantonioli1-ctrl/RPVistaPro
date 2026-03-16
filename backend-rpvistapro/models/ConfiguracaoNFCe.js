// models/ConfiguracaoNFCe.js — Configuração para emissão de NFC-e (modelo 65) — SEFAZ-RJ
// Conforme MOC 7.0 / Versão 4.00

import mongoose from "mongoose";

const ConfiguracaoNFCeSchema = new mongoose.Schema(
  {
    empresa: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, unique: true, index: true },

    // Ambiente: 1-Produção, 2-Homologação
    tpAmb: { type: Number, enum: [1, 2], default: 2 },

    // Dados do emitente (obrigatórios)
    cnpj: { type: String, trim: true, required: true },
    razaoSocial: { type: String, trim: true, required: true },
    nomeFantasia: { type: String, trim: true, default: "" },
    inscricaoEstadual: { type: String, trim: true, default: "" },
    inscricaoEstadualST: { type: String, trim: true, default: "" },
    cnae: { type: String, trim: true, default: "" },
    crt: { type: Number, default: 1 }, // 1=Simples Nacional, 2=Simples Excesso, 3=Normal

    // Endereço do estabelecimento
    endereco: {
      xLgr: { type: String, trim: true, default: "" },
      nro: { type: String, trim: true, default: "" },
      xCpl: { type: String, trim: true, default: "" },
      xBairro: { type: String, trim: true, default: "" },
      cMun: { type: String, trim: true, default: "" },
      xMun: { type: String, trim: true, default: "" },
      uf: { type: String, trim: true, default: "RJ" },
      cep: { type: String, trim: true, default: "" },
      fone: { type: String, trim: true, default: "" },
    },

    // CSC (Código de Segurança do Contribuinte) — necessário para QR Code 2.0
    csc: { type: String, trim: true, default: "" },
    idCsc: { type: Number, default: 1 },

    // Numeração da NFC-e (serie 1-999 para NFC-e)
    serie: { type: Number, default: 1 },
    ultimoNumero: { type: Number, default: 0 },

    // Ativo
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("ConfiguracaoNFCe", ConfiguracaoNFCeSchema);
