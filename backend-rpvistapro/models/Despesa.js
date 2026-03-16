// models/Despesa.js — Despesas e receitas para o DRE
import mongoose from "mongoose";

const DespesaSchema = new mongoose.Schema(
  {
    empresa: { type: mongoose.Schema.Types.ObjectId, ref: "Empresa", required: true, index: true },
    categoria: {
      type: String,
      enum: ["cmv", "deducoes", "vendas", "administrativas", "financeiras", "receita_financeira", "ir_csll", "outras"],
      required: true,
    },
    descricao: { type: String, trim: true, default: "" },
    valor: { type: Number, required: true },
    data: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

DespesaSchema.index({ empresa: 1, data: -1 });
DespesaSchema.index({ empresa: 1, categoria: 1, data: -1 });

export default mongoose.model("Despesa", DespesaSchema);
