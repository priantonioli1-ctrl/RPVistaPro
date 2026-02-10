// models/FornecedorCadastrado.js
import mongoose from "mongoose";

const FornecedorCadastradoSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true },
    cnpj: { type: String, default: "" },
    email: { type: String, default: "" },
    dataCadastro: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("FornecedorCadastrado", FornecedorCadastradoSchema);