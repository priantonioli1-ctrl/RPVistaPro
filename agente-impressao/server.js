/**
 * Agente de impressão local — recebe dados da venda do PDV e imprime o cupom
 *
 * Uso:
 *   1. cd agente-impressao && npm install && npm start
 *   2. Configure em Impressora Fiscal a URL: http://localhost:9999
 *   3. Ao finalizar venda no PDV, o cupom será enviado aqui
 *
 * Para impressora térmica/fiscal: instale node-thermal-printer e descomente o código
 * Para ECF Daruma/Bematech: use a SDK do fabricante em imprimirEc.js
 */
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 9999;
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

// POST /imprimir — Recebe dados da venda
app.post("/imprimir", (req, res) => {
  try {
    const { venda, itens, total, formaPagamento, nomeFantasia, cnpj, endereco } = req.body;

    if (!itens && !venda?.itens) {
      return res.status(400).json({ error: "Nenhum item para imprimir." });
    }

    const listaItens = itens || venda?.itens || [];
    const totalValor = total ?? venda?.total ?? 0;
    const formaPgto = formaPagamento || venda?.formaPagamento || "Dinheiro";
    const totalIBS = venda?.totalIBS ?? listaItens.reduce((s, i) => s + (Number(i.valorIBS) || 0), 0);
    const totalCBS = venda?.totalCBS ?? listaItens.reduce((s, i) => s + (Number(i.valorCBS) || 0), 0);

    // Monta o cupom em texto (Lei da Transparência — Reforma Tributária EC 132/2023)
    const linhas = [];
    linhas.push("========================================");
    linhas.push(nomeFantasia || "CUPOM FISCAL");
    if (cnpj) linhas.push(`CNPJ: ${cnpj}`);
    if (endereco) linhas.push(endereco);
    linhas.push("----------------------------------------");
    linhas.push(`${"Item".padEnd(20)} Qtd   Valor    Total`);
    linhas.push("----------------------------------------");

    listaItens.forEach((i) => {
      const nome = String(i.nome || "").slice(0, 18).padEnd(18);
      const qtd = String(i.quantidade || 1).padStart(4);
      const preco = (i.precoUnitario ?? i.preco ?? 0).toFixed(2).padStart(8);
      const subtotal = ((i.quantidade || 1) * (i.precoUnitario ?? i.preco ?? 0)).toFixed(2).padStart(10);
      linhas.push(`${nome} ${qtd} ${preco} ${subtotal}`);
    });

    linhas.push("----------------------------------------");
    linhas.push(`SUBTOTAL: R$ ${Number(totalValor).toFixed(2)}`);
    if (totalIBS > 0 || totalCBS > 0) {
      linhas.push(`IBS (Est./Mun.): R$ ${Number(totalIBS).toFixed(2)}`);
      linhas.push(`CBS (Federal):   R$ ${Number(totalCBS).toFixed(2)}`);
    }
    linhas.push(`TOTAL: R$ ${Number(totalValor).toFixed(2)}`);
    linhas.push(`Pagamento: ${formaPgto}`);
    linhas.push("========================================");
    linhas.push(`Data: ${new Date().toLocaleString("pt-BR")}`);
    linhas.push("========================================");

    const cupomTexto = linhas.join("\n");
    console.log("\n" + cupomTexto + "\n");

    // TODO: Enviar para impressora real
    // Opção 1 - Térmica ESC/POS: use node-thermal-printer ou escpos
    // Opção 2 - ECF Daruma/Bematech: use a DLL/SDK do fabricante
    // Opção 3 - Imprimir via sistema: require('child_process').exec('echo "..." | lpr')

    res.json({ ok: true, message: "Cupom recebido. Verifique o console." });
  } catch (err) {
    console.error("Erro ao processar impressão:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /imprimir-resumo-caixa — Resumo do caixa por forma de pagamento
app.post("/imprimir-resumo-caixa", (req, res) => {
  try {
    const { valorAbertura, totalVendas, valorFechamento, resumoFormas, nomeFantasia, cnpj } = req.body;

    const linhas = [];
    linhas.push("========================================");
    linhas.push("       RESUMO DE CONFERÊNCIA DE CAIXA");
    linhas.push("========================================");
    if (nomeFantasia) linhas.push(nomeFantasia);
    if (cnpj) linhas.push(`CNPJ: ${cnpj}`);
    linhas.push("----------------------------------------");
    linhas.push(`Valor abertura:   R$ ${Number(valorAbertura || 0).toFixed(2)}`);
    linhas.push(`Total vendas:      R$ ${Number(totalVendas || 0).toFixed(2)}`);
    linhas.push(`Esperado (a+v):    R$ ${(Number(valorAbertura || 0) + Number(totalVendas || 0)).toFixed(2)}`);
    linhas.push("----------------------------------------");
    linhas.push("     POR FORMA DE PAGAMENTO");
    linhas.push("----------------------------------------");
    (resumoFormas || []).forEach((f) => {
      linhas.push(`${String(f.forma || "").padEnd(18)} R$ ${Number(f.valor || 0).toFixed(2)}`);
    });
    linhas.push("----------------------------------------");
    linhas.push(`Valor fechamento:  R$ ${Number(valorFechamento || 0).toFixed(2)}`);
    linhas.push("========================================");
    linhas.push(`Data: ${new Date().toLocaleString("pt-BR")}`);
    linhas.push("========================================");

    console.log("\n" + linhas.join("\n") + "\n");

    res.json({ ok: true, message: "Resumo de caixa recebido. Verifique o console." });
  } catch (err) {
    console.error("Erro ao imprimir resumo:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /status — Health check
app.get("/status", (req, res) => {
  res.json({ status: "ok", agente: "impressao", porta: PORT });
});

app.listen(PORT, () => {
  console.log(`Agente de impressão rodando em http://localhost:${PORT}`);
  console.log("POST /imprimir — recebe dados da venda");
  console.log("Configure em Impressora Fiscal a URL: http://localhost:" + PORT);
});
