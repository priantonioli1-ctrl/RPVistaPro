// Entrada de mercadorias por Nota Fiscal — upload de XML da NFe e baixa automática no estoque
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getApiUrl } from "../../utils/apiUrl";
import { parseNFeXml } from "../../utils/parseNFeXml";

const API_URL = getApiUrl();
const BORDER = "1px solid rgba(255,255,255,0.08)";

export default function EntradaPorNotaFiscal() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dadosNf, setDadosNf] = useState(null);
  const [erroParse, setErroParse] = useState("");
  const [processando, setProcessando] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    if (!u?._id && !u?.compradorId) {
      navigate("/");
      return;
    }
    setUsuario(u);
  }, [navigate]);

  function getEmpresaId() {
    return usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      Swal.fire("Atenção", "Selecione um arquivo XML da NFe (.xml).", "warning");
      return;
    }
    setDadosNf(null);
    setErroParse("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const xml = ev.target?.result;
        if (typeof xml !== "string") {
          setErroParse("Não foi possível ler o arquivo.");
          return;
        }
        const parsed = parseNFeXml(xml);
        if (!parsed.itens || parsed.itens.length === 0) {
          setErroParse("Nenhum item de produto encontrado no XML.");
          return;
        }
        parsed.itens = parsed.itens.map((i) => ({ ...i, bonificacao: false }));
        setDadosNf(parsed);
      } catch (err) {
        setErroParse(err.message || "Erro ao interpretar o XML da NFe.");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  async function confirmarEntrada() {
    if (!dadosNf || !dadosNf.itens?.length) {
      Swal.fire("Atenção", "Carregue um XML válido primeiro.", "warning");
      return;
    }
    const empresaId = getEmpresaId();
    if (!empresaId) {
      Swal.fire("Erro", "Empresa não identificada.", "error");
      return;
    }

    const confirma = await Swal.fire({
      title: "Confirmar entrada",
      html: `
        <p style="color:#e6edf3;margin-bottom:12px">
          Serão registradas <strong>${dadosNf.itens.length}</strong> entrada(s) no estoque.
        </p>
        <p style="color:#8b949e;font-size:0.9rem">
          NF nº ${dadosNf.numeroNF} — ${dadosNf.fornecedor}
        </p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, registrar",
      confirmButtonColor: "#20b5a6",
    });

    if (!confirma.isConfirmed) return;

    setProcessando(true);
    try {
      const res = await fetch(`${API_URL}/api/estoque/entrada-nf/${empresaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroNF: dadosNf.numeroNF,
          dataEmissao: dadosNf.dataEmissao,
          fornecedor: dadosNf.fornecedor,
          itens: dadosNf.itens.map((i) => ({
            nome: i.nome,
            unidade: i.unidade || "un",
            quantidade: i.quantidade,
            bonificacao: !!i.bonificacao,
            validade: i.validade || undefined,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao registrar entrada.");

      Swal.fire("Sucesso", data.message || "Entrada registrada com sucesso.", "success");
      setDadosNf(null);
      setErroParse("");
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setProcessando(false);
    }
  }

  function limpar() {
    setDadosNf(null);
    setErroParse("");
    fileInputRef.current?.focus();
  }

  if (!usuario) return null;

  return (
    <div className="layout-content-inner" style={{ width: "100%", padding: 0, boxSizing: "border-box", color: "#e6edf3" }}>
      <main style={{ margin: "24px 0", padding: "0 20px 40px" }}>
        <div className="card-panel" style={{ padding: 24, border: BORDER }}>
          <h2 style={{ marginBottom: 8, color: "#e6edf3", fontSize: "1.5rem" }}>
            Entrada de mercadorias por Nota Fiscal
          </h2>
          <p style={{ color: "#8b949e", marginBottom: 24, fontSize: "0.9375rem" }}>
            Faça o upload do arquivo XML da NFe (modelo 55) emitida para sua empresa. O sistema extrai os itens e registra a entrada no estoque automaticamente.
          </p>

          <div style={boxUpload}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,application/xml,text/xml"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={btnUpload}
            >
              Escolher arquivo XML da NFe
            </button>
            <span style={{ color: "#8b949e", fontSize: "0.875rem", marginTop: 8 }}>
              Arquivo .xml baixado do e-mail, portal da NF-e ou SEFAZ
            </span>
          </div>

          {erroParse && (
            <div style={msgErro}>
              <strong>Erro:</strong> {erroParse}
            </div>
          )}

          {dadosNf && (
            <div style={boxPreview}>
              <div style={headerPreview}>
                <div>
                  <strong style={{ fontSize: "1.125rem", color: "#e6edf3" }}>NF-e nº {dadosNf.numeroNF}</strong>
                  <div style={{ color: "#8b949e", fontSize: "0.875rem", marginTop: 4 }}>
                    Fornecedor: {dadosNf.fornecedor}
                  </div>
                  <div style={{ color: "#8b949e", fontSize: "0.875rem" }}>
                    {dadosNf.dataEmissao ? new Date(dadosNf.dataEmissao).toLocaleDateString("pt-BR") : "—"}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto", marginTop: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#e6edf3" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: "left" }}>Produto</th>
                      <th style={{ ...thStyle, width: 80 }}>Un.</th>
                      <th style={{ ...thStyle, width: 100 }}>Qtd</th>
                      <th style={{ ...thStyle, width: 120 }}>Preço un.</th>
                      <th style={{ ...thStyle, width: 100 }}>Bonif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosNf.itens.map((item, i) => (
                      <tr key={i} style={{ borderBottom: BORDER }}>
                        <td style={{ padding: "10px 12px" }}>{item.nome}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>{item.unidade || "un"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.quantidade}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          R$ {Number(item.precoUnitario || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontSize: "0.875rem" }}>
                            <input
                              type="checkbox"
                              checked={!!item.bonificacao}
                              onChange={(e) => {
                                const novos = [...dadosNf.itens];
                                novos[i] = { ...novos[i], bonificacao: e.target.checked };
                                setDadosNf({ ...dadosNf, itens: novos });
                              }}
                              title="Produto dado como bonificação pelo fornecedor"
                            />
                            {item.bonificacao ? "Sim" : "Não"}
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={botoesAcao}>
                <button type="button" onClick={limpar} style={btnLimpar}>
                  Trocar arquivo
                </button>
                <button
                  type="button"
                  onClick={confirmarEntrada}
                  style={btnConfirmar}
                  disabled={processando}
                >
                  {processando ? "Registrando..." : "Registrar entrada no estoque"}
                </button>
              </div>
            </div>
          )}

          <p style={{ color: "#8b949e", fontSize: "0.8125rem", marginTop: 24 }}>
            <strong>Dica:</strong> Para baixar o XML da NFe, acesse o portal da NF-e (nf-e.fazenda.gov.br) ou use o arquivo enviado pelo fornecedor. 
            Com o <button type="button" onClick={() => navigate("/comprador/certificado-digital")} style={{ background: "none", border: "none", color: "#00F2FF", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}>certificado digital configurado</button>, você poderá consultar e baixar XMLs diretamente da SEFAZ.
          </p>
        </div>
      </main>
    </div>
  );
}

const boxUpload = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  padding: 24,
  background: "rgba(0,0,0,0.2)",
  borderRadius: 8,
  border: `2px dashed ${BORDER}`,
};

const btnUpload = {
  padding: "12px 24px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "1rem",
};

const msgErro = {
  marginTop: 16,
  padding: 16,
  background: "rgba(248,81,73,0.15)",
  border: "1px solid rgba(248,81,73,0.4)",
  borderRadius: 6,
  color: "#f85149",
};

const boxPreview = {
  marginTop: 24,
  padding: 24,
  background: "rgba(0,0,0,0.2)",
  borderRadius: 8,
  border: BORDER,
};

const headerPreview = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const thStyle = {
  padding: "10px 12px",
  borderBottom: BORDER,
  color: "#8b949e",
  fontWeight: 600,
  fontSize: "0.875rem",
};

const botoesAcao = {
  display: "flex",
  gap: 16,
  marginTop: 24,
  paddingTop: 20,
  borderTop: BORDER,
};

const btnLimpar = {
  padding: "12px 20px",
  borderRadius: 6,
  border: BORDER,
  background: "transparent",
  color: "#8b949e",
  fontWeight: 600,
  cursor: "pointer",
};

const btnConfirmar = {
  padding: "12px 24px",
  borderRadius: 6,
  border: "none",
  background: "var(--gradient-btn-primary)",
  color: "#0B1C26",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "1rem",
};
