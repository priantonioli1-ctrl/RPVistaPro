/**
 * Gerador de XML NFC-e (modelo 65) — SEFAZ-RJ / MOC 7.0 v4.00
 *
 * Estrutura infNFe com mod=65, ide (tpAmb, idDest=1, tpImp=4),
 * detPag, impostos (ICMS, PIS, COFINS), QR Code 2.0, contingência.
 */
import { SEFAZ_RJ } from "../../config/sefaz-rj.js";

const NS = "http://www.portalfiscal.inf.br/nfe";

function escXml(v) {
  if (v == null || v === "") return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function digitoMod11(num) {
  let soma = 0;
  let peso = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    soma += parseInt(num[i], 10) * peso;
    peso = peso >= 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  if (resto === 0 || resto === 1) return 0;
  return 11 - resto;
}

/**
 * Gera a chave de acesso NFC-e (44 dígitos)
 * UF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + dv(1)
 */
export function gerarChaveAcesso(config, numero, cNF, tpEmis = 1) {
  const uf = "33"; // RJ
  const aamm = new Date().toISOString().slice(2, 7).replace("-", "");
  const cnpj = String(config.cnpj || "").replace(/\D/g, "").padStart(14, "0").slice(0, 14);
  const mod = "65";
  const serie = String(config.serie || 1).padStart(3, "0").slice(-3);
  const nNF = String(numero || 0).padStart(9, "0").slice(-9);
  const cnf = String(cNF || 0).padStart(8, "0").slice(-8);
  const dv = String(tpEmis).padStart(1, "0").slice(-1);

  const parte = uf + aamm + cnpj + mod + serie + nNF + cnf + dv;
  const digito = digitoMod11(parte);
  return parte + digito;
}

/**
 * Gera o parâmetro qrCode para URL SEFAZ-RJ (QR Code 2.0)
 * Conforme NT 2021.002 v1.20: chNFe|nVersao|tpAmb|cDest|dhEmi|vNF|vICMS|digVal|cIdToken|csc
 */
export function gerarParametroQRCode(chave, config, dados) {
  const nVersao = "2";
  const tpAmb = String(config.tpAmb || 2);
  const cDest = dados.cnpjDest || dados.cpfDest || "0";
  const dhEmi = (dados.dhEmi || new Date().toISOString()).replace(/[-:]/g, "").slice(0, 14);
  const vNF = (dados.total || 0).toFixed(2);
  const vICMS = (dados.vICMS || 0).toFixed(2);
  const digVal = dados.digVal || ""; // Hash do protocolo de autorização
  const cIdToken = String(config.idCsc || 1);
  const csc = config.csc || "";

  const concat = [chave, nVersao, tpAmb, cDest, dhEmi, vNF, vICMS, digVal, cIdToken, csc].join("|");
  return Buffer.from(concat, "utf-8").toString("base64");
}

/**
 * Mapeia forma de pagamento para tPag e indPag
 */
function mapearPagamento(formaPagamento) {
  const f = (formaPagamento || "Dinheiro").toLowerCase();
  if (f.includes("pix")) return { tPag: SEFAZ_RJ.tPag.pix, indPag: SEFAZ_RJ.indPag.vista };
  if (f.includes("cartão") && f.includes("crédito")) return { tPag: SEFAZ_RJ.tPag.cartaoCredito, indPag: SEFAZ_RJ.indPag.vista };
  if (f.includes("cartão") && f.includes("débito")) return { tPag: SEFAZ_RJ.tPag.cartaoDebito, indPag: SEFAZ_RJ.indPag.vista };
  if (f.includes("dinheiro")) return { tPag: SEFAZ_RJ.tPag.dinheiro, indPag: SEFAZ_RJ.indPag.vista };
  return { tPag: SEFAZ_RJ.tPag.outros, indPag: SEFAZ_RJ.indPag.vista };
}

/**
 * Monta o XML da NFC-e (infNFe)
 */
export function montarXmlNFCe(config, venda, certificado, modoContingencia = false) {
  const tpEmis = modoContingencia ? SEFAZ_RJ.tpEmis.contingenciaOffLine : 1;
  const numero = (config.ultimoNumero || 0) + 1;
  const cNF = Math.floor(Math.random() * 99999999)
    .toString()
    .padStart(8, "0");
  const chave = gerarChaveAcesso(config, numero, cNF, tpEmis);

  const dhEmi = new Date().toISOString();
  const dhEmiFmt = dhEmi.replace(/[-:]/g, "").replace("T", "").slice(0, 14);

  const total = Number(venda.total) || 0;
  const { tPag, indPag } = mapearPagamento(venda.formaPagamento);

  // CSOSN 102 - Simples Nacional sem permissão de crédito (ajustar conforme regime do emitente)
  const csosn = config.crt === 1 ? "102" : "00";
  const cst = config.crt === 1 ? "" : "00";

  const vTotTrib = 0; // Lei da Transparência — calcular com tabela IBPT se houver

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="${NS}">
  <infNFe Id="NFe${chave}" versao="4.00">
    <ide>
      <cUF>33</cUF>
      <cNF>${escXml(cNF)}</cNF>
      <natOp>${escXml("Venda de mercadoria")}</natOp>
      <mod>65</mod>
      <series>${String(config.serie || 1).padStart(3, "0")}</series>
      <nNF>${String(numero).padStart(9, "0")}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${escXml(config.endereco?.cMun || "3304557")}</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>${tpEmis}</tpEmis>
      <cDv>${chave.slice(-1)}</cDv>
      <tpAmb>${config.tpAmb || 2}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>1.0.0</verProc>
    </ide>
    <emit>
      <CNPJ>${escXml(String(config.cnpj || "").replace(/\D/g, ""))}</CNPJ>
      <xNome>${escXml(config.razaoSocial || config.nomeFantasia || "")}</xNome>
      <xFant>${escXml(config.nomeFantasia || "")}</xFant>
      <enderEmit>
        <xLgr>${escXml(config.endereco?.xLgr || "")}</xLgr>
        <nro>${escXml(config.endereco?.nro || "")}</nro>
        <xBairro>${escXml(config.endereco?.xBairro || "")}</xBairro>
        <cMun>${escXml(config.endereco?.cMun || "3304557")}</cMun>
        <xMun>${escXml(config.endereco?.xMun || "")}</xMun>
        <UF>${escXml(config.endereco?.uf || "RJ")}</UF>
        <CEP>${escXml(String(config.endereco?.cep || "").replace(/\D/g, "").slice(0, 8))}</CEP>
      </enderEmit>
      <IE>${escXml(config.inscricaoEstadual || "")}</IE>
      <CRT>${config.crt || 1}</CRT>
    </emit>
    <dest>
      <CPF>00000000000</CPF>
      <xNome>CONSUMIDOR</xNome>
    </dest>
`;

  // Itens (det)
  (venda.itens || []).forEach((item, idx) => {
    const qtd = Number(item.quantidade) || 1;
    const preco = Number(item.precoUnitario) || 0;
    const vProd = qtd * preco;
    const vDesc = 0;
    const vItem = vProd - vDesc;

    xml += `    <det nItem="${idx + 1}">
      <prod>
        <cProd>${escXml(String(idx + 1).padStart(3, "0"))}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${escXml(String(item.nome || "").slice(0, 120))}</xProd>
        <NCM>00000000</NCM>
        <CFOP>5102</CFOP>
        <uCom>${escXml(item.unidade || "UN")}</uCom>
        <qCom>${qtd.toFixed(4)}</qCom>
        <vUnCom>${preco.toFixed(4)}</vUnCom>
        <vProd>${vProd.toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${escXml(item.unidade || "UN")}</uTrib>
        <qTrib>${qtd.toFixed(4)}</qTrib>
        <vUnTrib>${preco.toFixed(4)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>${vTotTrib.toFixed(2)}</vTotTrib>
        <ICMS>
          <ICMSSN102>
            <orig>0</orig>
            <CSOSN>${csosn}</CSOSN>
          </ICMSSN102>
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>49</CST>
            <vBC>0.00</vBC>
            <pPIS>0.00</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>49</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.00</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>
    </det>
`;
  });

  // Total
  const vICMS = 0;
  xml += `    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>${vICMS.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${total.toFixed(2)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${(Number(venda.desconto) || 0).toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${total.toFixed(2)}</vNF>
        <vTotTrib>${vTotTrib.toFixed(2)}</vTotTrib>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>
      <detPag>
        <indPag>${indPag}</indPag>
        <tPag>${tPag}</tPag>
        <vPag>${total.toFixed(2)}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>${escXml(venda.observacoes || "")}</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;

  const qrParam = gerarParametroQRCode(chave, config, {
    total,
    vICMS,
    dhEmi: dhEmiFmt,
  });

  return {
    xml,
    chave,
    numero,
    cNF,
    dhEmi,
    qrParam,
    tpEmis,
  };
}
