import mongoose from "mongoose";

const ItemComandaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    unidade: { type: String, default: "un", trim: true },
    quantidade: { type: Number, required: true },
    precoUnitario: { type: Number, required: true },
  },
  { _id: true }
);

const ComandaSchema = new mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empresa",
      required: true,
    },
    codigo: { type: String, required: true, trim: true }, // Mesa 1, Comanda 05, etc.
    itens: { type: [ItemComandaSchema], default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ["aberta", "fechada"], default: "aberta" },
    caixaId: { type: mongoose.Schema.Types.ObjectId, ref: "Caixa", default: null },
    usuarioAbertura: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    usuarioFechamento: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
    fechadoEm: { type: Date, default: null },
  },
  { timestamps: true }
);

ComandaSchema.index({ empresa: 1, status: 1 });
ComandaSchema.index({ empresa: 1, codigo: 1 });

export default mongoose.model("Comanda", ComandaSchema);
