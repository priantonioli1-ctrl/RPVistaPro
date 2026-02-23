# Como rodar o backend localmente

## 1. Sempre na pasta do backend

Abra o terminal e entre na pasta do backend **antes** de qualquer comando:

```bash
cd /Users/priscillaantonioligarcia/Desktop/Projetos/RPVistaPro/backend-rpvistapro
```

Confirme que está na pasta certa (deve aparecer no prompt ou rode `pwd` e veja se termina em `backend-rpvistapro`).

## 2. Instalar dependências

Se ainda não instalou ou depois de clonar/puxar código:

```bash
npm install
```

## 3. Conferir o `.env`

O arquivo `.env` deve estar na pasta `backend-rpvistapro` (não na pasta `RPVistaPro`).

- **MongoDB Atlas:** a variável `MONGODB_URI` deve estar completa, por exemplo:
  `MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster0.0v8btnc.mongodb.net/meubanco?retryWrites=true&w=majority`
- Usuário e senha devem ser os do Atlas (sem espaços; se a senha tiver caracteres especiais, pode ser preciso codificar).
- Se o erro for "module not found", normalmente é porque o comando foi rodado **fora** da pasta `backend-rpvistapro` ou falta rodar `npm install` nela.

## 4. Subir o servidor

Ainda na pasta `backend-rpvistapro`:

```bash
npm start
```

Ou:

```bash
node server.js
```

Deixe esse terminal aberto. O backend estará em `http://localhost:4001`.

## Se aparecer "ERR_MODULE_NOT_FOUND"

- Rode os comandos **sempre** de dentro de `backend-rpvistapro`.
- Rode `npm install` de novo nessa pasta.
- Copie a mensagem **completa** do erro (a linha que diz qual módulo não foi encontrado) e use para corrigir (dependência faltando ou caminho errado).

## Se aparecer erro de conexão com MongoDB

- Confira usuário e senha do Atlas no `.env`.
- No Atlas (MongoDB Cloud), verifique se o IP do seu computador está liberado em "Network Access" (ou use "Allow access from anywhere" para teste).
- Teste a connection string no próprio Atlas (Connect → Connect your application) e use a mesma no `.env`.
