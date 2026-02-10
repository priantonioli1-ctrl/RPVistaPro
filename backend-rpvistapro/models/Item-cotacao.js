// backend/models/item-cotacao.js
import mongoose from "mongoose";

/*
  🧾 Modelo: ItemCotacao
  Representa um item incluído na cotação (manual ou automática).
  Cada item pertence a uma empresa/comprador e pode vir do estoque
  (no caso de cotação de abastecimento) ou de uma nova cotação feita pelo usuário.
*/

const itemCotacaoSchema = new mongoose.Schema(
  {
    // 🔹 Nome do produto (ex: "Arroz Branco 5kg")
    nome: { type: String, required: true, trim: true },

    // 🔹 Unidade de medida (ex: "kg", "cx", "pct")
    unidade: { type: String, default: "un" },

    // 🔹 Quantidade desejada pelo comprador
    qtd: { type: Number, default: 0 },

    // 🔹 Nome da empresa/comprador (ex: "priscilla")
    comprador: { type: String, required: true, trim: true },

    // 🔹 Status da cotação (permite evoluir depois: “pendente”, “enviada”, “finalizada”)
    status: {
      type: String,
      enum: ["rascunho", "pendente", "enviada", "finalizada"],
      default: "rascunho",
    },

    // 🔹 Indica se o item veio automaticamente do estoque (true = cotação de abastecimento)
    origemEstoque: { type: Boolean, default: false },
  },
  {
    timestamps: true, // cria automaticamente createdAt e updatedAt
  }
);

// 🔎 Índices úteis para buscas rápidas
itemCotacaoSchema.index({ comprador: 1 });
itemCotacaoSchema.index({ nome: 1 });
itemCotacaoSchema.index({ status: 1 });

const ItemCotacao = mongoose.model("ItemCotacao", itemCotacaoSchema);
export default ItemCotacao;