/**
 * Parser de XML da NFe (Nota Fiscal Eletrônica) - modelo 55
 * Extrai emit (fornecedor), dest (comprador), numero, data e itens (det/prod)
 * Suporta namespace padrão e XML sem namespace
 */
const NS = "http://www.portalfiscal.inf.br/nfe";

function getText(el, tagName) {
  if (!el) return "";
  const child = el.getElementsByTagNameNS?.(NS, tagName)?.[0] ?? el.getElementsByTagName(tagName)?.[0];
  return child ? (child.textContent || "").trim() : "";
}

function getTextLocal(el, tagName) {
  if (!el) return "";
  const list = el.getElementsByTagName?.(tagName) ?? [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (!c.namespaceURI || c.namespaceURI === NS) return (c.textContent || "").trim();
  }
  const all = el.getElementsByTagName?.("*") ?? [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === tagName) return (all[i].textContent || "").trim();
  }
  return "";
}

export function parseNFeXml(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("XML inválido: " + (parseError.textContent || "erro de parsing"));
  }

  let infNFe = doc.getElementsByTagNameNS(NS, "infNFe")[0];
  if (!infNFe) {
    infNFe = doc.getElementsByTagName("infNFe")[0];
  }
  if (!infNFe) {
    throw new Error("Estrutura NFe não encontrada no XML.");
  }

  const ide = infNFe.getElementsByTagNameNS(NS, "ide")[0] || infNFe.getElementsByTagName("ide")[0];
  const emit = infNFe.getElementsByTagNameNS(NS, "emit")[0] || infNFe.getElementsByTagName("emit")[0];
  const dest = infNFe.getElementsByTagNameNS(NS, "dest")[0] || infNFe.getElementsByTagName("dest")[0];

  const nNF = getText(ide, "nNF") || getTextLocal(ide, "nNF");
  const dhEmi = getText(ide, "dhEmi") || getTextLocal(ide, "dhEmi");
  const chNFe = getText(ide, "cNF") || "";
  let dataEmissao = "";
  if (dhEmi) {
    try {
      dataEmissao = new Date(dhEmi).toISOString();
    } catch {
      dataEmissao = dhEmi;
    }
  }

  const emitRazao = getText(emit, "xNome") || getTextLocal(emit, "xNome");
  const emitCnpj = getText(emit, "CNPJ") || getTextLocal(emit, "CNPJ");
  const fornecedor = emitRazao || emitCnpj || "Emitente";

  const destRazao = getText(dest, "xNome") || getTextLocal(dest, "xNome");
  const destCnpj = getText(dest, "CNPJ") || getTextLocal(dest, "CNPJ");
  const comprador = destRazao || destCnpj || "Destinatário";

  const itens = [];
  const dets = infNFe.getElementsByTagNameNS(NS, "det");
  const detsLocal = infNFe.getElementsByTagName("det");
  const listaDet = dets.length > 0 ? dets : detsLocal;

  for (let i = 0; i < listaDet.length; i++) {
    const det = listaDet[i];
    const prod = det.getElementsByTagNameNS(NS, "prod")[0] || det.getElementsByTagName("prod")[0];
    if (!prod) continue;

    const xProd = getText(prod, "xProd") || getTextLocal(prod, "xProd");
    const qCom = getText(prod, "qCom") || getTextLocal(prod, "qCom");
    const uCom = getText(prod, "uCom") || getTextLocal(prod, "uCom") || "un";
    const vUnCom = getText(prod, "vUnCom") || getTextLocal(prod, "vUnCom") || "0";

    if (!xProd) continue;

    const qtd = parseFloat(String(qCom).replace(",", ".")) || 1;
    const precoUnit = parseFloat(String(vUnCom).replace(",", ".")) || 0;

    itens.push({
      nome: xProd.trim(),
      unidade: (uCom || "un").trim().toLowerCase() || "un",
      quantidade: qtd,
      precoUnitario: precoUnit,
      codigo: getText(prod, "cProd") || getTextLocal(prod, "cProd"),
    });
  }

  return {
    numeroNF: nNF || chNFe || "S/N",
    chaveAcesso: infNFe.getAttribute("Id") ? infNFe.getAttribute("Id").replace("NFe", "") : "",
    dataEmissao,
    fornecedor,
    comprador,
    emitCnpj,
    destCnpj,
    itens,
  };
}
