import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    senha: { type: String, required: true },

    tipo: {
      type: String,
      enum: ["comprador", "fornecedor"],
      required: true
    },

    // CNPJ agora obrigatório
    cnpj: {
      type: String,
      required: true,     // ← ALTERADO AQUI
      default: null
    },

    // Ramo de atuação da empresa (comprador) — ex.: "Alimentício", "Construção Civil"
    ramoAtuacao: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

export default mongoose.model("Usuario", UsuarioSchema);