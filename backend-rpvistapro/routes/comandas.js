import express from "express";
import Comanda from "../models/Comanda.js";
import Caixa from "../models/Caixa.js";
import jwt from "jsonwebtoken";

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

// GET / — Listar comandas (abertas por padrão)
router.get("/", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });
    const status = req.query.status || "aberta";
    const lista = await Comanda.find({ empresa: empresaId, status })
      .sort({ createdAt: -1 })
      .lean();
    res.json(lista);
  } catch (err) {
    console.error("Erro ao listar comandas:", err);
    res.status(500).json({ error: "Erro ao listar comandas." });
  }
});

// POST / — Abrir nova comanda
router.post("/", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: "Empresa não identificada." });
    const { codigo } = req.body;
    if (!(codigo || "").trim()) return res.status(400).json({ error: "Código da mesa/comanda obrigatório." });
    const existe = await Comanda.findOne({ empresa: empresaId, codigo: codigo.trim(), status: "aberta" });
    if (existe) return res.status(400).json({ error: `Já existe comanda aberta com código "${codigo}".` });
    const nova = await Comanda.create({
      empresa: empresaId,
      codigo: codigo.trim(),
      usuarioAbertura: req.user.id || req.user._id,
    });
    res.status(201).json(nova);
  } catch (err) {
    console.error("Erro ao criar comanda:", err);
    res.status(500).json({ error: "Erro ao criar comanda." });
  }
});

// GET /:id — Buscar comanda
router.get("/:id", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const comanda = await Comanda.findOne({ _id: req.params.id, empresa: empresaId }).lean();
    if (!comanda) return res.status(404).json({ error: "Comanda não encontrada." });
    res.json(comanda);
  } catch (err) {
    console.error("Erro ao buscar comanda:", err);
    res.status(500).json({ error: "Erro ao buscar comanda." });
  }
});

// PUT /:id — Adicionar itens ou atualizar
router.put("/:id", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const comanda = await Comanda.findOne({ _id: req.params.id, empresa: empresaId });
    if (!comanda) return res.status(404).json({ error: "Comanda não encontrada." });
    if (comanda.status !== "aberta") return res.status(400).json({ error: "Comanda já fechada." });
    const { itens } = req.body;
    if (Array.isArray(itens)) {
      comanda.itens = [...(comanda.itens || []), ...itens];
    }
    comanda.total = (comanda.itens || []).reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
    await comanda.save();
    res.json(comanda);
  } catch (err) {
    console.error("Erro ao atualizar comanda:", err);
    res.status(500).json({ error: "Erro ao atualizar comanda." });
  }
});

// PATCH /:id/itens/:itemId — Remover item
router.patch("/:id/itens/:itemId", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const comanda = await Comanda.findOne({ _id: req.params.id, empresa: empresaId });
    if (!comanda) return res.status(404).json({ error: "Comanda não encontrada." });
    if (comanda.status !== "aberta") return res.status(400).json({ error: "Comanda já fechada." });
    comanda.itens = (comanda.itens || []).filter((i) => String(i._id) !== req.params.itemId);
    comanda.total = comanda.itens.reduce((s, i) => s + (i.quantidade || 0) * (i.precoUnitario || 0), 0);
    await comanda.save();
    res.json(comanda);
  } catch (err) {
    console.error("Erro ao remover item:", err);
    res.status(500).json({ error: "Erro ao remover item." });
  }
});

// POST /:id/cancelar — Cancelar comanda (fecha sem pagamento, requer senha)
router.post("/:id/cancelar", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const comanda = await Comanda.findOne({ _id: req.params.id, empresa: empresaId });
    if (!comanda) return res.status(404).json({ error: "Comanda não encontrada." });
    if (comanda.status !== "aberta") return res.status(400).json({ error: "Comanda já fechada." });
    comanda.status = "fechada";
    comanda.fechadoEm = new Date();
    comanda.usuarioFechamento = req.user.id || req.user._id;
    await comanda.save();
    res.json({ message: "Comanda cancelada.", comanda });
  } catch (err) {
    console.error("Erro ao cancelar comanda:", err);
    res.status(500).json({ error: "Erro ao cancelar comanda." });
  }
});

// POST /:id/fechar — Fechar comanda (com pagamento)
router.post("/:id/fechar", auth, async (req, res) => {
  try {
    const empresaId = getEmpresaId(req);
    const comanda = await Comanda.findOne({ _id: req.params.id, empresa: empresaId });
    if (!comanda) return res.status(404).json({ error: "Comanda não encontrada." });
    if (comanda.status !== "aberta") return res.status(400).json({ error: "Comanda já fechada." });
    const caixaAberto = await Caixa.findOne({ empresa: empresaId, status: "aberto" });
    comanda.status = "fechada";
    comanda.fechadoEm = new Date();
    comanda.usuarioFechamento = req.user.id || req.user._id;
    if (caixaAberto) comanda.caixaId = caixaAberto._id;
    await comanda.save();
    res.json({ message: "Comanda fechada.", comanda });
  } catch (err) {
    console.error("Erro ao fechar comanda:", err);
    res.status(500).json({ error: "Erro ao fechar comanda." });
  }
});

export default router;
