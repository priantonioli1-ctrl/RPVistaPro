// models/Estado.js
import mongoose from "mongoose";

const EstadoSchema = new mongoose.Schema(
  {
    sigla: { type: String, required: true, unique: true, uppercase: true, trim: true },
    nome: { type: String, required: true, trim: true },
    aliquota: { type: Number, required: true }, // % de ICMS
  },
  { timestamps: true }
);

EstadoSchema.index({ sigla: 1 });
export default mongoose.model("Estado", EstadoSchema);
