import mongoose from "mongoose";

/* ------------------ SCHEMA DOS ITENS ------------------ */
const ItemSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    unidade: { type: String, default: "un" },
    quantidade: { type: Number, default: 0 },
    precoUnitario: { type: Number, default: 0 },
  },
  { _id: true } // NECESSÁRIO para remover itens individualmente
);

/* ------------------ SCHEMA DA AVALIAÇÃO ------------------ */
const AvaliacaoSchema = new mongoose.Schema(
  {
    nota: Number,
    comentario: String,
    data: Date,
  },
  { _id: false }
);

/* ------------------ SCHEMA PRINCIPAL DO PEDIDO ------------------ */
const PedidoSchema = new mongoose.Schema(
  {
    empresa: { type: String, required: true },
    fornecedor: { type: String, required: true },

    itens: { type: [ItemSchema], default: [] },

    total: { type: Number, default: 0 },

    status: {
      type: String,
      default: "pendente",
    },

    avaliacao: { type: AvaliacaoSchema, default: null },

    observacoes: { type: String, default: "" },

    dataEntrega: { type: Date, default: null },
    dataRecebimento: { type: Date, default: null },
  },
  { timestamps: true }
);

/* ------------------ EXPORTAÇÃO ------------------ */
const Pedido = mongoose.model("Pedido", PedidoSchema);
export default Pedido;