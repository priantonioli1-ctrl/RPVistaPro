// models/Orcamento.js — Orçamentos (evento, obra, serviço personalizado)
// Compatível com coleção eventos existente
import mongoose from "mongoose";
import crypto from "crypto";

const ItemOrcamentoSchema = new mongoose.Schema(
  {
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: "ProdutoOrcamento" },
    nome: { type: String, required: true },
    descricao: { type: String },
    quantidade: { type: Number, required: true, default: 1 },
    precoUnitario: { type: Number, required: true },
    unidade: { type: String, default: "un" },
  },
  { _id: true }
);

const OrcamentoSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, index: true },
    codigo: { type: String, trim: true },
    tokenAcesso: { type: String, unique: true, sparse: true },
    cliente: {
      nome: { type: String },
      cpf: { type: String },
      cpfCnpj: { type: String },
      email: { type: String },
      telefone: { type: String },
      endereco: { type: String },
      cidade: { type: String },
      estado: { type: String },
      cep: { type: String },
      observacoes: { type: String },
    },
    modeloFichaId: { type: mongoose.Schema.Types.ObjectId, ref: "ModeloFichaOrcamento" },
    fichaConfig: {
      camposDados: mongoose.Schema.Types.Mixed,
      perguntasCustom: mongoose.Schema.Types.Mixed,
    },
    respostasCustom: { type: mongoose.Schema.Types.Mixed, default: {} },
    dataEvento: { type: Date },
    tipoEvento: { type: String },
    localEvento: { type: String },
    qtdConvidados: { type: Number },
    itens: [ItemOrcamentoSchema],
    valorTotal: { type: Number, default: 0 },
    status: { type: String, enum: ["rascunho", "aguardando_cliente", "proposta_enviada", "confirmado", "pago"], default: "rascunho" },
  },
  { timestamps: true }
);

OrcamentoSchema.index({ empresa: 1, status: 1 });
OrcamentoSchema.index({ tokenAcesso: 1 });

OrcamentoSchema.pre("save", function (next) {
  if (!this.tokenAcesso) {
    this.tokenAcesso = crypto.randomBytes(24).toString("hex");
  }
  this.valorTotal = (this.itens || []).reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
  next();
});

export default mongoose.model("Orcamento", OrcamentoSchema, "eventos");
