// routes/catalogo.js
import express from "express";
import mongoose from "mongoose";
import Catalogo from "../models/Catalogo.js";
import { syncItensParaCatalogoMaster } from "./catalogo-master.js";

const router = express.Router();

/* ============================================================
   📌 0) GET /all — listar todos os catálogos (com populate)
   (Evita conflito com GET /:empresaId)
============================================================ */
router.get("/all", async (req, res) => {
  try {
    const catalogos = await Catalogo.find().populate("empresa", "nome cnpj");
    res.json(catalogos);
  } catch (err) {
    console.error("❌ Erro ao listar catálogos:", err);
    res.status(500).json({ error: "Erro ao listar catálogos." });
  }
});

/* ============================================================
   📌 1) GET /:empresaId — Buscar catálogo por ID da Empresa
============================================================ */
router.get("/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }

    const catalogo = await Catalogo.findOne({ empresa: compradorId });

    if (!catalogo) {
      return res.status(404).json({ error: "Catálogo não encontrado." });
    }

    res.json(catalogo);

  } catch (err) {
    console.error("❌ Erro ao buscar catálogo:", err);
    res.status(500).json({ error: "Erro ao buscar catálogo." });
  }
});

/* ============================================================
   📌 2) POST /:empresaId — Criar catálogo (somente se não existir)
============================================================ */
router.post("/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();
    const { catalogo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }

    if (!Array.isArray(catalogo)) {
      return res.status(400).json({
        error: "Envie um array válido no campo 'catalogo'.",
      });
    }

    const existente = await Catalogo.findOne({ empresa: compradorId });

    if (existente) {
      return res.status(409).json({
        error: "Catálogo já existe. Use PUT para atualizar.",
      });
    }

    const novo = await Catalogo.create({ empresa: compradorId, catalogo });

    syncItensParaCatalogoMaster(catalogo).catch((err) =>
      console.warn("⚠️ Sync catálogo master:", err.message)
    );

    res.status(201).json({
      message: "Catálogo criado com sucesso.",
      catalogo: novo,
    });

  } catch (err) {
    console.error("❌ Erro ao criar catálogo:", err);
    res.status(500).json({ error: "Erro ao criar catálogo." });
  }
});

/* ============================================================
   📌 3) PUT /:empresaId — Atualizar ou criar catálogo (upsert)
   (O frontend usa PUT! ESTA PEÇA ERA O BUG MAIOR)
============================================================ */
router.put("/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();
    const { catalogo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }

    if (!Array.isArray(catalogo)) {
      return res.status(400).json({
        error: "Envie um array válido no campo 'catalogo'.",
      });
    }

    const catalogoLimpo = catalogo.filter(
      (item) => item && (item.nome || "").toString().trim()
    ).map((item) => ({
      nome: (item.nome || "").toString().trim(),
      secao: (item.secao || "").toString().trim() || "",
      marca: (item.marca || "").toString().trim() || "",
      unidade: (item.unidade || "").toString().trim() || "",
      similar: item.similar !== false,
      codigo: (item.codigo || "").toString().trim() || "",
      codigoBarras: (item.codigoBarras || "").toString().trim() || "",
    }));

    const empresaId = new mongoose.Types.ObjectId(compradorId);
    const atualizado = await Catalogo.findOneAndUpdate(
      { empresa: empresaId },
      { catalogo: catalogoLimpo },
      { new: true, upsert: true }
    );

    syncItensParaCatalogoMaster(catalogoLimpo).catch((err) =>
      console.warn("⚠️ Sync catálogo master:", err.message)
    );

    res.json({
      message: "Catálogo atualizado com sucesso.",
      catalogo: atualizado,
    });

  } catch (err) {
    console.error("❌ Erro ao atualizar catálogo:", err);
    res.status(500).json({ error: err.message || "Erro ao atualizar catálogo." });
  }
});

/* ============================================================
   📌 4) DELETE /:empresaId — Remover catálogo da empresa
============================================================ */
router.delete("/:compradorId", async (req, res) => {
  try {
    const compradorId = req.params.compradorId.trim();

    if (!mongoose.Types.ObjectId.isValid(compradorId)) {
      return res.status(400).json({ error: "ID de empresa inválido." });
    }

    const catalogo = await Catalogo.findOne({ empresa: compradorId });

    if (!catalogo) {
      return res.status(404).json({
        error: "Catálogo não encontrado para exclusão.",
      });
    }

    await Catalogo.deleteOne({ _id: catalogo._id });

    res.json({ message: "Catálogo excluído com sucesso." });

  } catch (err) {
    console.error("❌ Erro ao excluir catálogo:", err);
    res.status(500).json({ error: "Erro ao excluir catálogo." });
  }
});

export default router;