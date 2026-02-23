// models/CardapioPDV.js — Cardápio do PDV (pratos prontos, produtos finais)
// Separado do catálogo de compras que é matéria-prima
import mongoose from "mongoose";

const CardapioPDVSchema = new mongoose.Schema(
  {
    empresa: {
      type: String,
      required: true,
      index: true,
    },
    codigo: { type: String, trim: true, index: true },
    codigoBarras: { type: String, trim: true, index: true },
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, default: "", trim: true },
    categoria: { type: String, trim: true, default: "Geral", index: true },
    preco: { type: Number, required: true, default: 0 },
    unidade: { type: String, trim: true, default: "un" },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CardapioPDVSchema.index({ empresa: 1, nome: 1 });
CardapioPDVSchema.index({ empresa: 1, codigoBarras: 1 });
CardapioPDVSchema.index({ empresa: 1, codigo: 1 });

export default mongoose.model("CardapioPDV", CardapioPDVSchema);
