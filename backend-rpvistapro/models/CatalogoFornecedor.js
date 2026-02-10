// models/CatalogoFornecedor.js
import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    secao: { type: String, trim: true },
    marca: { type: String, trim: true },
    unidade: { type: String, default: "", trim: true },
    similar: { type: Boolean, default: true },
    codigo: { type: String, trim: true },
    preco: { type: Number, default: 0 },
  },
  { _id: false }
);
const CatalogoFornecedorSchema = new mongoose.Schema(
  {
    empresa: {
      type: String,
      required: true,
      trim: true,
      index: true, // ✅ mantém o index, mas remove o unique
    },
   comprador: {
  type: String,
  trim: true,
  index: true,
  default: "", // ✅ opcional e seguro
},
    catalogo: {
      type: [ItemSchema],
      default: [],
    },
  },
  { timestamps: true, collection: "catalogos_fornecedores" }
);

// 🔹 Garante que cada fornecedor tenha um catálogo único por comprador
CatalogoFornecedorSchema.index({ empresa: 1, comprador: 1 }, { unique: true });
export default mongoose.model("CatalogoFornecedor", CatalogoFornecedorSchema);