// fix-index.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error("❌ ERRO: MONGODB_URI não encontrado no .env");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI, {
    dbName: "meubanco",
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("✅ Conectado ao MongoDB");

  try {
    const result = await mongoose.connection.db
      .collection("catalogos_fornecedores")
      .dropIndex("empresa_1");

    console.log("🗑️ Índice 'empresa_1' removido com sucesso:", result);
  } catch (err) {
    console.error("⚠️ Erro ao remover índice:", err.message);
  } finally {
    mongoose.disconnect();
  }
}

run();