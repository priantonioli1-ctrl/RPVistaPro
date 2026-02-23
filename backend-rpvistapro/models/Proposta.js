// models/Proposta.js — Propostas salvas (dados do formulário PropostaVistaLagoa)
import mongoose from "mongoose";

const PropostaSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, index: true },
    tipoProposta: { type: mongoose.Schema.Types.ObjectId, ref: "TipoProposta", required: true },
    status: {
      type: String,
      enum: ["em_aberto", "rejeitada", "aceita", "paga"],
      default: "em_aberto",
    },
    dados: { type: mongoose.Schema.Types.Mixed, default: {} },
    escopo: { type: mongoose.Schema.Types.Mixed, default: {} },
    gastronomia: { type: mongoose.Schema.Types.Mixed, default: {} },
    bar: { type: mongoose.Schema.Types.Mixed, default: {} },
    pagamento: { type: mongoose.Schema.Types.Mixed, default: {} },
    valorTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PropostaSchema.index({ empresa: 1, status: 1 });
PropostaSchema.index({ tipoProposta: 1 });

export default mongoose.model("Proposta", PropostaSchema, "propostas");
