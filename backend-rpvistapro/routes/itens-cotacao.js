// backend/routes/itens-cotacao.js
import express from "express";
import ItemCotacao from "../models/item-cotacao.js"; // ✅ confirme o caminho correto

const router = express.Router();

/* ============================================================
   📥 POST /api/itens-cotacao
   Salva manualmente itens de cotação (fluxo existente)
============================================================ */
router.post("/", async (req, res) => {
  try {
    const { comprador, itens } = req.body;

    if (!comprador || !Array.isArray(itens)) {
      return res.status(400).json({ error: "Comprador ou itens inválidos." });
    }

    console.log(`📥 Recebendo ${itens.length} itens de cotação de ${comprador}`);

    // Remove itens antigos desse comprador
    await ItemCotacao.deleteMany({ comprador });

    // Salva novos itens
    const novos = await ItemCotacao.insertMany(
      itens.map((i) => ({
        nome: i.nome,
        unidade: i.unidade || "",
        qtd: i.qtd || 1,
        comprador,
      }))
    );

    console.log(`✅ ${novos.length} itens salvos para ${comprador}`);
    res.json({ ok: true, count: novos.length });
  } catch (err) {
    console.error("❌ Erro ao salvar itens de cotação:", err);
    res.status(500).json({ error: "Erro interno ao salvar itens." });
  }
});

/* ============================================================
   📤 GET /api/itens-cotacao
   Lista todos os itens de cotação (para debug/admin)
============================================================ */
router.get("/", async (_req, res) => {
  try {
    const itens = await ItemCotacao.find({}).sort({ comprador: 1, nome: 1 });
    res.json(itens);
  } catch (err) {
    console.error("❌ Erro ao listar itens:", err);
    res.status(500).json({ error: "Erro ao listar itens." });
  }
});

/* ============================================================
   🔍 GET /api/itens-cotacao/empresa/:empresa
   Lista apenas os itens de cotação de uma empresa
============================================================ */
router.get("/empresa/:empresa", async (req, res) => {
  try {
    const { empresa } = req.params;
    if (!empresa) {
      return res.status(400).json({ error: "Empresa não informada." });
    }

    const itens = await ItemCotacao.find({ comprador: empresa }).sort({ nome: 1 });
    res.json(itens);
  } catch (err) {
    console.error("❌ Erro ao listar itens por empresa:", err);
    res.status(500).json({ error: "Erro ao listar itens da empresa." });
  }
});

/* ============================================================
   🧠 POST /api/itens-cotacao/gerar/:empresa
   Gera automaticamente uma cotação a partir de produtos
   abaixo do mínimo no estoque
============================================================ */
router.post("/gerar/:empresa", async (req, res) => {
  try {
    const { empresa } = req.params;
    const { itens } = req.body;

    if (!empresa || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Dados inválidos." });
    }

    console.log(`⚙️ Gerando cotação automática para empresa ${empresa}`);

    // Remove cotação anterior da empresa
    await ItemCotacao.deleteMany({ comprador: empresa });

    // Cria novos itens (com qtd = 0)
    const novos = await ItemCotacao.insertMany(
      itens.map((i) => ({
        comprador: empresa,
        nome: i.nome,
        unidade: i.unidade || "un",
        qtd: 0,
      }))
    );

    console.log(`✅ Cotação gerada: ${novos.length} itens adicionados.`);
    res.json({
      ok: true,
      count: novos.length,
      message: "Cotação gerada com sucesso.",
    });
  } catch (err) {
    console.error("❌ Erro ao gerar cotação automática:", err);
    res.status(500).json({ error: "Erro interno ao gerar cotação." });
  }
});

/* ============================================================
   🧹 DELETE /api/itens-cotacao/limpar/:empresa
   Limpa todos os itens de cotação de uma empresa
   (útil após envio de pedido ou reset)
============================================================ */
router.delete("/limpar/:empresa", async (req, res) => {
  try {
    const { empresa } = req.params;
    const result = await ItemCotacao.deleteMany({ comprador: empresa });
    res.json({
      ok: true,
      message: `Itens de cotação removidos (${result.deletedCount}).`,
    });
  } catch (err) {
    console.error("❌ Erro ao limpar cotação:", err);
    res.status(500).json({ error: "Erro ao limpar itens de cotação." });
  }
});

export default router;