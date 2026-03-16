// URL da API: prioriza config.js (runtime) para funcionar em www.rpvistapro.com.br
export const getApiUrl = () =>
  (typeof window !== "undefined" && window.__API_URL__) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4001";
