// models/FuncionarioAutorizado.js
import mongoose from "mongoose";

const FuncionarioAutorizadoSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, index: true },
    nome: { type: String, required: true },
    email: { type: String },
    cargo: { type: String },

    // Vetor com o "embedding" do rosto (assinatura matemática)
    embedding: {
      type: [Number], // ex: [0.123, -0.044, ...]
      required: true,
    },

    // opcional: se quiser desativar sem apagar
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("FuncionarioAutorizado", FuncionarioAutorizadoSchema);