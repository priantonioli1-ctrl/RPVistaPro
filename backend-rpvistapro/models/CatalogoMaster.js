// models/CatalogoMaster.js
// Catálogo único com todos os itens que algum comprador já cadastrou.
// Alimentado automaticamente quando compradores salvam seu Meu Catálogo.
// Fornecedores veem este catálogo na aba "Meu Catálogo".
import mongoose from "mongoose";

const ItemMasterSchema = new mongoose.Schema(
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

const CatalogoMasterSchema = new mongoose.Schema(
  {
    // Chave única: nome + unidade para evitar duplicatas
    chave: { type: String, required: true, unique: true, trim: true },
    secao: { type: String, trim: true, default: "" },
    nome: { type: String, required: true, trim: true },
    marca: { type: String, trim: true, default: "" },
    unidade: { type: String, trim: true, default: "" },
    similar: { type: Boolean, default: true },
    codigo: { type: String, trim: true, default: "" },
  },
  { timestamps: true, collection: "catalogo_master" }
);

CatalogoMasterSchema.index({ nome: 1, unidade: 1 });

export default mongoose.model("CatalogoMaster", CatalogoMasterSchema);
