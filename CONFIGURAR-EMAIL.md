# 📧 Configuração de Email - Verificação e Notificações

Este guia explica como configurar o sistema de email para verificação de contas e notificações de pedidos.

## ✅ O que foi implementado

1. **Verificação de Email no Cadastro**
   - Ao cadastrar, o usuário recebe um email com link de verificação
   - O link expira em 24 horas
   - Email não verificado não bloqueia login, mas mostra aviso

2. **Notificações Automáticas**
   - **Fornecedor**: Recebe email quando um novo pedido é criado
   - **Comprador**: Recebe email quando o pedido é aprovado pelo fornecedor

3. **Página de Verificação**
   - Rota: `/verificar-email?token=...`
   - Permite reenviar email de verificação se necessário

## 🔧 Configuração no Backend (Render)

### Passo 1: Escolher um serviço de email

Você tem 3 opções principais:

#### Opção 1: Gmail (Desenvolvimento/Teste)
- **Vantagem**: Fácil de configurar
- **Desvantagem**: Limite de 500 emails/dia, não recomendado para produção

**Configuração:**
1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma "App Password": https://myaccount.google.com/apppasswords
3. Adicione no Render (Environment Variables):
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=seu-email@gmail.com
   EMAIL_PASSWORD=sua-app-password-gerada
   EMAIL_FROM=seu-email@gmail.com
   FRONTEND_URL=https://rpvistapro.com.br
   ```

#### Opção 2: SendGrid (Recomendado para Produção)
- **Vantagem**: 100 emails/dia grátis, fácil configuração
- **Desvantagem**: Requer cadastro

**Configuração:**
1. Crie conta em https://sendgrid.com
2. Crie uma API Key em Settings > API Keys
3. Adicione no Render:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.sua-api-key-aqui
   EMAIL_FROM=noreply@rpvistapro.com.br
   FRONTEND_URL=https://rpvistapro.com.br
   ```

#### Opção 3: AWS SES (Se já usa AWS)
- **Vantagem**: Integração com AWS, escalável
- **Desvantagem**: Requer configuração mais complexa

**Configuração:**
1. Configure AWS SES na região sa-east-1
2. Verifique seu domínio/email remetente
3. Crie credenciais SMTP no SES
4. Adicione no Render:
   ```
   SMTP_HOST=email-smtp.sa-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=seu-access-key-id
   SMTP_PASSWORD=sua-secret-access-key
   EMAIL_FROM=noreply@rpvistapro.com.br
   FRONTEND_URL=https://rpvistapro.com.br
   ```

### Passo 2: Instalar dependência no backend

O `nodemailer` já foi adicionado ao `package.json`. No Render, ele será instalado automaticamente quando você fizer deploy.

Se precisar instalar localmente:
```bash
cd backend-rpvistapro
npm install
```

### Passo 3: Adicionar variáveis de ambiente no Render

1. Acesse seu serviço no Render
2. Vá em **Environment**
3. Adicione as variáveis conforme a opção escolhida acima
4. **Importante**: Adicione `FRONTEND_URL=https://rpvistapro.com.br` para os links funcionarem

### Passo 4: Fazer deploy

Após adicionar as variáveis, o Render fará deploy automaticamente. Se não, clique em **Manual Deploy**.

## 🧪 Testar

1. **Teste de Cadastro:**
   - Cadastre um novo usuário com email real
   - Verifique a caixa de entrada (e spam)
   - Clique no link de verificação

2. **Teste de Notificações:**
   - Crie um pedido como comprador
   - Verifique se o fornecedor recebeu email
   - Aprove o pedido como fornecedor
   - Verifique se o comprador recebeu email

## 📝 Observações

- **Emails não verificados**: Usuários podem fazer login normalmente, mas recebem um aviso
- **Falha no envio**: Se o email falhar ao enviar, o sistema continua funcionando (não bloqueia cadastro/pedidos)
- **Links nos emails**: Usam a variável `FRONTEND_URL`, certifique-se de configurá-la corretamente

## 🔍 Troubleshooting

**Email não chega:**
- Verifique spam/lixo eletrônico
- Confirme que as variáveis de ambiente estão corretas no Render
- Verifique os logs do Render para erros de SMTP
- Para Gmail: certifique-se de usar "App Password", não a senha normal

**Link de verificação não funciona:**
- Confirme que `FRONTEND_URL` está configurado corretamente
- Verifique se o token não expirou (24 horas)
- Use o botão "Reenviar Email" na página de verificação

**Notificações não chegam:**
- Verifique se o email do usuário está verificado
- Confirme que o usuário tem email válido no sistema
- Verifique os logs do backend para erros
