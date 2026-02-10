// verCatalogos.js
import mongoose from "mongoose";
import CatalogoFornecedor from "./models/CatalogoFornecedor.js";

const MONGODB_URI = "mongodb+srv://priscilla:Helena2607.@cluster0.g0y0tyq.mongodb.net/meubanco";

async function verCatalogos() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado ao MongoDB");

    const catalogos = await CatalogoFornecedor.find();
    if (catalogos.length === 0) {
      console.log("⚠️ Nenhum catálogo de fornecedor encontrado.");
    } else {
      console.log("📦 Catálogos encontrados:");
      console.dir(catalogos, { depth: null });
    }

    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Erro ao consultar catálogos:", err);
  }
}

verCatalogos();