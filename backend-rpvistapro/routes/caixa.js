import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Caixa from "../models/Caixa.js";
import Comanda from "../models/Comanda.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "segredo123";

function auth(req, res, next) {
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

function getEmpresaId(req) {
  return req.user?.compradorId || req.user?.id || req.user?._id;
}

// POST /confirmar-senha — Verificar senha do usuário (para operações sensíveis)
router.post("/confirmar-senha", auth, async (req, res) => {
  try {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ error: "Senha obrigatória." });
    const userId = req.user?.id || req.user?._id;
    const usuario = await Usuario.findById(userId);
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });
    const ok = await bcrypt.compare(senha, usuario.senha);
    if (!ok) return res.status(401).json({ error: "Senha incorreta." });
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao confirmar senha:", err);
    res.status(500).json({ error: "Erro ao confirmar senha." });
  }
});

// GET /status — Status atual do caixa
router.get("/status", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });
    const caixa = await Caixa.findOne({ empresa: empresaId, status: "aberto" })
      .populate("usuario", "nome email")
      .sort({ abertoEm: -1 })
      .lean();
    res.json({ caixa: caixa || null });
  } catch (err) {
    console.error("Erro ao consultar caixa:", err);
    res.status(500).json({ error: "Erro ao consultar caixa." });
  }
});

// POST /abrir — Abrir caixa
router.post("/abrir", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });
    const { senha, valorAbertura } = req.body;
    if (!senha) return res.status(400).json({ error: "Senha obrigatória para abrir o caixa." });
    const usuario = await Usuario.findById(req.user?.id || req.user?._id);
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });
    const ok = await bcrypt.compare(senha, usuario.senha);
    if (!ok) return res.status(401).json({ error: "Senha incorreta." });
    const existente = await Caixa.findOne({ empresa: empresaId, status: "aberto" });
    if (existente) return res.status(400).json({ error: "Já existe um caixa aberto." });
    const valor = parseFloat(valorAbertura) || 0;
    const novo = await Caixa.create({
      empresa: empresaId,
      usuario: usuario._id,
      abertoEm: new Date(),
      valorAbertura: valor,
      status: "aberto",
    });
    const pop = await Caixa.findById(novo._id).populate("usuario", "nome email").lean();
    res.status(201).json({ message: "Caixa aberto.", caixa: pop });
  } catch (err) {
    console.error("Erro ao abrir caixa:", err);
    res.status(500).json({ error: "Erro ao abrir caixa." });
  }
});

// POST /fechar — Fechar caixa
router.post("/fechar", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });
    const { senha, valorFechamento, observacoes } = req.body;
    if (!senha) return res.status(400).json({ error: "Senha obrigatória para fechar o caixa." });
    const usuario = await Usuario.findById(req.user?.id || req.user?._id);
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });
    const ok = await bcrypt.compare(senha, usuario.senha);
    if (!ok) return res.status(401).json({ error: "Senha incorreta." });
    const caixa = await Caixa.findOne({ empresa: empresaId, status: "aberto" });
    if (!caixa) return res.status(400).json({ error: "Nenhum caixa aberto." });
    const comandasDesteCaixa = await Comanda.find({
      empresa: empresaId,
      status: "fechada",
      caixaId: caixa._id,
    });
    const valorCalculado = comandasDesteCaixa.reduce((s, c) => s + (c.total || 0), 0);
    const valorEntrada = parseFloat(valorFechamento) ?? valorCalculado + caixa.valorAbertura;
    caixa.status = "fechado";
    caixa.fechadoEm = new Date();
    caixa.valorFechamento = valorEntrada;
    caixa.valorCalculado = valorCalculado;
    caixa.observacoes = (observacoes || "").trim();
    await caixa.save();
    const pop = await Caixa.findById(caixa._id).populate("usuario", "nome email").lean();
    res.json({ message: "Caixa fechado.", caixa: pop });
  } catch (err) {
    console.error("Erro ao fechar caixa:", err);
    res.status(500).json({ error: "Erro ao fechar caixa." });
  }
});

// GET /historico — Histórico de aberturas/fechamentos
router.get("/historico", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });
    const limite = Math.min(parseInt(req.query.limit) || 30, 100);
    const lista = await Caixa.find({ empresa: empresaId })
      .populate("usuario", "nome")
      .sort({ abertoEm: -1 })
      .limit(limite)
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar histórico:", err);
    res.status(500).json({ error: "Erro ao listar histórico." });
  }
});

// GET /conferencia/:id — Conferência de um caixa fechado
router.get("/conferencia/:id", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const caixa = await Caixa.findOne({ _id: req.params.id, empresa: empresaId })
      .populate("usuario", "nome email")
      .lean();
    if (!caixa) return res.status(404).json({ error: "Caixa não encontrado." });
    const comandas = await Comanda.find({ caixaId: caixa._id }).lean();
    const totalVendas = comandas.reduce((s, c) => s + (c.total || 0), 0);
    res.json({
      caixa,
      comandas,
      totalVendas,
      diferenca: (caixa.valorFechamento || 0) - (caixa.valorAbertura || 0) - totalVendas,
    });
  } catch (err) {
    console.error("Erro na conferência:", err);
    res.status(500).json({ error: "Erro na conferência." });
  }
});

export default router;
