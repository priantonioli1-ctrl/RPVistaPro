// models/ModeloFichaOrcamento.js — Modelos de ficha personalizados para orçamentos
import mongoose from "mongoose";

const CampoDadoSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  tipo: { type: String, enum: ["texto", "numero", "data", "email", "telefone"], default: "texto" },
  obrigatorio: { type: Boolean, default: false },
  ordem: { type: Number, default: 0 },
}, { _id: false });

const PerguntaCustomSchema = new mongoose.Schema({
  id: { type: String, required: true },
  pergunta: { type: String, required: true },
  tipo: { type: String, enum: ["texto", "numero", "data"], default: "texto" },
  obrigatorio: { type: Boolean, default: false },
  ordem: { type: Number, default: 0 },
}, { _id: false });

const ModeloFichaOrcamentoSchema = new mongoose.Schema({
  empresa: { type: String, required: true, index: true },
  nome: { type: String, required: true, trim: true },
  camposDados: [CampoDadoSchema],
  perguntasCustom: [PerguntaCustomSchema],
}, { timestamps: true });

export default mongoose.model("ModeloFichaOrcamento", ModeloFichaOrcamentoSchema, "modelos_ficha_orcamento");
