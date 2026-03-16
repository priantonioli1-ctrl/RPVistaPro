// routes/questionario.js — Diagnóstico de gestão e custos operacionais
import express from "express";
import jwt from "jsonwebtoken";
import RespostaQuestionario from "../models/RespostaQuestionario.js";
import Diagnostico from "../models/Diagnostico.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "segredo123";

function authQuestionario(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não fornecido." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const msg = err?.name === "TokenExpiredError" ? "Sua sessão expirou. Faça login novamente." : "Token inválido.";
    return res.status(401).json({ error: msg });
  }
}

// POST / ou POST (path vazio) — Salvar respostas do questionário (usuário questionario logado)
// Alguns clientes/servidores podem enviar para "" em vez de "/"
const salvarRespostasHandler = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const usuario = await Usuario.findById(userId).lean();
    if (!usuario || (usuario.tipo || "").toLowerCase() !== "questionario") {
      return res.status(403).json({ error: "Acesso restrito a usuários do tipo questionário." });
    }
    const { respostas } = req.body;
    const doc = await RespostaQuestionario.create({
      usuario: userId,
      nomeUsuario: usuario.nome,
      emailUsuario: usuario.email,
      respostas: respostas || {},
    });
    res.status(201).json({ message: "Diagnóstico enviado com sucesso!", id: doc._id });
  } catch (err) {
    console.error("Erro ao salvar questionário:", err);
    res.status(500).json({ error: "Erro ao salvar respostas." });
  }
};
// Suporta "", "/" e path explícito para garantir match
router.post(["/", ""], authQuestionario, salvarRespostasHandler);
router.post("/enviar-respostas", authQuestionario, salvarRespostasHandler);

// GET / — Listar respostas (para comprador/admin — precisa de auth comprador)
// Usado para você ter acesso às respostas e elaborar soluções
function authComprador(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não fornecido." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
}

router.get("/respostas", authComprador, async (req, res) => {
  try {
    const lista = await RespostaQuestionario.find()
      .sort({ concluidoEm: -1 })
      .limit(200)
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar respostas:", err);
    res.status(500).json({ error: "Erro ao listar respostas." });
  }
});

// GET /diagnosticos-comprador — Listar todos os diagnósticos (para comprador ver análises)
router.get("/diagnosticos-comprador", authComprador, async (req, res) => {
  try {
    const lista = await Diagnostico.find()
      .sort({ data: -1 })
      .limit(200)
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar diagnósticos:", err);
    res.status(500).json({ error: "Erro ao listar diagnósticos." });
  }
});

// POST /diagnosticos — Salvar diagnóstico completo (usuário questionario)
router.post("/diagnosticos", authQuestionario, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const usuario = await Usuario.findById(userId).lean();
    if (!usuario || (usuario.tipo || "").toLowerCase() !== "questionario") {
      return res.status(403).json({ error: "Acesso restrito a usuários do tipo questionário." });
    }
    const { diagnosticoItens, diagnosticoAvancadoItens, respostas } = req.body;
    const doc = await Diagnostico.create({
      usuario: userId,
      nomeUsuario: usuario.nome,
      diagnosticoItens: diagnosticoItens || [],
      diagnosticoAvancadoItens: diagnosticoAvancadoItens || [],
      respostas: respostas || {},
    });
    res.status(201).json({ ok: true, id: doc._id, data: doc.data });
  } catch (err) {
    console.error("Erro ao salvar diagnóstico:", err);
    res.status(500).json({ error: "Erro ao salvar diagnóstico." });
  }
});

// GET /diagnosticos — Listar diagnósticos do usuário questionario logado
router.get("/diagnosticos", authQuestionario, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const lista = await Diagnostico.find({ usuario: userId })
      .sort({ data: -1 })
      .limit(50)
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar diagnósticos:", err);
    res.status(500).json({ error: "Erro ao listar diagnósticos." });
  }
});

// POST /diagnosticos/apagar — Apagar diagnóstico (só o dono) — usa POST para evitar bloqueio de DELETE
router.post("/diagnosticos/apagar", authQuestionario, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID do diagnóstico obrigatório." });
    const userId = req.user?.id || req.user?._id;
    const doc = await Diagnostico.findOne({ _id: id, usuario: userId });
    if (!doc) return res.status(404).json({ error: "Diagnóstico não encontrado." });
    await Diagnostico.findByIdAndDelete(id);
    res.json({ ok: true, message: "Diagnóstico excluído." });
  } catch (err) {
    console.error("Erro ao apagar diagnóstico:", err);
    res.status(500).json({ error: "Erro ao apagar diagnóstico." });
  }
});

export default router;
