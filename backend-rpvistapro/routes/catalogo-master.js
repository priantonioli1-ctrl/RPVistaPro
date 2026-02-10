// routes/catalogo-master.js
// Catálogo master: todos os itens que algum comprador já cadastrou.
// GET: retorna a lista para fornecedores.
// A alimentação é feita em catalogos.js (POST/PUT) chamando syncItensParaCatalogoMaster.
import express from "express";
import CatalogoMaster from "../models/CatalogoMaster.js";

const router = express.Router();

function chaveItem(nome, unidade) {
  const n = String(nome || "").trim().toLowerCase();
  const u = String(unidade || "").trim().toLowerCase();
  return `${n}::${u}`;
}

/* ============================================================
   📌 GET / — Listar todos os itens do catálogo master
   (Para fornecedores verem o que os compradores buscam)
============================================================ */
router.get("/", async (_req, res) => {
  try {
    const itens = await CatalogoMaster.find()
      .sort({ secao: 1, nome: 1 })
      .lean();
    res.json(itens);
  } catch (err) {
    console.error("❌ Erro ao listar catálogo master:", err);
    res.status(500).json({ error: "Erro ao listar catálogo master." });
  }
});

export default router;

/* ============================================================
   Função usada por catalogos.js para alimentar o master
   quando um comprador salva/atualiza seu catálogo.
============================================================ */
export async function syncItensParaCatalogoMaster(itens) {
  if (!Array.isArray(itens) || itens.length === 0) return;

  for (const item of itens) {
    const nome = (item.nome || item.produto || "").toString().trim();
    if (!nome) continue;

    const unidade = (item.unidade || item.gramatura || "").toString().trim() || "";
    const chave = chaveItem(nome, unidade);

    try {
      await CatalogoMaster.findOneAndUpdate(
        { chave },
        {
          chave,
          nome,
          unidade,
          secao: (item.secao || "").toString().trim(),
          marca: (item.marca || "").toString().trim(),
          similar: item.similar !== false,
          codigo: (item.codigo || "").toString().trim(),
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("⚠️ Erro ao sincronizar item no catálogo master:", e.message);
    }
  }
  console.log(`✅ Catálogo master atualizado com ${itens.length} itens.`);
}
