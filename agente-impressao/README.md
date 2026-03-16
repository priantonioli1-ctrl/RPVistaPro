# Agente de Impressão — Cupom Fiscal

Serviço local que recebe os dados da venda do PDV e envia para a impressora.

## Como usar

1. Instale as dependências:
   ```bash
   cd agente-impressao
   npm install
   ```

2. Inicie o agente:
   ```bash
   npm start
   ```

3. No sistema RP Vista Pro, acesse **Frente de Loja → Impressora Fiscal** e configure:
   - Ativar impressão: sim
   - URL do agente: `http://localhost:9999`

4. Ao finalizar uma venda no PDV, os dados serão enviados ao agente e o cupom será exibido no console (ou impresso, se configurado).

## Integração com impressora real

Por padrão, o agente apenas exibe o cupom no console. Para imprimir em equipamento físico:

### Impressora térmica (não fiscal)
Instale `node-thermal-printer` e adicione no `server.js` a chamada ao driver. Exemplo com Epson:
```bash
npm install node-thermal-printer
```

### Impressora fiscal ECF (Daruma, Bematech)
É necessário usar a SDK do fabricante:
- **Daruma**: DarumaFramework (DLL Windows / SO Linux)
- **Bematech**: SDK Bematech

Consulte a documentação do fabricante para integrar ao agente.

### NFC-e (Nota Fiscal de Consumidor Eletrônica)
Para emissão via SEFAZ, utilize um provedor de API (TecnoSpeed, etc.) ou implemente a integração conforme a legislação vigente.
