/**
 * Assinatura digital XML — NFC-e/NFe
 * Extrai chave e certificado do .pfx (A1) e assina o XML conforme padrão SEFAZ
 * NFe usa RSA-SHA1 (exigência da SEFAZ)
 */
import forge from "node-forge";
import { SignedXml } from "xml-crypto";

/**
 * Extrai chave privada e certificado do arquivo .pfx (base64)
 * @param {string} pfxBase64 - Conteúdo do .pfx em base64
 * @param {string} senha - Senha do certificado
 * @returns {{ privateKeyPem: string, certPem: string }}
 */
export function extrairDoPfx(pfxBase64, senha) {
  const pfxDer = Buffer.from(pfxBase64, "base64");
  const pfxAsn1 = forge.asn1.fromDer(pfxDer.toString("binary"));
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, senha || "");

  const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
  const pkKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;

  if (!pkKey?.key) {
    throw new Error("Chave privada não encontrada no certificado. Verifique a senha.");
  }
  if (!cert) {
    throw new Error("Certificado não encontrado no arquivo .pfx.");
  }

  const privateKeyPem = forge.pki.privateKeyToPem(pkKey.key);
  const certPem = forge.pki.certificateToPem(cert);
  return { privateKeyPem, certPem };
}

/**
 * Assina o XML da NFC-e no padrão SEFAZ (enveloped signature, RSA-SHA1)
 * @param {string} xml - Conteúdo XML a ser assinado
 * @param {string} privateKeyPem - Chave privada em PEM
 * @param {string} certPem - Certificado em PEM
 * @returns {string} XML assinado
 */
export function assinarXmlNFCe(xml, privateKeyPem, certPem) {
  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certPem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });

  sig.addReference({
    xpath: "//*[local-name()='infNFe']",
    transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    uri: "",
    digestValue: "",
    isEmptyUri: false,
  });

  sig.computeSignature(xml, {
    prefix: "",
    location: { reference: "//*[local-name()='NFe']", action: "append" },
    existingPrefixes: { nfe: "http://www.portalfiscal.inf.br/nfe" },
  });

  return sig.signedXml;
}
