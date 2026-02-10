// models/FornecedorCliente.js
// Relação entre fornecedor e seus clientes (compradores)
import mongoose from "mongoose";

const FornecedorClienteSchema = new mongoose.Schema(
  {
    fornecedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    compradorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
  },
  { timestamps: true, collection: "fornecedor_clientes" }
);

// Índice único para evitar duplicatas
FornecedorClienteSchema.index({ fornecedorId: 1, compradorId: 1 }, { unique: true });

export default mongoose.model("FornecedorCliente", FornecedorClienteSchema);
