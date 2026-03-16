// models/CardapioPDV.js — Cardápio do PDV (pratos prontos, produtos finais)
// Separado do catálogo de compras que é matéria-prima
import mongoose from "mongoose";

// Reforma Tributária (EC 132/2023): categorias para IBS/CBS
const CATEGORIA_TRIBUTARIA_VALUES = ["ALÍQUOTA_ZERO", "ALÍQUOTA_REDUZIDA", "ALÍQUOTA_PADRÃO"];

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
    /** Reforma Tributária: ALÍQUOTA_ZERO (medicamentos essenciais), ALÍQUOTA_REDUZIDA (60% redução), ALÍQUOTA_PADRÃO */
    categoriaTributaria: {
      type: String,
      enum: CATEGORIA_TRIBUTARIA_VALUES,
      default: "ALÍQUOTA_PADRÃO",
      trim: true,
    },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CardapioPDVSchema.index({ empresa: 1, nome: 1 });
CardapioPDVSchema.index({ empresa: 1, codigoBarras: 1 });
CardapioPDVSchema.index({ empresa: 1, codigo: 1 });

export default mongoose.model("CardapioPDV", CardapioPDVSchema);
