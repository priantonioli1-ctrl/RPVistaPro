// models/Venda.js — Registro de vendas do Frente de Loja (saída de mercadorias)
// Reforma Tributária (EC 132/2023): IBS/CBS fase transição 2026
import mongoose from "mongoose";

const ItemVendaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    unidade: { type: String, default: "un" },
    quantidade: { type: Number, required: true },
    precoUnitario: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    /** Reforma Tributária: categoria do item (ALÍQUOTA_ZERO, ALÍQUOTA_REDUZIDA, ALÍQUOTA_PADRÃO) */
    categoriaTributaria: { type: String, trim: true, default: "ALÍQUOTA_PADRÃO" },
    /** IBS (Estadual/Municipal) calculado por fora — Lei da Transparência */
    valorIBS: { type: Number, default: 0 },
    /** CBS (Federal) calculado por fora — Lei da Transparência */
    valorCBS: { type: Number, default: 0 },
  },
  { _id: false }
);

const VendaSchema = new mongoose.Schema(
  {
    empresa: { type: mongoose.Schema.Types.ObjectId, ref: "Empresa", required: true, index: true },
    itens: { type: [ItemVendaSchema], required: true },
    subtotal: { type: Number, required: true },
    desconto: { type: Number, default: 0 },
    total: { type: Number, required: true },
    /** Reforma Tributária: totais para exibição no cupom (Lei da Transparência) */
    totalIBS: { type: Number, default: 0 },
    totalCBS: { type: Number, default: 0 },
  formaPagamento: { type: String, trim: true, default: "Dinheiro" },
  caixaId: { type: mongoose.Schema.Types.ObjectId, ref: "Caixa", default: null },
  operador: { type: String, trim: true, default: "" },
  observacoes: { type: String, default: "" },
  },
  { timestamps: true }
);

VendaSchema.index({ empresa: 1, createdAt: -1 });

export default mongoose.model("Venda", VendaSchema);
