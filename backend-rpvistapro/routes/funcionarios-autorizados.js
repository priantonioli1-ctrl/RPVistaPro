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
// 📌 LISTAR FUNCIONÁRIOS (por empresa)
// ==================================================================
router.get("/", async (req, res) => {
  try {
    const empresa = req.query.empresa || EMPRESA_FIXA;
    const lista = await FuncionarioAutorizado.find({ empresa })
      .sort({ nome: 1 })
      .lean();
    // Não enviar embedding para o front (pesado e sensível)
    const listaSemEmbedding = lista.map((f) => {
      const { embedding, ...rest } = f;
      return rest;
    });
    return res.json(listaSemEmbedding);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar funcionários." });
  }
});

// ==================================================================
// 📌 OBTER UM FUNCIONÁRIO
// ==================================================================
router.get("/:id", async (req, res) => {
  try {
    const f = await FuncionarioAutorizado.findById(req.params.id).lean();
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });
    const { embedding, ...rest } = f;
    return res.json(rest);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar funcionário." });
  }
});

// ==================================================================
// 📌 ATUALIZAR FUNCIONÁRIO
// ==================================================================
router.patch("/:id", async (req, res) => {
  try {
    const { nome, email, cargo, cpf, telefone, departamento, dataAdmissao, anexos, ativo, salario, matricula, situacao, dataDesligamento, motivoDesligamento, registrosOcorrencia } = req.body;
    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (email !== undefined) update.email = email;
    if (cargo !== undefined) update.cargo = cargo;
    if (cpf !== undefined) update.cpf = cpf;
    if (telefone !== undefined) update.telefone = telefone;
    if (departamento !== undefined) update.departamento = departamento;
    if (dataAdmissao !== undefined) update.dataAdmissao = dataAdmissao ? new Date(dataAdmissao) : null;
    if (anexos !== undefined) update.anexos = Array.isArray(anexos) ? anexos.map((a) => ({ tipo: a.tipo || "outro", nome: a.nome || "", url: a.url, data: a.data ? new Date(a.data) : null, descricao: a.descricao })) : [];
    if (ativo !== undefined) update.ativo = ativo;
    if (situacao !== undefined) {
      update.situacao = situacao === "desligado" ? "desligado" : "ativo";
      update.ativo = situacao === "desligado" ? false : true;
    }
    if (dataDesligamento !== undefined) update.dataDesligamento = dataDesligamento ? new Date(dataDesligamento) : null;
    if (motivoDesligamento !== undefined) update.motivoDesligamento = motivoDesligamento?.trim() || null;
    if (registrosOcorrencia !== undefined) update.registrosOcorrencia = Array.isArray(registrosOcorrencia) ? registrosOcorrencia.map((r) => ({ data: r.data ? new Date(r.data) : new Date(), descricao: r.descricao || "", tipo: r.tipo || "neutra", registroPor: r.registroPor })) : [];
    if (salario !== undefined) update.salario = salario === "" || salario === null ? null : Number(salario);
    if (matricula !== undefined) update.matricula = matricula?.trim() || null;
    const f = await FuncionarioAutorizado.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });
    const { embedding, ...rest } = f;
    return res.json(rest);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar funcionário." });
  }
});

// ==================================================================
// 📌 CADASTRAR FUNCIONÁRIO (com ou sem embedding facial)
// ==================================================================
router.post("/cadastrar", async (req, res) => {
  try {
    const { empresa, nome, email, cargo, cpf, telefone, departamento, dataAdmissao, anexos, embedding, salario, matricula } = req.body;
    const empresaId = empresa || EMPRESA_FIXA;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório." });
    }

    const anexosNorm = Array.isArray(anexos)
      ? anexos.map((a) => ({
          tipo: a.tipo || "outro",
          nome: a.nome || (typeof a === "string" ? a : ""),
          url: a.url,
          data: a.data ? new Date(a.data) : null,
          descricao: a.descricao,
        }))
      : [];
    const payload = {
      empresa: empresaId,
      nome: nome.trim(),
      email: email && email.trim() ? email.trim() : undefined,
      cargo: cargo && cargo.trim() ? cargo.trim() : undefined,
      cpf: cpf && cpf.trim() ? cpf.trim() : undefined,
      telefone: telefone && telefone.trim() ? telefone.trim() : undefined,
      departamento: departamento && departamento.trim() ? departamento.trim() : undefined,
      dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : undefined,
      anexos: anexosNorm,
      ativo: true,
      situacao: "ativo",
      salario: salario != null && salario !== "" ? Number(salario) : null,
      matricula: matricula?.trim() || undefined,
    };
    if (Array.isArray(embedding) && embedding.length > 0) payload.embedding = embedding;

    const funcionario = await FuncionarioAutorizado.create(payload);

    return res.json({
      message: "Funcionário cadastrado com sucesso.",
      id: funcionario._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno ao cadastrar funcionário." });
  }
});

// ==================================================================
// 📌 EXCLUIR FUNCIONÁRIO
// ==================================================================
router.delete("/:id", async (req, res) => {
  try {
    const f = await FuncionarioAutorizado.findByIdAndDelete(req.params.id);
    if (!f) return res.status(404).json({ error: "Funcionário não encontrado." });
    return res.json({ message: "Funcionário excluído." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir funcionário." });
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
      ativo: true,
      embedding: { $exists: true, $ne: [] },
    }).lean();
    if (!funcionarios.length) {
      return res.status(404).json({
        error: "Nenhum funcionário autorizado cadastrado para esta empresa.",
      });
    }

    let melhor = null;
    let menorDistancia = Infinity;

    funcionarios.forEach((f) => {
      if (!Array.isArray(f.embedding) || f.embedding.length === 0) return;
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