// models/FuncionarioAutorizado.js
import mongoose from "mongoose";

const FuncionarioAutorizadoSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, index: true },
    nome: { type: String, required: true },
    email: { type: String },
    cargo: { type: String },
    cpf: { type: String },
    telefone: { type: String },
    departamento: { type: String },
    dataAdmissao: { type: Date },
    salario: { type: Number, default: null },
    matricula: { type: String, trim: true },

    // Situação: ativo ou desligado da empresa
    situacao: { type: String, enum: ["ativo", "desligado"], default: "ativo" },
    dataDesligamento: { type: Date, default: null },
    motivoDesligamento: { type: String, trim: true },

    // Documentos anexados tipados (contratos, atestados, advertências, cartas de demissão)
    anexos: [{
      tipo: { type: String, enum: ["contrato", "atestado", "advertencia", "carta-demissao", "outro"], default: "outro" },
      nome: { type: String },
      url: { type: String },
      data: { type: Date },
      descricao: { type: String },
    }],

    // Registro de ocorrências — histórico relevante (positivo ou negativo, notificadas ou não)
    registrosOcorrencia: [{
      data: { type: Date, required: true },
      descricao: { type: String, required: true },
      tipo: { type: String, enum: ["positiva", "negativa", "neutra"], default: "neutra" },
      registroPor: { type: String },
    }],

    // Vetor com o "embedding" do rosto (assinatura matemática) — opcional para fichas só cadastrais
    embedding: { type: [Number] },

    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("FuncionarioAutorizado", FuncionarioAutorizadoSchema);