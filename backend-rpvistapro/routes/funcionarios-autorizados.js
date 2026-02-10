// routes/funcionarios-autorizados.js
import express from "express";
import FuncionarioAutorizado from "../models/FuncionarioAutorizado.js";

const router = express.Router();

const EMPRESA_FIXA = "cpro"; // <<< coloque o nome da sua empresa aqui

// Função auxiliar para calcular distância entre embeddings
function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ==================================================================
// 📌 CADASTRAR FUNCIONÁRIO AUTORIZADO
// ==================================================================
router.post("/cadastrar", async (req, res) => {
  try {
    const { empresa, nome, email, cargo, embedding } = req.body;

    if (!empresa || !nome || !Array.isArray(embedding) || embedding.length === 0) {
      return res.status(400).json({
        error: "Empresa, nome e embedding facial são obrigatórios.",
      });
    }

    const funcionario = await FuncionarioAutorizado.create({
      empresa,
      nome,
      email,
      cargo,
      embedding,
      ativo: true,
    });

    return res.json({
      message: "Funcionário autorizado cadastrado com sucesso.",
      id: funcionario._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno ao cadastrar funcionário." });
  }
});

// ==================================================================
// 📌 AUTENTICAR FUNCIONÁRIO
// ==================================================================
router.post("/autenticar", async (req, res) => {
  try {
    const { empresa, embedding } = req.body;

    if (!empresa) {
      return res.status(400).json({ error: "Empresa não informada." });
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return res.status(400).json({ error: "Embedding facial inválido." });
    }

    const funcionarios = await FuncionarioAutorizado.find({
      empresa,
      ativo: true
    }).lean();
        if (!funcionarios.length) {
      return res.status(404).json({
        error: "Nenhum funcionário autorizado cadastrado para esta empresa.",
      });
    }

    let melhor = null;
    let menorDistancia = Infinity;

    funcionarios.forEach((f) => {
      const dist = euclideanDistance(embedding, f.embedding);
      if (dist < menorDistancia) {
        menorDistancia = dist;
        melhor = f;
      }
    });

    const LIMIAR = 0.6;

    if (!melhor || menorDistancia > LIMIAR) {
      console.log(
        `🚫 Rosto não reconhecido para ${EMPRESA_FIXA}. Distância: ${menorDistancia}`
      );
      return res.json({ autenticado: false });
    }

    console.log(
      `✅ Autenticado: ${melhor.nome} (${EMPRESA_FIXA}) — distância: ${menorDistancia}`
    );

    return res.json({
      autenticado: true,
      distancia: menorDistancia,
      funcionario: {
        id: melhor._id,
        nome: melhor.nome,
        email: melhor.email,
        cargo: melhor.cargo,
      },
    });

  } catch (err) {
    console.error("❌ Erro na autenticação facial:", err);
    return res.status(500).json({ error: "Erro interno na autenticação facial." });
  }
});

export default router;