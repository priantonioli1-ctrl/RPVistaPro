# Como criar um cluster no MongoDB Atlas

Siga estes passos na ordem. O cluster é o “servidor” do seu banco de dados na nuvem.

---

## 1. Entrar no MongoDB Atlas

1. Abra o navegador e acesse: **https://cloud.mongodb.com**
2. Clique em **Try Free** (ou **Sign In** se já tiver conta).
3. Crie uma conta com e-mail e senha (ou use Google/GitHub se aparecer a opção).
4. Aceite os termos e confirme o e-mail se pedirem.

---

## 2. Criar a organização e o projeto (primeira vez)

Na primeira vez, o Atlas pergunta:

- **Organization name:** pode ser seu nome ou "RP Vista Pro". Clique **Next**.
- **Project name:** por exemplo "RP Vista Pro" ou "Meu Projeto". Clique **Next**.
- Não é obrigatório convidar ninguém; clique **Create Project**.

---

## 3. Criar o cluster

1. Na tela do projeto, você verá **Build a Database** ou **Create** (botão verde).
2. Clique em **Build a Database** (ou **Create Cluster**).

3. **Escolha o tipo:**
   - Deixe **M0 (FREE)** — Shared (grátis).
   - Não precisa mudar a região; pode deixar a sugerida (ex.: São Paulo ou Virginia).

4. **Nome do cluster:**
   - O nome padrão é algo como `Cluster0`. Pode deixar ou mudar para `rpvistapro`.

5. Clique em **Create** (ou **Create Cluster**) e espere 1–3 minutos. Quando aparecer um ícone verde ao lado do cluster, está pronto.

---

## 4. Criar usuário do banco (quem acessa os dados)

1. Deve aparecer um pop-up **Security Quickstart**.
   - Se não aparecer: no menu à esquerda, vá em **Database Access** → **Add New Database User**.

2. **Authentication Method:** deixe **Password**.

3. Crie o usuário:
   - **Username:** por exemplo `rpvista` (ou qualquer nome que você lembre).
   - **Password:** clique em **Autogenerate Secure Password** e **copie a senha** e guarde em um lugar seguro (você vai usar na connection string).  
   - Ou crie sua própria senha (mínimo 8 caracteres, com letras e números).

4. Em **Database User Privileges**, deixe **Read and write to any database**.

5. Clique **Add User**.

---

## 5. Liberar acesso pela internet (IP)

O Atlas pergunta de onde o banco pode ser acessado:

1. Deve aparecer **Where would you like to connect from?**
   - Clique em **Add My Current IP Address** (adiciona seu IP).
   - Para o backend na nuvem (Render) funcionar, clique também em **Allow Access from Anywhere**.
   - Isso adiciona o IP `0.0.0.0/0` (qualquer lugar). Para um projeto pequeno/médio é aceitável; depois você pode restringir se quiser.

2. Clique **Finish and Close**.

---

## 6. Pegar a connection string (URL do banco)

1. Volte para a tela do **projeto** (menu **Database** ou **Overview**).
2. No seu cluster, clique no botão **Connect**.
3. Escolha **Drivers** (ou **Connect your application**).
4. **Driver:** Node.js. **Version:** 5.5 or later (pode deixar o padrão).
5. Copie a **connection string** que aparece. Algo assim:

   ```
   mongodb+srv://rpvista:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Troque `<password>`** pela senha do usuário que você criou (a que você guardou).  
   Se a senha tiver caracteres especiais (ex.: `@`, `#`), troque cada um pelo código correspondente (ex.: `@` → `%40`).

7. **Adicione o nome do banco** na URL. Antes de `?` coloque `/meubanco`:  
   Fica assim (exemplo):

   ```
   mongodb+srv://rpvista:SUA_SENHA_AQUI@cluster0.xxxxx.mongodb.net/meubanco?retryWrites=true&w=majority
   ```

Essa linha é a sua **MONGODB_URI**. Você vai colar ela no **Render**, na variável **MONGODB_URI**.

---

## Resumo rápido

| Passo | O que fazer |
|-------|-------------|
| 1 | Criar conta em cloud.mongodb.com |
| 2 | Criar projeto (Organization + Project) |
| 3 | Build a Database → M0 FREE → Create Cluster |
| 4 | Database Access → criar usuário e senha (guardar a senha) |
| 5 | Network Access → Allow Access from Anywhere |
| 6 | Connect → Drivers → copiar connection string, trocar `<password>` e adicionar `/meubanco` |

Se em algum passo a tela for diferente (o Atlas muda o layout às vezes), diga qual tela você está vendo que eu adapto o texto.
