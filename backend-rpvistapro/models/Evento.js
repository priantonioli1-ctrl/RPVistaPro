// models/Evento.js — Eventos com ficha de cliente e itens selecionados
import mongoose from "mongoose";
import crypto from "crypto";

const ItemEventoSchema = new mongoose.Schema(
  {
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: "ProdutoEvento" },
    nome: { type: String, required: true },
    descricao: { type: String },
    quantidade: { type: Number, required: true, default: 1 },
    precoUnitario: { type: Number, required: true },
    unidade: { type: String, default: "un" },
  },
  { _id: true }
);

const EventoSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, index: true },
    codigo: { type: String, trim: true },
    tokenAcesso: { type: String, unique: true, sparse: true },

    // Dados do cliente (preenchidos na ficha)
    cliente: {
      nome: { type: String },
      cpf: { type: String },
      email: { type: String },
      telefone: { type: String },
      endereco: { type: String },
      cidade: { type: String },
      estado: { type: String },
      cep: { type: String },
      observacoes: { type: String },
    },

    dataEvento: { type: Date },
    tipoEvento: { type: String },
    localEvento: { type: String },
    qtdConvidados: { type: Number },

    itens: [ItemEventoSchema],
    valorTotal: { type: Number, default: 0 },

    status: { type: String, enum: ["rascunho", "aguardando_cliente", "proposta_enviada", "confirmado"], default: "rascunho" },
  },
  { timestamps: true }
);

EventoSchema.index({ empresa: 1, status: 1 });
EventoSchema.index({ tokenAcesso: 1 });

EventoSchema.pre("save", function (next) {
  if (!this.tokenAcesso) {
    this.tokenAcesso = crypto.randomBytes(24).toString("hex");
  }
  this.valorTotal = (this.itens || []).reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
  next();
});

export default mongoose.model("Evento", EventoSchema);
