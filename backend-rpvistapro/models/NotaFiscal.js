import mongoose from "mongoose";

const ItemNFSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    unidade: { type: String, default: "un" },
    quantidade: { type: Number, required: true },
    precoUnitario: { type: Number, default: 0 },
  },
  { _id: false }
);

const NotaFiscalSchema = new mongoose.Schema(
  {
    pedido: { type: mongoose.Schema.Types.ObjectId, ref: "Pedido", required: true },
    numero: { type: String, required: true, trim: true },
    dataEmissao: { type: Date, default: Date.now },
    comprador: { type: String, required: true, trim: true },
    compradorId: { type: String, trim: true },
    fornecedor: { type: String, required: true, trim: true },
    itens: { type: [ItemNFSchema], default: [] },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

NotaFiscalSchema.index({ pedido: 1 }, { unique: true });
NotaFiscalSchema.index({ fornecedor: 1, dataEmissao: -1 });
NotaFiscalSchema.index({ comprador: 1, dataEmissao: -1 });

export default mongoose.model("NotaFiscal", NotaFiscalSchema);
