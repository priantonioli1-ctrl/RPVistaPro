# Como rodar e testar o RPVistaPro

## Pré-requisitos
- **Node.js** instalado (versão 18 ou superior). Teste no terminal: `node -v`
- **MongoDB** rodando (local ou URI do Atlas no `.env`)

---

## 1. Abrir o Terminal do sistema
Use o **Terminal** do macOS (Spotlight: Cmd+Espaço → digite "Terminal"), **não** o terminal integrado do Cursor para evitar bloqueios de rede.

---

## 2. Backend (API)

```bash
cd ~/Desktop/Projetos/RPVistaPro/backend-rpvistapro
```

**Instalar dependências (só na primeira vez):**
```bash
npm install
```

**Criar/editar o arquivo `.env`** na pasta `backend-rpvistapro` com uma linha:
```
MONGODB_URI=mongodb://localhost:27017
```
(Se usar MongoDB Atlas, use a connection string que eles fornecem.)

**Subir o servidor:**
```bash
npm start
```

Deve aparecer algo como: `✅ MongoDB conectado` e `🚀 Servidor rodando em: http://localhost:4001`.  
Deixe esse terminal aberto.

---

## 3. Frontend (React) – em outro terminal

Abra um **segundo** Terminal e rode:

```bash
cd ~/Desktop/Projetos/RPVistaPro/cpro
npm install
npm start
```

O navegador deve abrir em **http://localhost:3000**.  
Se pedir permissão para abrir a porta 3000, aceite.

---

## Se "npm start" não for reconhecido

- Verifique se o Node está instalado: `node -v` e `npm -v`
- Se não tiver, instale em: https://nodejs.org (versão LTS)
- Use o caminho completo da pasta, por exemplo:
  ```bash
  cd /Users/priscillaantonioligarcia/Desktop/Projetos/RPVistaPro/backend-rpvistapro
  npm start
  ```

---

## Testar o cadastro

1. Com backend e frontend rodando, acesse http://localhost:3000
2. Clique em algo como "Cadastro" ou "Criar conta"
3. Preencha: Nome, CNPJ (14 dígitos), e-mail, senha, tipo (Comprador ou Fornecedor)
4. Envie o formulário — deve redirecionar para o login em caso de sucesso

---

## Resumo

| O quê     | Pasta                    | Comando      |
|-----------|--------------------------|-------------|
| Backend   | `RPVistaPro/backend-rpvistapro` | `npm start` |
| Frontend  | `RPVistaPro/cpro`        | `npm start` |

Sempre rodar no **Terminal do macOS**, um terminal para o backend e outro para o frontend.
