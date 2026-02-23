// routes/ponto.js — Registrador eletrônico de ponto
import express from "express";
import RegistroPonto from "../models/RegistroPonto.js";
import FuncionarioAutorizado from "../models/FuncionarioAutorizado.js";

const router = express.Router();

// POST /bater — Registrar batida de ponto (por CPF, matrícula ou ID do funcionário)
// body: { empresa, identificador (cpf|matricula|id), tipo, metodo?, dispositivoId?, ip? }
router.post("/bater", async (req, res) => {
  try {
    const { empresa, identificador, tipo, metodo, dispositivoId, ip } = req.body;
    if (!empresa || !identificador || !tipo) {
      return res.status(400).json({ error: "Empresa, identificador e tipo são obrigatórios." });
    }
    const tiposValidos = ["entrada", "saida", "intervalo-inicio", "intervalo-fim"];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido. Use: entrada, saida, intervalo-inicio, intervalo-fim." });
    }

    let funcionario = null;
    const idStr = String(identificador).trim();
    // Busca por ID
    if (idStr.match(/^[a-f0-9]{24}$/i)) {
      funcionario = await FuncionarioAutorizado.findOne({ _id: idStr, empresa, ativo: true }).lean();
    }
    if (!funcionario) {
      const cpfLimpo = idStr.replace(/\D/g, "");
      const matricula = idStr;
      funcionario = await FuncionarioAutorizado.findOne({
        empresa,
        ativo: true,
        $or: [
          { cpf: { $regex: cpfLimpo, $options: "i" } },
          { cpf: idStr },
          { matricula: idStr },
          { matricula: idStr.toUpperCase() },
        ],
      }).lean();
    }
    if (!funcionario) {
      return res.status(404).json({ error: "Funcionário não encontrado ou inativo. Verifique CPF ou matrícula." });
    }

    const registro = await RegistroPonto.create({
      funcionario: funcionario._id,
      empresa,
      tipo,
      dataHora: new Date(),
      metodo: metodo || "web",
      dispositivoId: dispositivoId || undefined,
      ip: ip || req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim(),
    });

    res.status(201).json({
      message: `${tipo === "entrada" ? "Entrada" : tipo === "saida" ? "Saída" : tipo.includes("intervalo") ? "Intervalo" : ""} registrada.`,
      registro: {
        _id: registro._id,
        tipo: registro.tipo,
        dataHora: registro.dataHora,
        funcionario: { _id: funcionario._id, nome: funcionario.nome, matricula: funcionario.matricula },
      },
    });
  } catch (err) {
    console.error("Erro ao bater ponto:", err);
    res.status(500).json({ error: "Erro ao registrar ponto." });
  }
});

// GET /historico — Histórico de ponto por funcionário
// query: empresa, funcionarioId, dataInicio, dataFim
router.get("/historico", async (req, res) => {
  try {
    const { empresa, funcionarioId, dataInicio, dataFim } = req.query;
    if (!empresa || !funcionarioId) {
      return res.status(400).json({ error: "empresa e funcionarioId são obrigatórios." });
    }
    const filtro = { empresa, funcionario: funcionarioId };
    if (dataInicio || dataFim) {
      filtro.dataHora = {};
      if (dataInicio) filtro.dataHora.$gte = new Date(dataInicio);
      if (dataFim) filtro.dataHora.$lte = new Date(dataFim + "T23:59:59.999Z");
    }
    const lista = await RegistroPonto.find(filtro)
      .sort({ dataHora: 1 })
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
    res.status(500).json({ error: "Erro ao buscar histórico de ponto." });
  }
});

// GET /ultima — Última batida do funcionário (para exibir status)
router.get("/ultima", async (req, res) => {
  try {
    const { empresa, funcionarioId } = req.query;
    if (!empresa || !funcionarioId) {
      return res.status(400).json({ error: "empresa e funcionarioId são obrigatórios." });
    }
    const ultima = await RegistroPonto.findOne({ empresa, funcionario: funcionarioId })
      .sort({ dataHora: -1 })
      .lean();
    res.json(ultima || null);
  } catch (err) {
    console.error("Erro ao buscar última batida:", err);
    res.status(500).json({ error: "Erro ao buscar última batida." });
  }
});

export default router;
