// models/RegistroPonto.js — Registro eletrônico de ponto (bater ponto)
import mongoose from "mongoose";

const RegistroPontoSchema = new mongoose.Schema(
  {
    funcionario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FuncionarioAutorizado",
      required: true,
      index: true,
    },
    empresa: {
      type: String,
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["entrada", "saida", "intervalo-inicio", "intervalo-fim"],
      required: true,
    },
    dataHora: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
    // Para integração com hardware (registrador físico)
    metodo: {
      type: String,
      enum: ["web", "hardware", "app"],
      default: "web",
    },
    dispositivoId: { type: String },
    ip: { type: String },
    localizacao: { type: String },
    observacao: { type: String },
  },
  { timestamps: true }
);

RegistroPontoSchema.index({ empresa: 1, funcionario: 1, dataHora: -1 });
RegistroPontoSchema.index({ empresa: 1, dataHora: -1 });

export default mongoose.model("RegistroPonto", RegistroPontoSchema);
