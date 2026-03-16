// DiagnosticoRota.jsx — Página de diagnóstico para descobrir o problema da rota
import { useState, useEffect } from "react";
import { getApiUrl } from "../utils/apiUrl";

export default function DiagnosticoRota() {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    async function diagnosticar() {
      const apiUrl = getApiUrl();
      const token = sessionStorage.getItem("token") || "";
      const logs = [];

      logs.push(`📍 URL da API: ${apiUrl}`);
      logs.push(`📍 Host atual: ${window.location.origin}`);
      logs.push("");

      // Teste 1: GET /api/status
      try {
        const r1 = await fetch(`${apiUrl}/api/status`);
        const text1 = await r1.text();
        logs.push(`1. GET ${apiUrl}/api/status`);
        logs.push(`   Status: ${r1.status} ${r1.statusText}`);
        logs.push(`   Resposta: ${text1.substring(0, 100)}`);
        logs.push("");
      } catch (e) {
        logs.push(`1. GET /api/status — ERRO: ${e.message}`);
        logs.push("");
      }

      // Teste 2: POST /api/questionario/enviar-respostas
      try {
        const r2 = await fetch(`${apiUrl}/api/questionario/enviar-respostas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ respostas: { teste: true } }),
        });
        const text2 = await r2.text();
        let parsed = "";
        try {
          parsed = JSON.parse(text2);
          parsed = JSON.stringify(parsed);
        } catch {
          parsed = text2.substring(0, 200);
        }
        logs.push(`2. POST ${apiUrl}/api/questionario/enviar-respostas`);
        logs.push(`   Status: ${r2.status} ${r2.statusText}`);
        logs.push(`   Resposta: ${parsed}`);
        logs.push("");
      } catch (e) {
        logs.push(`2. POST /api/questionario/enviar-respostas — ERRO: ${e.message}`);
        logs.push("");
      }

      // Teste 3: POST /api/questionario (rota raiz)
      try {
        const r3 = await fetch(`${apiUrl}/api/questionario`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ respostas: { teste: true } }),
        });
        const text3 = await r3.text();
        logs.push(`3. POST ${apiUrl}/api/questionario`);
        logs.push(`   Status: ${r3.status} ${r3.statusText}`);
        logs.push(`   Resposta: ${text3.substring(0, 150)}`);
      } catch (e) {
        logs.push(`3. POST /api/questionario — ERRO: ${e.message}`);
      }

      setResultado(logs.join("\n"));
    }
    diagnosticar();
  }, []);

  const estilo = {
    container: {
      maxWidth: 720,
      margin: "40px auto",
      padding: 24,
      background: "#1a1a2e",
      color: "#e6edf3",
      fontFamily: "monospace",
      fontSize: "0.875rem",
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.1)",
    },
    titulo: { marginBottom: 16, fontSize: "1.25rem" },
    btn: {
      marginTop: 16,
      padding: "10px 20px",
      background: "#0ea5e9",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
    },
  };

  function copiar() {
    if (resultado) {
      navigator.clipboard.writeText(resultado);
      alert("Copiado! Cole e envie para análise.");
    }
  }

  return (
    <div style={estilo.container}>
      <h2 style={estilo.titulo}>🔍 Diagnóstico da API / Rotas</h2>
      <p style={{ color: "#8b949e", marginBottom: 16 }}>
        Esta página testa as rotas em tempo real. Copie o resultado e envie para identificar o problema.
      </p>
      {resultado ? (
        <>
          <div>{resultado}</div>
          <button type="button" onClick={copiar} style={estilo.btn}>
            Copiar resultado
          </button>
        </>
      ) : (
        <p>Executando testes...</p>
      )}
    </div>
  );
}
