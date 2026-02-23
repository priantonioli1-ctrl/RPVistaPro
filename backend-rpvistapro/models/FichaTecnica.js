import mongoose from "mongoose";

// Item da ficha: quantidade é "por unidade de produção" (ex.: por 1 porção, por 1L)
const ItemFichaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    unidade: { type: String, default: "un", trim: true },
    quantidade: { type: Number, required: true }, // por unidade (ex.: por 1 porção)
  },
  { _id: false }
);

const FichaTecnicaSchema = new mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empresa",
      required: true,
    },
    nome: { type: String, required: true, trim: true }, // ex.: "Bolo de chocolate", "Suco verde 1L"
    descricao: { type: String, default: "", trim: true },
    rendimento: { type: String, default: "1 unidade", trim: true }, // ex.: "10 porções", "1L" (apenas informativo)
    itens: { type: [ItemFichaSchema], default: [] },
  },
  { timestamps: true }
);

FichaTecnicaSchema.index({ empresa: 1 });

export default mongoose.model("FichaTecnica", FichaTecnicaSchema);
