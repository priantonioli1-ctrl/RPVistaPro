// models/ImpressoraFiscal.js — Configuração da impressora fiscal por empresa
import mongoose from "mongoose";

const ImpressoraFiscalSchema = new mongoose.Schema(
  {
    empresa: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, unique: true, index: true },
    ativo: { type: Boolean, default: true },
    modelo: { type: String, trim: true, default: "" },
    tipo: {
      type: String,
      enum: ["ecf", "termica", "nfce_api", "agente_local"],
      default: "agente_local",
    },
    // Para tipo agente_local: URL do serviço local que recebe os dados e imprime (ex: http://localhost:9999)
    urlAgente: { type: String, trim: true, default: "http://localhost:9999" },
    // Para impressora serial/USB (informacional, o agente usa)
    porta: { type: String, trim: true, default: "" },
    ip: { type: String, trim: true, default: "" },
    nomeFantasia: { type: String, trim: true, default: "" },
    cnpj: { type: String, trim: true, default: "" },
    endereco: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ImpressoraFiscal", ImpressoraFiscalSchema);
