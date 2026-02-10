import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/layout.css";

const TITLES = {
  "/contagem-estoque": "Contagem de Estoque",
  "/cadastro-funcionarios": "Cadastro de Funcionários",
  "/painel-requisicoes": "Saída de Mercadorias",
  "/nova-cotacao": "Nova Cotação",
  "/catalogo-comprador": "Catálogo / Cotação",
  "/meus-pedidos": "Meus Pedidos",
  "/fornecedores": "Fornecedores",
  "/resumo-cotacao": "Resumo da Cotação",
  "/estoque": "Estoque",
  "/comprador/perfil-comprador": "Perfil",
  "/metricas": "Métricas",
  "/historico-compras": "Histórico de Compras",
  "/meu-catalogo": "Meu Catálogo",
  "/requisicao-estoque": "Requisição de Estoque",
  "/conferencia-pedido": "Conferência de Pedido",
  "/pedido-detalhado": "Detalhe do Pedido",
  "/fornecedor/pedidos": "Pedidos",
  "/historico-vendas": "Histórico de Vendas",
  "/fornecedor/perfil-fornecedor": "Perfil",
  "/catalogo-fornecedor": "Meu Catálogo",
  "/fornecedor/clientes": "Clientes",
};

// Ordem: ... Estoque, Contagem de Estoque (embaixo de Estoque), Requisições, ...
const NAV_COMPRADOR = [
  { path: "/meus-pedidos", label: "Meus Pedidos", icon: "📑" },
  { path: "/nova-cotacao", label: "Nova Cotação", icon: "🛒" },
  { path: "/meu-catalogo", label: "Meu Catálogo", icon: "📦" },
  { path: "/estoque", label: "Estoque", icon: "📊" },
  { path: "/contagem-estoque", label: "Contagem de Estoque", icon: "✅" },
  { path: "/painel-requisicoes", label: "Saída de Mercadorias", icon: "📤" },
  { path: "/historico-compras", label: "Histórico de Compras", icon: "📋" },
  { path: "/metricas", label: "Métricas", icon: "📈" },
  { path: "/fornecedores", label: "Fornecedores", icon: "🏢" },
  { path: "/cadastro-funcionarios", label: "Funcionários", icon: "👥" },
  { path: "/comprador/perfil-comprador", label: "Perfil", icon: "👤" },
];

const NAV_FORNECEDOR = [
  { path: "/fornecedor/pedidos", label: "Pedidos", icon: "📑" },
  { path: "/catalogo-fornecedor", label: "Meu Catálogo", icon: "📦" },
  { path: "/fornecedor/clientes", label: "Clientes", icon: "👥" },
  { path: "/historico-vendas", label: "Histórico de Vendas", icon: "📋" },
  { path: "/fornecedor/perfil-fornecedor", label: "Perfil", icon: "👤" },
];

/** Primeira letra de cada palavra em maiúscula (ex.: "maria silva" → "Maria Silva") */
function capitalizarNome(nome) {
  if (!nome || typeof nome !== "string") return nome || "";
  return nome
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function getTitle(pathname, usuario) {
  for (const [path, title] of Object.entries(TITLES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  if (pathname.startsWith("/conferencia-pedido")) return "Conferência de Pedido";
  if (pathname.startsWith("/pedido-detalhado")) return "Detalhe do Pedido";
  return "RPVistaPro";
}

function getRole(pathname) {
  const fornecedorPaths = [
    "/fornecedor/",
    "/catalogo-fornecedor",
    "/historico-vendas",
  ];
  if (fornecedorPaths.some((p) => pathname.startsWith(p))) return "fornecedor";
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
  if ((usuario.tipo || "").toLowerCase() === "fornecedor") return "fornecedor";
  return "comprador";
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const role = getRole(pathname);
  const navItems = role === "fornecedor" ? NAV_FORNECEDOR : NAV_COMPRADOR;

  // Inicializar com sessionStorage para não redirecionar logo após o login (condição de corrida)
  const [usuario, setUsuario] = useState(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
      return u && u._id ? u : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("usuario") || "{}");
    setUsuario(u && u._id ? u : null);
  }, [pathname]);

  useEffect(() => {
    if (!usuario?._id && pathname !== "/" && !pathname.startsWith("/cadastro") && !pathname.startsWith("/recuperar-senha")) {
      navigate("/", { replace: true });
    }
  }, [usuario, pathname, navigate]);

  function handleLogout() {
    sessionStorage.removeItem("usuario");
    sessionStorage.removeItem("token");
    navigate("/", { replace: true });
  }

  function isActive(path) {
    return pathname === path || pathname.startsWith(path + "/");
  }

  if (!usuario?._id) return null;

  const title = getTitle(pathname, usuario);

  return (
    <div className="layout-wrap">
      <aside className="layout-sidebar">
        <div className="layout-sidebar-logo">
          <img src={logo} alt="RPVistaPro" />
        </div>
        <nav className="layout-sidebar-nav">
          <div className="layout-nav-section">Menu</div>
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`layout-nav-item ${isActive(item.path) ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="layout-sidebar-footer">
          <button type="button" className="layout-nav-item" onClick={handleLogout}>
            <span style={{ fontSize: "1.1rem" }}>🚪</span>
            Sair
          </button>
        </div>
      </aside>
      <div className="layout-main">
        <header className="layout-header">
          <div className="layout-header-spacer" />
          <h1 className="layout-header-title">{title}</h1>
          <div className="layout-header-user">
            <strong>{capitalizarNome(usuario.nome || usuario.empresa || "Usuário")}</strong>
          </div>
        </header>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
