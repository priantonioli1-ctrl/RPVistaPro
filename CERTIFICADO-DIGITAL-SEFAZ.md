# Integração com Certificado Digital e SEFAZ

Este documento descreve o que foi implementado e o que será necessário para integrar o sistema com o certificado digital da empresa para consulta e download de NF-e na SEFAZ.

---

## O que já está implementado

### 1. Entrada de mercadorias por Nota Fiscal (XML)

- **Página:** `/entrada-por-nota-fiscal` (menu Estoque)
- **Funcionamento:** O usuário seleciona o arquivo XML da NFe (modelo 55) baixado do e-mail, portal da NF-e ou recebido do fornecedor. O sistema parseia o XML, extrai os itens (produto, quantidade, unidade, preço) e permite registrar a entrada no estoque em lote.

### 2. Configuração do certificado digital

- **Página:** `/comprador/certificado-digital` (menu Administrativo)
- **Funcionamento:** Permite enviar o arquivo do certificado A1 (.pfx ou .p12) e a senha. O certificado fica armazenado no backend para uso futuro em integrações com a SEFAZ.

---

## O que você precisa fazer para configurar o certificado

### Passo 1: Obter o certificado digital

1. **Adquira um certificado e-CNPJ ou e-NF-e A1** em uma Autoridade Certificadora (AC), por exemplo:
   - Serasa Experian
   - Certisign
   - Soluti
   - Valid
   - Outras ACs credenciadas

2. O certificado A1 é entregue como **arquivo .pfx** (ou .p12), com uma **senha** definida no momento da aquisição.

3. Guarde o arquivo e a senha em local seguro.

### Passo 2: Configurar no sistema

1. Acesse **Administrativo > Certificado digital**
2. Clique em **Configurar certificado**
3. Selecione o arquivo .pfx ou .p12
4. Informe a senha do certificado
5. (Opcional) Informe a data de validade para receber alertas antes do vencimento
6. Clique em **Salvar**

### Passo 3: Uso futuro (em desenvolvimento)

O certificado configurado será utilizado para:

- **Consulta NFe na SEFAZ** — buscar e baixar XMLs de NF-e autorizadas usando a chave de 44 dígitos
- **Manifestação do destinatário** — ciência da operação, confirmação, desconhecimento, etc.
- **Distribuição DFe** — consultar eventos e NF-e destinadas ao CNPJ

---

## O que será necessário para a integração completa com a SEFAZ

### Backend (Node.js)

1. **Biblioteca de comunicação com webservices SEFAZ**
   - Exemplos: `node-nf-e`, `soap` (para comunicação SOAP)
   - Cada estado tem um webservice próprio (MG, SP, RJ, etc.)

2. **Leitura do certificado .pfx**
   ```javascript
   // Exemplo com node-forge ou node-pkcs12
   const pfx = decrypt(certificadoBase64);
   const p12 = pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(pfx), senha);
   ```

3. **Chamadas HTTPS mutuamente autenticadas**
   - O certificado A1 é usado para autenticação mTLS (client certificate)
   - A SEFAZ valida que a requisição vem de um CNPJ autorizado

### Endpoints a implementar

| Endpoint | Função |
|----------|--------|
| `POST /api/nfe/consultar` | Consulta NF-e pela chave (44 dígitos) e retorna o XML |
| `POST /api/nfe/manifestar` | Manifesta o destinatário (ciência, confirmação, etc.) |
| `GET /api/nfe/distribuicao` | Consulta DFe ( documentos fiscais destinados ao CNPJ) |

### Considerações de segurança

- **Criptografia da senha:** Em produção, a senha do certificado deve ser criptografada (ex.: com `crypto` e chave de ambiente)
- **Armazenamento do .pfx:** O arquivo em base64 deve ficar em banco seguro ou em storage criptografado
- **Acesso restrito:** Apenas usuários autorizados devem poder configurar o certificado

### Variáveis de ambiente sugeridas

```
# Chave para criptografar a senha do certificado
CERTIFICADO_ENCRYPTION_KEY=...
```

---

## Fluxo de entrada por NF (atual)

1. Fornecedor emite a NFe e envia o XML por e-mail OU
2. Comprador acessa o portal da NF-e (nf-e.fazenda.gov.br) e baixa o XML OU
3. Comprador usa o XML recebido de outra forma
4. No sistema: **Estoque > Entrada por NF**
5. Seleciona o arquivo XML
6. Sistema exibe a prévia (fornecedor, nº NF, itens)
7. Clica em **Registrar entrada no estoque**
8. Estoque é atualizado automaticamente

---

## Referências

- [Portal Nacional da NF-e](http://www.nfe.fazenda.gov.br/)
- [Manual de Integração do Contribuinte (versão 2.0)](http://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Hm3dH%2fXurgM=)
- [Webservices por UF](http://www.nfe.fazenda.gov.br/portal/webServices.aspx)
