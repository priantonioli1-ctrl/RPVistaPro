import mongoose from "mongoose";

const ProdutoVendaSchema = new mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empresa",
      required: true,
    },
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, default: "", trim: true },
    fichaTecnica: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FichaTecnica",
      default: null,
    },
  },
  { timestamps: true }
);

ProdutoVendaSchema.index({ empresa: 1 });

export default mongoose.model("ProdutoVenda", ProdutoVendaSchema);
