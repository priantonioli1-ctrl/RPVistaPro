/**
 * Emissor NFC-e — SEFAZ-RJ / MOC 7.0 v4.00
 *
 * Coordena: geração do XML, assinatura digital, transmissão (ou contingência).
 * TLS 1.2 obrigatório na comunicação com os WebServices.
 */
import axios from "axios";
import https from "https";
import { montarXmlNFCe } from "./geradorXmlNFCe.js";
import { extrairDoPfx, assinarXmlNFCe } from "./assinaturaXml.js";
import { getUrls } from "../../config/sefaz-rj.js";
import ConfiguracaoNFCe from "../../models/ConfiguracaoNFCe.js";
import CertificadoEmpresa from "../../models/CertificadoEmpresa.js";

// TLS 1.2 mínimo
const httpsAgent = new https.Agent({
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",
  rejectUnauthorized: true,
});

/**
 * Emite NFC-e (transmitindo à SEFAZ ou em contingência)
 * @param {Object} config - ConfiguracaoNFCe (empresa)
 * @param {Object} venda - Dados da venda { itens, total, formaPagamento, desconto, observacoes }
 * @param {string} empresaId - ID da empresa (para buscar certificado)
 * @param {boolean} contingencia - Se true, gera XML sem transmitir (tpEmis=9)
 * @returns {Promise<{ sucesso: boolean, chave?: string, xml?: string, protocolo?: string, qrCode?: string, erro?: string }>}
 */
export async function emitirNFCe(config, venda, empresaId, contingencia = false) {
  try {
    // Buscar certificado
    const certDoc = await CertificadoEmpresa.findOne({
      empresa: empresaId,
    }).lean();

    if (!certDoc?.certificadoBase64) {
      return { sucesso: false, erro: "Certificado digital não configurado. Configure em Certificado Digital." };
    }

    const { privateKeyPem, certPem } = extrairDoPfx(
      certDoc.certificadoBase64,
      certDoc.senhaCriptografada || ""
    );

    const { xml: xmlInfNFe, chave, numero, qrParam } = montarXmlNFCe(config, venda, certDoc, contingencia);

    const xmlAssinado = assinarXmlNFCe(xmlInfNFe, privateKeyPem, certPem);

    const urls = getUrls(config.tpAmb || 2);

    if (contingencia) {
      // Modo contingência: não transmite, retorna XML para armazenamento
      const qrCodeUrl = `${urls.qrCode}?p=${qrParam}`;
      return {
        sucesso: true,
        contingencia: true,
        chave,
        numero,
        xml: xmlAssinado,
        qrCode: qrCodeUrl,
        mensagem: "NFC-e gerada em contingência. Transmita posteriormente quando a SEFAZ estiver disponível.",
      };
    }

    // Transmitir à SEFAZ
    const nfeDados = Buffer.from(xmlAssinado, "utf-8").toString("base64");
    const corpoAutorizacao = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao4">
  <soap:Body>
    <nfe:nfeDados>
      ${nfeDados}
    </nfe:nfeDados>
  </soap:Body>
</soap:Envelope>`;

    const res = await axios.post(urls.autorizacao, corpoAutorizacao, {
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: "http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao4/nfeAutorizacaoLote",
      },
      httpsAgent,
      timeout: 30000,
    });

    const resData = res.data || "";
    // Parse básico da resposta SOAP (em produção, use xml2js ou similar)
    const hasErro = /<cStat>(\d+)<\/cStat>/.exec(resData);
    const hasProtocolo = /<nProt>([^<]+)<\/nProt>/.exec(resData);
    const hasChave = /<chNFe>([^<]+)<\/chNFe>/.exec(resData);

    if (hasErro) {
      const cStat = hasErro[1];
      const xMotivo = /<xMotivo>([^<]*)<\/xMotivo>/.exec(resData)?.[1] || "Erro desconhecido";
      if (cStat !== "100" && cStat !== "101") {
        return { sucesso: false, erro: `SEFAZ: ${xMotivo} (cStat: ${cStat})` };
      }
    }

    const protocolo = hasProtocolo?.[1] || "";
    const chaveRet = hasChave?.[1] || chave;
    const qrCodeUrl = `${urls.qrCode}?p=${qrParam}`;

    // Atualizar último número
    await ConfiguracaoNFCe.findOneAndUpdate(
      { empresa: empresaId },
      { $inc: { ultimoNumero: 1 } }
    );

    return {
      sucesso: true,
      chave: chaveRet,
      protocolo,
      numero,
      xml: xmlAssinado,
      qrCode: qrCodeUrl,
    };
  } catch (err) {
    console.error("Erro ao emitir NFC-e:", err);
    return {
      sucesso: false,
      erro: err.message || "Erro ao emitir NFC-e.",
    };
  }
}
