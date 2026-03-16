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
      enum: ["comprador", "fornecedor", "questionario"],
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
    },

    // Endereço (fornecedor)
    endereco: { type: String, trim: true, default: "" },

    // Estado UF (fornecedor) — ex.: "SP", "MG"
    estado: { type: String, trim: true, uppercase: true, default: "", maxLength: 2 },

    // Alíquota ICMS % (fornecedor) — preenchida automaticamente conforme o estado
    aliquota: { type: Number, default: null },

    // Nome da empresa (fornecedor) — usado no catálogo; quando vazio, usa nome
    empresa: { type: String, trim: true, default: "" },

    // Verificação de email
    emailVerificado: {
      type: Boolean,
      default: false
    },
    tokenVerificacao: {
      type: String,
      default: null
    },
    tokenVerificacaoExpira: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("Usuario", UsuarioSchema);