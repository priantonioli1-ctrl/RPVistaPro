// models/TipoProposta.js — Tipos de orçamento/proposta (ex: Vista Lagoa, buffet customizado)
import mongoose from "mongoose";

const TipoPropostaSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, index: true },
    nome: { type: String, required: true, trim: true },
    subtitulo: { type: String, default: "", trim: true },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TipoPropostaSchema.index({ empresa: 1, nome: 1 });

export default mongoose.model("TipoProposta", TipoPropostaSchema, "tipos_proposta");
