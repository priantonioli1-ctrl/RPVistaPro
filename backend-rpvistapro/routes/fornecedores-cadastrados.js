// routes/fornecedores-cadastrados.js
import express from "express";
import FornecedorCadastrado from "../models/FornecedorCadastrado.js";

const router = express.Router();

/* ----------------------------------------------------
   GET - Listar todos os fornecedores cadastrados
---------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const lista = await FornecedorCadastrado.find().sort({ empresa: 1 });
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar fornecedores:", err);
    res.status(500).json({ error: "Erro ao listar fornecedores" });
  }
});

/* ----------------------------------------------------
   POST - Adicionar um fornecedor (evita duplicação)
---------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const { empresa, cnpj, email } = req.body;

    if (!empresa) {
      return res.status(400).json({ error: "Empresa é obrigatória" });
    }

    // verifica duplicação
    const existente = await FornecedorCadastrado.findOne({
      empresa: { $regex: new RegExp("^" + empresa + "$", "i") },
    });

    if (existente) {
      return res.json(existente); // já existe → retorna ele
    }

    const novo = new FornecedorCadastrado({
      empresa,
      cnpj: cnpj || "",
      email: email || "",
    });

    await novo.save();
    res.json(novo);
  } catch (err) {
    console.error("Erro ao cadastrar fornecedor:", err);
    res.status(500).json({ error: "Erro ao cadastrar fornecedor" });
  }
});

export default router;