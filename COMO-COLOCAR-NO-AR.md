# Como colocar o RP Vista Pro no ar

Seu app tem **três partes**: banco (MongoDB), backend (Node/Express) e frontend (React). Todas precisam estar na nuvem e configuradas para conversarem entre si.

---

## Visão geral

| Parte      | Onde você usa hoje | Onde colocar na nuvem   |
|-----------|--------------------|-------------------------|
| Banco     | MongoDB local/Atlas| **MongoDB Atlas**       |
| Backend   | `localhost:4001`   | **Render**              |
| Frontend  | `localhost:3000`   | **AWS** (S3/Elastic Beanstalk) ou Vercel |

Seu setup: **MongoDB Atlas + Render (backend) + AWS (frontend)**.

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

## 3. Frontend no ar (AWS)

O frontend React precisa ser **construído** com a URL do backend (Render). Senão, ele continua chamando `localhost` e não funciona na nuvem.

### 3.1 Build do frontend apontando para o Render

Na pasta do projeto, **antes de subir para a AWS**, rode o build com a variável da API:

```bash
cd /Users/priscillaantonioligarcia/Desktop/Projetos/RPVistaPro/cpro
REACT_APP_API_URL=https://rpvistapro.onrender.com npm run build
```

Isso gera a pasta `build/` com os arquivos estáticos já configurados para usar o backend no Render.  
**Use sempre essa URL** (a do seu serviço no Render). Sem barra no final.

### 3.2 Enviar o build para a AWS

- Se você usa **S3**: faça upload do **conteúdo** da pasta `build/` (todos os arquivos e pastas de dentro) para o bucket configurado para hospedar o site (ex.: o bucket do Elastic Beanstalk ou um bucket estático).
- Se você usa **Elastic Beanstalk**: envie a aplicação conforme o fluxo que você já usa (por exemplo, um zip com o conteúdo de `build/` ou o deploy via EB CLI).

Sempre que mudar o código do frontend ou a URL do backend, rode de novo o comando acima e suba de novo o conteúdo para a AWS.

### 3.3 (Opcional) Frontend na Vercel

Se preferir usar Vercel no lugar da AWS:

1. **Add New** → **Project** e importe o repositório do GitHub.
2. **Root Directory:** `cpro`.
3. **Environment Variables:** `REACT_APP_API_URL` = `https://rpvistapro.onrender.com` (sem barra no final).
4. Deploy. A Vercel usa essa variável no build automaticamente.

---

## 4. Conferir se está tudo certo

- **Backend (Render):** `https://rpvistapro.onrender.com` — deve responder (ex.: "API funcionando" ou JSON).
- **Frontend (AWS):** abra a URL do seu app na AWS (S3/Elastic Beanstalk).
- Faça login ou cadastro.  
  Se o login/cadastro funcionar, o front está falando com o Render e o Render com o MongoDB Atlas.

Se der erro de rede ou “não conecta”:
- O build do frontend foi feito com `REACT_APP_API_URL=https://rpvistapro.onrender.com`? Se usou `localhost`, refaça o build com a URL do Render e suba de novo para a AWS.
- No Render, veja **Logs** para erros de MongoDB (`MONGODB_URI`, IP bloqueado no Atlas).

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

1. **MongoDB Atlas:** cluster, usuário, Network Access (0.0.0.0/0), connection string no Render.
2. **Render (backend):** Web Service em `backend-rpvistapro`, variáveis `MONGODB_URI` e `PORT`. URL: `https://rpvistapro.onrender.com`.
3. **AWS (frontend):** na pasta `cpro`, rodar `REACT_APP_API_URL=https://rpvistapro.onrender.com npm run build` e enviar o conteúdo de `build/` para S3/Elastic Beanstalk.
4. Acessar o app pela URL do frontend na AWS.

---

## 7. Observações importantes

- **Render (free):** o serviço “dorme” após um tempo sem acesso. A primeira requisição pode demorar alguns segundos; depois fica rápido.
- **Senhas e .env:** nunca commite o arquivo `.env` no Git. Use sempre as variáveis de ambiente no painel do Render e da Vercel.
- **CORS:** o backend usa `cors({ origin: "*" })`, então a API aceita requisições do domínio da AWS (e de qualquer origem) sem mudança extra.

Se quiser, na próxima mensagem diga em qual etapa está (Atlas, Render ou AWS) e eu te guio passo a passo.
