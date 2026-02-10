# Como colocar o RP Vista Pro no ar

Seu app tem **três partes**: banco (MongoDB), backend (Node/Express) e frontend (React). Todas precisam estar na nuvem e configuradas para conversarem entre si.

---

## Visão geral

| Parte      | Onde você usa hoje | Onde colocar na nuvem   |
|-----------|--------------------|-------------------------|
| Banco     | MongoDB local/Atlas| **MongoDB Atlas**       |
| Backend   | `localhost:4001`   | **Render** ou Railway  |
| Frontend  | `localhost:3000`   | **Vercel** ou Netlify  |

Recomendação para começar: **MongoDB Atlas + Render (backend) + Vercel (frontend)**. Todos têm plano gratuito.

---

## 1. Banco de dados: MongoDB Atlas

**Não sabe criar o cluster?** Siga o guia detalhado: **[CRIAR-CLUSTER-MONGODB-ATLAS.md](./CRIAR-CLUSTER-MONGODB-ATLAS.md)**

Se ainda não usa Atlas:

1. Acesse [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) e crie uma conta.
2. Crie um **Cluster** (M0 Sandbox é gratuito).
3. Em **Database Access** → Add New Database User: crie usuário e senha (guarde a senha).
4. Em **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`) para o servidor na nuvem poder acessar.
5. No cluster, clique em **Connect** → **Connect your application** → copie a **connection string**.  
   Ela será algo como:  
   `mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/meubanco?retryWrites=true&w=majority`  
   Troque `USUARIO` e `SENHA` pelos dados do usuário que você criou.

Você vai usar essa URL no backend (Render).

---

## 2. Backend no ar (Render)

1. Crie uma conta em [render.com](https://render.com).
2. **New** → **Web Service**.
3. Conecte o repositório **GitHub** onde está o projeto (se ainda não subiu, veja “Preparar repositório” mais abaixo).
4. Configure o serviço:
   - **Root Directory:** `backend-rpvistapro`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Em **Environment** (variáveis de ambiente), adicione:
   - **MONGODB_URI** = sua connection string do MongoDB Atlas (a URL completa).
   - **PORT** = `4001` (ou deixe em branco; o Render define a porta automaticamente).
6. Salve e faça o **Deploy**.  
   Quando terminar, o Render mostra uma URL, por exemplo:  
   `https://backend-rpvistapro-xxxx.onrender.com`  
   **Guarde essa URL** — ela é a “API” do seu app.

Teste no navegador:  
`https://SUA-URL-AQUI/`  
Deve retornar algo como: `{ "status": "API funcionando 🚀" }`.

---

## 3. Frontend no ar (Vercel)

1. Crie uma conta em [vercel.com](https://vercel.com).
2. **Add New** → **Project** e importe o mesmo repositório do GitHub.
3. Configure:
   - **Root Directory:** `cpro` (pasta do React).
   - **Framework Preset:** Create React App (ou Vercel detecta sozinho).
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
4. Em **Environment Variables**, adicione:
   - **Name:** `REACT_APP_API_URL`  
   - **Value:** a URL do backend no Render (ex.: `https://backend-rpvistapro-xxxx.onrender.com`)  
   **Sem barra no final.**
5. Faça **Deploy**.  
   A Vercel vai gerar uma URL do tipo:  
   `https://cpro-xxxx.vercel.app`  
   Essa é a URL do seu app para os usuários.

Depois do primeiro deploy, qualquer push no repositório pode gerar um novo deploy automático (se você ativou essa opção).

---

## 4. Conferir se está tudo certo

- **Frontend (Vercel):** abra a URL do projeto (ex.: `https://cpro-xxxx.vercel.app`).
- Faça login ou cadastro.  
  Se o login/cadastro funcionar, o frontend está falando com o backend e o backend com o MongoDB Atlas.

Se der erro de rede ou “não conecta”:
- Confirme que `REACT_APP_API_URL` na Vercel é exatamente a URL do backend (Render), sem barra no final.
- No Render, veja os **Logs** do serviço para erros de conexão com o MongoDB (por exemplo `MONGODB_URI` errada ou IP bloqueado no Atlas).

---

## 5. Preparar repositório (se ainda não subiu no GitHub)

No terminal, na pasta do projeto (onde está `cpro` e `backend-rpvistapro`):

```bash
cd /Users/priscillaantonioligarcia/Desktop/Projetos/RPVistaPro
git init
git add .
git commit -m "App RP Vista Pro"
```

Crie um repositório novo no GitHub (sem README, sem .gitignore extra). Depois:

```bash
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git branch -M main
git push -u origin main
```

Subir **só** a pasta do backend ou só do frontend também é possível, mas aí você criaria dois repositórios (um para backend, outro para frontend) e configuraria cada um no Render e na Vercel com o **Root Directory** certo.

---

## 6. Resumo rápido

1. **MongoDB Atlas:** criar cluster, usuário, liberar IP e copiar a connection string.
2. **Render:** novo Web Service apontando para a pasta `backend-rpvistapro`, variáveis `MONGODB_URI` e `PORT`, e pegar a URL do backend.
3. **Vercel:** novo Project apontando para a pasta `cpro`, variável `REACT_APP_API_URL` = URL do Render, e fazer deploy.
4. Acessar o app pela URL que a Vercel mostrar.

---

## 7. Observações importantes

- **Render (free):** o serviço “dorme” após um tempo sem acesso. A primeira requisição pode demorar alguns segundos; depois fica rápido.
- **Senhas e .env:** nunca commite o arquivo `.env` no Git. Use sempre as variáveis de ambiente no painel do Render e da Vercel.
- **CORS:** seu backend já usa `cors({ origin: "*" })`, então a API aceita requisições do domínio da Vercel sem mudança extra.

Se quiser, na próxima mensagem você pode dizer em qual etapa está (Atlas, Render ou Vercel) e eu te guio passo a passo nela.
