// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import uploadRoutes from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 🧩 Carrega variáveis de ambiente (.env)
dotenv.config();

// 🔹 Importa rotas
import pedidosRoutes from "./routes/pedidos.js";
import catalogosRoutes from "./routes/catalogos.js";
import itensCotacaoRoutes from "./routes/itens-cotacao.js";
import catalogosFornecedoresRoutes from "./routes/catalogos-fornecedores.js";
import catalogoMasterRoutes from "./routes/catalogo-master.js";
import usuariosRoutes from "./routes/usuarios.js";
import estoqueRoutes from "./routes/estoque.js";
import funcionariosAutorizadosRouter from "./routes/funcionarios-autorizados.js";
import requisicoesEstoqueRoutes from "./routes/requisicoes-estoque.js";
import fichasTecnicasRoutes from "./routes/fichas-tecnicas.js";
import produtosVendaRoutes from "./routes/produtos-venda.js";
import notasFiscaisRoutes from "./routes/notas-fiscais.js";
import estoqueFornecedorRoutes from "./routes/estoque-fornecedor.js";
import fornecedoresCadastradosRoutes from "./routes/fornecedores-cadastrados.js";
import fornecedoresRoutes from "./routes/fornecedores.js";
import comandasRoutes from "./routes/comandas.js";
import caixaRoutes from "./routes/caixa.js";
import pontoRoutes from "./routes/ponto.js";
import cardapioPdvRoutes from "./routes/cardapio-pdv.js";
import orcamentosRoutes from "./routes/orcamentos.js";
import produtosOrcamentoRoutes from "./routes/produtos-orcamento.js";
import modelosFichaOrcamentoRoutes from "./routes/modelos-ficha-orcamento.js";
import tipoPropostaRoutes from "./routes/tipo-proposta.js";
import propostasRoutes from "./routes/propostas.js";
import estadosRoutes from "./routes/estados.js";
import vendasRoutes from "./routes/vendas.js";
import certificadoEmpresaRoutes from "./routes/certificado-empresa.js";
import impressoraFiscalRoutes from "./routes/impressora-fiscal.js";
import nfceRoutes from "./routes/nfce.js";
import questionarioRoutes from "./routes/questionario.js";
import dreRoutes from "./routes/dre.js";
const app =
 express();

// 🌐 Configurações básicas de servidor
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
// 🧠 Middleware global para log de requisições (mais limpo)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.originalUrl}`);
  next();
});

// ⚙️ Variáveis do ambiente
const { MONGODB_URI, PORT = 4001 } = process.env;

// 🚨 Verifica se o Mongo está configurado
if (!MONGODB_URI) {
  console.error("❌ ERRO: MONGODB_URI não definido no .env!");
  process.exit(1);
}

// 🧩 Rota de status da API
app.get("/api/status", (req, res) => res.json({ status: "API funcionando 🚀" }));

// Rota explícita para enviar respostas (evita 404 no path raiz)
app.use("/api/questionario/enviar-respostas", questionarioRoutes);

// 🛒 Rotas principais da API
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/catalogos", catalogosRoutes);
app.use("/api/catalogos-fornecedores", catalogosFornecedoresRoutes);
app.use("/api/catalogo-master", catalogoMasterRoutes);
app.use("/api/itens-cotacao", itensCotacaoRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/estoque", estoqueRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/funcionarios-autorizados", funcionariosAutorizadosRouter);
app.use("/api/requisicoes", requisicoesEstoqueRoutes);
app.use("/api/fichas-tecnicas", fichasTecnicasRoutes);
app.use("/api/produtos-venda", produtosVendaRoutes);
app.use("/api/notas-fiscais", notasFiscaisRoutes);
app.use("/api/estoque-fornecedor", estoqueFornecedorRoutes);
app.use("/api/fornecedores-cadastrados", fornecedoresCadastradosRoutes);
app.use("/api/fornecedores", fornecedoresRoutes);
app.use("/api/comandas", comandasRoutes);
app.use("/api/caixa", caixaRoutes);
app.use("/api/ponto", pontoRoutes);
app.use("/api/cardapio-pdv", cardapioPdvRoutes);
app.use("/api/orcamentos", orcamentosRoutes);
app.use("/api/produtos-orcamento", produtosOrcamentoRoutes);
app.use("/api/modelos-ficha-orcamento", modelosFichaOrcamentoRoutes);
app.use("/api/tipo-proposta", tipoPropostaRoutes);
app.use("/api/propostas", propostasRoutes);
app.use("/api/estados", estadosRoutes);
app.use("/api/vendas", vendasRoutes);
app.use("/api/certificado-empresa", certificadoEmpresaRoutes);
app.use("/api/impressora-fiscal", impressoraFiscalRoutes);
app.use("/api/nfce", nfceRoutes);
app.use("/api/questionario", questionarioRoutes);
app.use("/api/dre", dreRoutes);

// 📦 Frontend React (quando build existe - ex.: Render)
const buildPath = path.join(__dirname, "../cpro/build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(buildPath, "index.html"), (err) => err && next(err));
  });
} else {
  app.get("/", (req, res) => res.json({ status: "API funcionando 🚀" }));
}

// ⚠️ Middleware para rotas inexistentes
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// 🔌 Conecta ao MongoDB e só então inicia o servidor
mongoose
  .connect(MONGODB_URI, { dbName: "meubanco" })
  .then(() => {
    console.log("✅ MongoDB conectado com sucesso");
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar no MongoDB:", err.message);
    process.exit(1);
  });