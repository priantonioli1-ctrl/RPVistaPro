# Erro: querySrv ENOTFOUND _mongodb._tcp.cluster0....mongodb.net

Esse erro significa que o backend não conseguiu **resolver o endereço do MongoDB Atlas** (nuvem). Causas comuns:

1. **Sem internet** ou rede bloqueando acesso ao Atlas  
2. **Connection string no `.env`** incorreta ou cluster Atlas pausado/removido  
3. **Firewall/VPN** bloqueando conexão com MongoDB Atlas  

---

## Solução rápida: usar MongoDB local

Para testar **sem depender da internet**:

### 1. Instalar MongoDB no Mac (Homebrew)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### 2. Ajustar o `.env`

Abra o arquivo `.env` na pasta `backend-rpvistapro` e use **apenas** esta linha (comente ou apague a linha do Atlas):

```
MONGODB_URI=mongodb://localhost:27017
```

### 3. Subir o backend de novo

```bash
npm start
```

Deve aparecer: `✅ MongoDB conectado com sucesso` e `🚀 Servidor rodando em: http://localhost:4001`.

---

## Se quiser continuar usando MongoDB Atlas

1. **Internet:** confira se está conectada.  
2. **Atlas:** acesse [cloud.mongodb.com](https://cloud.mongodb.com), confira se o cluster está ativo (não pausado).  
3. **Connection string:** em *Connect* > *Connect your application*, copie a URL. No `.env` deve ficar assim (troque `<password>` pela senha real):

   ```
   MONGODB_URI=mongodb+srv://usuario:<password>@cluster0.g0y0tyq.mongodb.net/meubanco?retryWrites=true&w=majority
   ```

   Em alguns provedores de internet ou redes corporativas, o DNS pode bloquear `mongodb.net`. Nesses casos, usar MongoDB local (passos acima) costuma resolver.

---

## Sobre o aviso do AWS SDK

A mensagem *"AWS SDK for JavaScript (v2) is in maintenance mode"* é só um **aviso**. O backend sobe normalmente. Ela aparece porque a rota de upload usa o AWS SDK v2; no futuro você pode migrar para a v3. Por enquanto pode ignorar.
