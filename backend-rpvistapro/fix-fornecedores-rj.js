// fix-fornecedores-rj.js - Define estado RJ para todos os fornecedores já cadastrados
import mongoose from "mongoose";
import dotenv from "dotenv";
import Usuario from "./models/Usuario.js";
import CatalogoFornecedor from "./models/CatalogoFornecedor.js";

dotenv.config();

const ALIQUOTA_RJ = 22;

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/meubanco");
    console.log("✅ Conectado ao MongoDB");

    const resultado = await Usuario.updateMany(
      { tipo: "fornecedor" },
      { $set: { estado: "RJ", aliquota: ALIQUOTA_RJ } }
    );
    console.log(`✅ ${resultado.modifiedCount} fornecedor(es) atualizado(s) com estado RJ e alíquota ${ALIQUOTA_RJ}%`);

    const fornecedores = await Usuario.find(
      { tipo: "fornecedor" },
      { nome: 1, empresa: 1 }
    ).lean();

    const empresas = [...new Set(
      fornecedores.flatMap((f) => [
        (f.empresa || "").trim(),
        (f.nome || "").trim(),
      ]).filter(Boolean)
    )];

    const catalogoRes = await CatalogoFornecedor.updateMany(
      { empresa: { $in: empresas } },
      { $set: { aliquota: ALIQUOTA_RJ, estadoSigla: "RJ" } }
    );
    console.log(`✅ ${catalogoRes.modifiedCount} catálogo(s) de fornecedor atualizado(s)`);
  } catch (err) {
    console.error("❌ Erro:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fix();
