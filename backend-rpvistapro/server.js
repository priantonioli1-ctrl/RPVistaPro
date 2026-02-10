// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import uploadRoutes from "./routes/upload.js";
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
import fornecedoresCadastradosRoutes from "./routes/fornecedores-cadastrados.js";
import fornecedoresRoutes from "./routes/fornecedores.js";
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

// 🧩 Rota de status para teste rápido
app.get("/", (req, res) => res.json({ status: "API funcionando 🚀" }));

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
app.use("/api/fornecedores-cadastrados", fornecedoresCadastradosRoutes);
app.use("/api/fornecedores", fornecedoresRoutes);
// ⚠️ Middleware para rotas inexistentes
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// 🔌 Conecta ao MongoDB e só então inicia o servidor
mongoose
  .connect(MONGODB_URI, { dbName: "meubanco" })
  .then(() => {
    console.log("✅ MongoDB conectado com sucesso");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar no MongoDB:", err.message);
    process.exit(1);
  });