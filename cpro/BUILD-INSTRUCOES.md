# Instruções para Build

Para fazer o build do frontend funcionar, você precisa:

1. **Instalar react-app-rewired** (se ainda não tiver):
   ```bash
   cd /Users/priscillaantonioligarcia/Desktop/Projetos/RPVistaPro/cpro
   npm install --save-dev react-app-rewired
   ```

2. **Rodar o build com a URL do backend**:
   ```bash
   REACT_APP_API_URL=https://rpvistapro.onrender.com npm run build
   ```

O arquivo `config-overrides.js` já foi criado para resolver o problema do módulo `fs` do face-api.js.
