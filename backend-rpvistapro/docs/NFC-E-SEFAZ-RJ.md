# NFC-e (modelo 65) — SEFAZ-RJ / MOC 7.0 v4.00

Implementação da emissão de NFC-e conforme normas da SEFAZ-RJ e Manual de Orientação do Contribuinte (MOC) 7.0 / Versão 4.00.

## Estrutura implementada

### 1. Configuração (`config/sefaz-rj.js`)
- **URLs** Homologação e Produção para SVRS (RJ utiliza o ambiente nacional)
- **tpAmb**: 1=Produção, 2=Homologação
- **idDest**: 1=Operação Interna RJ
- **tpImp**: 4=DANFE NFC-e
- **tpEmis**: 9=Contingência Offline
- **tPag**: códigos para dinheiro, PIX, cartão crédito/débito, etc.
- **tpIntegra**: integrado/não integrado (pagamentos)

### 2. Modelo `ConfiguracaoNFCe`
- Dados do emitente: CNPJ, razão social, IE, CRT, endereço
- CSC (Código de Segurança do Contribuinte) e idCSC para QR Code 2.0
- Série, último número, ambiente

### 3. Gerador de XML (`services/nfce/geradorXmlNFCe.js`)
- `<infNFe>` com `mod=65`
- Grupo `<ide>`: tpAmb, idDest=1, tpImp=4, tpEmis (1 ou 9)
- Grupo `<det>` por item com impostos (ICMS SN 102, PIS/COFINS 49)
- Grupo `<detPag>` com tPag conforme forma de pagamento
- **QR Code 2.0**: parâmetro `p` com chNFe|nVersao|tpAmb|cDest|dhEmi|vNF|vICMS|digVal|cIdToken|csc

### 4. Assinatura digital (`services/nfce/assinaturaXml.js`)
- Extração de chave e certificado do .pfx (node-forge)
- Assinatura RSA-SHA1 no padrão SEFAZ (xml-crypto)

### 5. Emissor (`services/nfce/emissorNFCe.js`)
- Monta XML, assina, transmite ou gera em contingência
- **TLS 1.2** na comunicação com os WebServices
- Modo contingência (tpEmis=9): gera XML sem transmitir

## Campos obrigatórios SEFAZ-RJ — Checklist

| Grupo    | Campo          | Status   |
|----------|----------------|----------|
| ide      | cUF, cNF, mod, serie, nNF, dhEmi | ✅ |
| ide      | tpNF, idDest, cMunFG, tpImp      | ✅ |
| ide      | tpEmis, tpAmb, finNFe, indFinal  | ✅ |
| emit     | CNPJ, xNome, enderEmit, IE, CRT  | ✅ |
| dest     | CPF ou CNPJ (consolidado 00000000000) | ✅ |
| det      | prod (cProd, xProd, NCM, CFOP, qCom, vUnCom, vProd) | ✅ |
| det      | imposto (ICMS, PIS, COFINS)      | ✅ |
| total    | ICMSTot (vProd, vNF, etc.)       | ✅ |
| pag      | detPag (indPag, tPag, vPag)     | ✅ |

## Pagamentos Cartão/PIX — tpIntegra (Nota Técnica)

Para pagamentos em **Cartão** ou **PIX**, o grupo detPag pode exigir:
- `tpIntegra`: 1=Integrado (PDV/maquininha), 2=Não integrado
- `CNPJ`: CNPJ da credenciadora do cartão
- `tBand`: tipo de bandeira (Visa, Master, etc.)

**Implementação atual**: detPag básico (tPag, vPag). Para PDV integrado com maquininha, adicione os campos conforme a NT vigente.

## Cálculo de impostos

- **CSOSN 102**: Simples Nacional sem permissão de crédito (padrão quando CRT=1)
- **PIS/COFINS 49**: Outras operações (ajustar CST conforme atividade)
- **Difal**: não aplicável para operação interna (idDest=1)
- **Lei da Transparência (IBPT)**: campo vTotTrib preparado; preencher com valor da tabela IBPT quando disponível

## Certificado digital

1. Configure o certificado A1 (.pfx) em **Administrativo > Certificado digital**
2. O caminho do arquivo é definido no upload — o sistema armazena em base64
3. Em produção, considere criptografar a senha com `CERTIFICADO_ENCRYPTION_KEY`

## APIs

| Método | Rota                 | Descrição                          |
|--------|----------------------|------------------------------------|
| GET    | /api/nfce/config?empresa= | Buscar configuração NFC-e     |
| PUT    | /api/nfce/config     | Salvar configuração NFC-e          |
| POST   | /api/nfce/emitir     | Emitir NFC-e (body: empresa, venda, contingencia?) |

## Próximos passos

1. **Frontend**: Página de cadastro da Configuração NFC-e (CNPJ, IE, CSC, endereço)
2. **Integração PDV**: Ao finalizar venda, chamar POST /api/nfce/emitir se configurado
3. **SOAP**: Validar envelope de autorização com o WSDL real da SEFAZ
4. **QR Code**: Confirmar URL base da SEFAZ-RJ para produção
5. **Pagamentos**: Implementar tpIntegra, CNPJ credenciadora, tBand quando aplicável
