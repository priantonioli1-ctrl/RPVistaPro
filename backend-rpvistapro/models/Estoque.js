// models/Estoque.js
import mongoose from "mongoose";

// 🔹 Estrutura de CADA ITEM do estoque
const ItemSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  unidade: { type: String, default: "un" },
  quantidade: { type: Number, default: 0 },
  minimo: { type: Number, default: 0 },
  maximo: { type: Number, default: 0 },
  emTransito: { type: Number, default: 0 },
  contagemReal: { type: Number, default: 0 },
  ultimaAtualizacao: { type: Date, default: null },
  ultimaEntrada: {
    fornecedor: { type: String },
    nf: { type: String },
    data: { type: Date },
    quantidade: { type: Number },
  },
});

// 🔹 Estrutura do ESTOQUE por empresa
const EstoqueSchema = new mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empresa",
      required: true,
      unique: true,
    },

    itens: { type: [ItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Estoque", EstoqueSchema);