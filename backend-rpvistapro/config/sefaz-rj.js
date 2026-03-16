/**
 * Configuração SEFAZ-RJ — NFC-e (modelo 65)
 * Conforme MOC 7.0 / Versão 4.00 e Notas Técnicas vigentes
 *
 * URLs oficiais: Portal Nacional da NFC-e (ENCAT) / SEFAZ-RJ
 * Comunicação: TLS 1.2 obrigatório
 */

export const SEFAZ_RJ = {
  /** Ambiente: 1 = Produção, 2 = Homologação */
  tpAmb: {
    producao: 1,
    homologacao: 2,
  },

  /** WebServices NFC-e — Autorização e Consulta */
  urls: {
    homologacao: {
      autorizacao: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NfeAutorizacao4.asmx",
      consulta: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
      inutilizacao: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeInutilizacao4/NfeInutilizacao4.asmx",
      status: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico4/NfeStatusServico4.asmx",
      /** URL base para QR Code 2.0 (consulta pública) */
      qrCode: "https://dfe-portal.svrs.rs.gov.br/NFCe/qrcode",
    },
    producao: {
      autorizacao: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NfeAutorizacao4.asmx",
      consulta: "https://nfce.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
      inutilizacao: "https://nfce.svrs.rs.gov.br/ws/NfeInutilizacao4/NfeInutilizacao4.asmx",
      status: "https://nfce.svrs.rs.gov.br/ws/NfeStatusServico4/NfeStatusServico4.asmx",
      /** SEFAZ-RJ — URL base QR Code 2.0 em produção */
      qrCode: "https://www4.fazenda.rj.gov.br/nfce/qrcode",
    },
  },

  /** Tipos de emissão */
  tpEmis: {
    normal: 1,
    contingenciaFS: 2,
    contingenciaSCAN: 3,
    contingenciaDPEC: 4,
    contingenciaFSDA: 5,
    contingenciaSVCAN: 6,
    contingenciaSVCRS: 7,
    contingenciaOffLine: 9,
  },

  /** Tipo de impressão DANFE */
  tpImp: {
    semDANFE: 0,
    DANFENormalRetrato: 1,
    DANFENormalPaisagem: 2,
    DANFESimplificado: 3,
    DANFENFCe: 4,
    DANFENFCeMsgEletronica: 5,
  },

  /** Identificação do destinatário (UF) — idDest */
  idDest: {
    operacaoInterna: 1, // Operação interna (dentro do RJ)
    interestadual: 2,
    exterior: 3,
  },

  /** Formas de pagamento — indPag */
  indPag: {
    vista: 0,
    prazo: 1,
    outros: 2,
  },

  /** Meios de pagamento — tPag */
  tPag: {
    dinheiro: "01",
    cheque: "02",
    cartaoCredito: "03",
    cartaoDebito: "04",
    creditoLoja: "05",
    valeRefeicao: "10",
    valeAlimentacao: "11",
    valePresente: "12",
    valeCombustivel: "13",
    duplicataMercantil: "14",
    boletoBancario: "15",
    depositoBancario: "16",
    pix: "17",
    transferenciaBancaria: "18",
    programaFidelidade: "19",
    semPagamento: "90",
    outros: "99",
  },

  /** Integração pagamento — tpIntegra (para cartão/PIX) */
  tpIntegra: {
    integrado: 1,
    naoIntegrado: 2,
  },
};

export function getUrls(ambiente = 2) {
  return ambiente === 1 ? SEFAZ_RJ.urls.producao : SEFAZ_RJ.urls.homologacao;
}
