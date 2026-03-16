// models/RespostaQuestionario.js — Respostas do diagnóstico de gestão
import mongoose from "mongoose";

const RespostaQuestionarioSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    nomeUsuario: { type: String, trim: true },
    emailUsuario: { type: String, trim: true },
    respostas: { type: mongoose.Schema.Types.Mixed, default: {} },
    concluidoEm: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

RespostaQuestionarioSchema.index({ usuario: 1 });
RespostaQuestionarioSchema.index({ concluidoEm: -1 });

export default mongoose.model("RespostaQuestionario", RespostaQuestionarioSchema);
