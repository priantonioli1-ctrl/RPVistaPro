// models/Diagnostico.js — Diagnósticos salvos para consultas futuras e comparação
import mongoose from "mongoose";

const DiagnosticoSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    nomeUsuario: { type: String, trim: true },
    diagnosticoItens: { type: [mongoose.Schema.Types.Mixed], default: [] },
    diagnosticoAvancadoItens: { type: [mongoose.Schema.Types.Mixed], default: [] },
    respostas: { type: mongoose.Schema.Types.Mixed, default: {} },
    data: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DiagnosticoSchema.index({ usuario: 1 });
DiagnosticoSchema.index({ data: -1 });

export default mongoose.model("Diagnostico", DiagnosticoSchema);
