// routes/estados.js
import express from "express";
import Estado from "../models/Estado.js";

const router = express.Router();

// GET /api/estados — lista todos os estados e alíquotas
router.get("/", async (req, res) => {
  try {
    const estados = await Estado.find().sort({ sigla: 1 }).lean();
    res.json(estados);
  } catch (err) {
    console.error("❌ Erro ao listar estados:", err);
    res.status(500).json({ error: "Erro ao listar estados." });
  }
});

export default router;
