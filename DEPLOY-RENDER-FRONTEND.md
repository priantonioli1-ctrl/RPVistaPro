# Deploy com frontend no Render (resolve cache)

Agora o **frontend e o backend** sobem juntos no Render. Um único `git push` atualiza tudo, sem problema de cache.

---

## Configurar o Render

No [Dashboard do Render](https://dashboard.render.com) → seu serviço **RPVistaPro**:

### 1. Root Directory (Diretório raiz)
Mantenha: `backend-rpvistapro`

### 2. Build Command (Comando de construção)
Substitua por:
```
npm install && cd ../cpro && npm install && REACT_APP_API_URL=https://rpvistapro.onrender.com GENERATE_SOURCEMAP=false npm run build
```
Opcional: `GENERATE_SOURCEMAP=false` reduz avisos do face-api.js no build (source maps inexistentes).

### 3. Start Command (Comando de inicialização)
Mantenha: `npm start`

### 4. Variáveis de ambiente
- **MONGODB_URI** (obrigatório)
- **PORT** (opcional, o Render define)
- **REACT_APP_API_URL** = `https://rpvistapro.onrender.com` (opcional, já está no build command)

---

## Depois de configurar

1. **Envie as alterações para o GitHub** (obrigatório):
   ```bash
   cd /Users/priscillaantonioligarcia/Desktop/Projetos/RPVistaPro
   git add backend-rpvistapro/server.js
   git commit -m "Backend passa a servir o frontend React"
   git push origin main
   ```
2. No Render, faça **Implantação manual** (ou aguarde o deploy automático do push)
2. O build vai rodar o backend **e** o frontend
3. Acesse **https://rpvistapro.onrender.com** — o app inteiro (telas + API) estará lá

---

## Sobre o domínio rpvistapro.com.br

Se hoje o **rpvistapro.com.br** aponta para o S3, você pode:

1. **Mudar o DNS** para apontar ao Render (CNAME para o serviço do Render)
2. Ou continuar usando **rpvistapro.onrender.com** como URL principal

Assim que o DNS apontar para o Render, o cache do S3/CloudFront deixa de importar.
