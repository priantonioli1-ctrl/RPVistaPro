import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    produtoId: { type: String, default: null },
    nome: { type: String, required: true },
    unidade: { type: String, default: "" },
    quantidade: { type: Number, required: true },
  },
  { _id: false }
);

const RequisicaoEstoqueSchema = new mongoose.Schema(
  {
    numero: { type: Number, required: true }, // número sequencial da empresa
    empresa: { type: String, required: true, trim: true },
    setorOrigem: { type: String, required: true }, // Cozinha / Bar / Padaria
    criadoPor: { type: String, required: true },
    prioridade: { type: String, default: "Normal" },
    observacoes: { type: String, default: "" },

    itens: [ItemSchema],

    status: {
      type: String,
      default: "Pendente", // Pendente / Em Separação / Atendida / Cancelada
    },
  },
  { timestamps: true }
);

export default mongoose.model("RequisicaoEstoque", RequisicaoEstoqueSchema);