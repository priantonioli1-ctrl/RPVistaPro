import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  unidade: { type: String, default: "un", trim: true },
  quantidade: { type: Number, default: 0 },
});

const EstoqueFornecedorSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true, trim: true, unique: true },
    itens: { type: [ItemSchema], default: [] },
  },
  { timestamps: true, collection: "estoque_fornecedores" }
);

EstoqueFornecedorSchema.index({ empresa: 1 });

export default mongoose.model("EstoqueFornecedor", EstoqueFornecedorSchema);
