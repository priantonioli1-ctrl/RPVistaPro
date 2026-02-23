// models/ProdutoEvento.js — Catálogo de produtos para eventos (importável)
import mongoose from "mongoose";

const ProdutoEventoSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, index: true },
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

ProdutoEventoSchema.index({ empresa: 1, categoria: 1 });

export default mongoose.model("ProdutoEvento", ProdutoEventoSchema);
