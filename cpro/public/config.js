// Configuração em tempo de execução - permite alterar a URL da API sem refazer o build
// Em localhost usa o backend local; em produção usa o Render (API está lá)
// Se rpvistapro.com.br apontar para S3, não há API — precisa chamar o Render
window.__API_URL__ =
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:4001"
    : "https://rpvistapro.onrender.com";
