// models/MovimentoEstoque.js — Histórico de entradas (e saídas) para relatórios
import mongoose from "mongoose";

const MovimentoEstoqueSchema = new mongoose.Schema(
  {
    empresa: { type: mongoose.Schema.Types.ObjectId, ref: "Empresa", required: true, index: true },
    tipo: { type: String, enum: ["entrada", "saida"], required: true, index: true },
    produto: { type: String, required: true, trim: true },
    unidade: { type: String, default: "un", trim: true },
    quantidade: { type: Number, required: true },
    data: { type: Date, default: Date.now, index: true },
    fornecedor: { type: String, trim: true, default: "" },
    nf: { type: String, trim: true, default: "" },
    bonificacao: { type: Boolean, default: false },
    validade: { type: Date, default: null },
    origem: { type: String, enum: ["manual", "entrada_nf", "venda", "requisicao", "ficha"], default: "manual" },
  },
  { timestamps: true }
);

MovimentoEstoqueSchema.index({ empresa: 1, tipo: 1, data: -1 });

export default mongoose.model("MovimentoEstoque", MovimentoEstoqueSchema);
