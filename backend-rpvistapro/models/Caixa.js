import mongoose from "mongoose";

const CaixaSchema = new mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empresa",
      required: true,
    },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    abertoEm: { type: Date, required: true },
    fechadoEm: { type: Date, default: null },
    valorAbertura: { type: Number, required: true, default: 0 },
    valorFechamento: { type: Number, default: null },
    valorCalculado: { type: Number, default: null }, // total de vendas no período
    status: { type: String, enum: ["aberto", "fechado"], default: "aberto" },
    observacoes: { type: String, default: "" },
  },
  { timestamps: true }
);

CaixaSchema.index({ empresa: 1, status: 1 });

export default mongoose.model("Caixa", CaixaSchema);
