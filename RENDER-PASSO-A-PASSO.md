# O que fazer quando o deploy no Render falha

## 1. Enviar as correções para o GitHub

Abra o **Terminal** (no Cursor: Terminal → New Terminal) e rode **um comando por vez**:

```bash
cd /Users/priscillaantonioligarcia/Desktop/Projetos/RPVistaPro
```

```bash
git add backend-rpvistapro/routes/itens-cotacao.js backend-rpvistapro/server.js
```

```bash
git commit -m "fix: Item-cotacao.js e porta 0.0.0.0 para Render"
```

```bash
git push origin main
```

Se pedir usuário/senha do GitHub, use seu **token** (não a senha da conta) como senha.

---

## 2. No Render

- O Render deve **iniciar um novo deploy sozinho** depois do push.
- Se não iniciar: no dashboard do serviço **RPVistaPro**, clique em **"Implantação manual"** (ou "Manual Deploy").

---

## 3. Variável de ambiente obrigatória

No Render, em **Environment** (Variáveis de ambiente), precisa existir:

- **MONGODB_URI** = sua connection string do MongoDB Atlas (a URL completa que você colou nas Notas).

Sem essa variável o backend não sobe. Se ainda não adicionou, vá em **RPVistaPro** → **Environment** → **Add Environment Variable** → Nome: `MONGODB_URI`, Valor: a URL do Atlas.

---

## 4. Conferir se subiu

Quando o deploy ficar verde (Sucesso), abra no navegador:

**https://rpvistapro.onrender.com**

Deve aparecer algo como: `{"status":"API funcionando 🚀"}`.
