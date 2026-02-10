// models/Catalogo.js
import mongoose from "mongoose";

// 🔹 Schema de item dentro do catálogo
const ItemCatalogoSchema = new mongoose.Schema(
  {
    secao: { type: String, trim: true, default: "" },
    nome: { type: String, required: true, trim: true },
    marca: { type: String, trim: true, default: "" },
    unidade: { type: String, trim: true, default: "" },
    similar: { type: Boolean, default: true },
    codigo: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

// 🔹 Schema principal do catálogo
const CatalogoSchema = new mongoose.Schema(
  {
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empresa",
      required: true
    },
    catalogo: { type: [ItemCatalogoSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Catalogo", CatalogoSchema);