import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/layout.css";

const TITLES = {
  "/contagem-estoque": "Contagem",
  "/cadastro-funcionarios": "Cadastro de Funcionários",
  "/relatorios-funcionarios": "Relatórios de Funcionários",
  "/folha-ponto": "Folha de Ponto",
  "/ficha-funcionario": "Ficha do Funcionário",
  "/ponto": "Registrador de Ponto",
  "/painel-requisicoes": "Saída de Mercadorias",
  "/produtos-venda": "Meus Produtos",
  "/fichas-tecnicas": "Fichas Técnicas",
  "/frente-de-loja": "Frente de Loja",
  "/cardapio-pdv": "Catálogo PDV",
  "/proposta": "Nova Proposta",
  "/nova-proposta": "Nova Proposta",
  "/propostas": "Propostas",
  "/produtos-orcamento": "Modelos",
  "/orcamentos/": "Orçamento",
  "/comandas": "Comandas",
  "/caixa": "Caixa",
  "/documentos-contabilidade": "Notas Fiscais",
  "/entrada-por-nota-fiscal": "Entrada por NF",
  "/comprador/certificado-digital": "Certificado Digital",
  "/impressora-fiscal": "Impressora Fiscal",
  "/configuracao-nfce": "Configuração NFC-e",
  "/nova-cotacao": "Nova Cotação",
  "/catalogo-comprador": "Catálogo / Cotação",
  "/meus-pedidos": "Meus Pedidos",
  "/fornecedores": "Fornecedores",
  "/resumo-cotacao": "Resumo da Cotação",
  "/estoque": "Controle de Estoque",
  "/comprador/perfil-comprador": "Perfil",
  "/metricas": "Métricas",
  "/estoque/metricas": "Métricas do Estoque",
  "/historico-compras": "Histórico de Compras",
  "/meu-catalogo": "Catálogo",
  "/requisicao-estoque": "Requisição de Estoque",
  "/conferencia-pedido": "Conferência de Pedido",
  "/pedido-detalhado": "Detalhe do Pedido",
  "/fornecedor/pedidos": "Pedidos",
  "/historico-vendas": "Histórico de Vendas",
  "/fornecedor/perfil-fornecedor": "Perfil",
  "/fornecedor/estoque": "Estoque",
  "/fornecedor/notas-fiscais": "Notas Fiscais",
  "/catalogo-fornecedor": "Meu Catálogo",
  "/fornecedor/clientes": "Clientes",
  "/questionario": "Questionário",
  "/meus-diagnosticos": "Meus diagnósticos",
  "/dre": "DRE",
};

// Grupos do menu comprador (setorizado) – Frente de Loja em primeiro
const NAV_COMPRADOR_GROUPS = [
  {
    id: "frente-de-loja",
    label: "Frente de Loja",
    items: [
      { path: "/frente-de-loja", label: "Venda" },
      { path: "/cardapio-pdv", label: "Catálogo PDV" },
      { path: "/comandas", label: "Comandas" },
      { path: "/caixa", label: "Caixa" },
      { path: "/impressora-fiscal", label: "Impressora Fiscal" },
      { path: "/nova-proposta", label: "Nova proposta" },
      { path: "/propostas", label: "Propostas" },
      { path: "/produtos-orcamento", label: "Modelos" },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    items: [
      { path: "/nova-cotacao", label: "Nova cotação" },
      { path: "/meus-pedidos", label: "Meus pedidos" },
      { path: "/meu-catalogo", label: "Catálogo" },
      { path: "/fornecedores", label: "Fornecedores" },
      { path: "/historico-compras", label: "Histórico de compras" },
    ],
  },
  {
    id: "estoque",
    label: "Estoque",
    items: [
      { path: "/estoque", label: "Controle de estoque" },
      { path: "/estoque/metricas", label: "Métricas" },
      { path: "/entrada-por-nota-fiscal", label: "Entrada por NF" },
      { path: "/contagem-estoque", label: "Contagem" },
      { path: "/painel-requisicoes", label: "Saída de mercadorias" },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    items: [
      { path: "/dre", label: "DRE" },
      { path: "/produtos-venda", label: "Meus produtos" },
      { path: "/fichas-tecnicas", label: "Fichas técnicas" },
      { path: "/comprador/certificado-digital", label: "Certificado digital" },
      { path: "/configuracao-nfce", label: "Config. NFC-e" },
      { path: "/comprador/perfil-comprador", label: "Perfil" },
      { path: "/documentos-contabilidade", label: "Notas fiscais" },
      { path: "/cadastro-funcionarios", label: "Funcionários" },
      { path: "/ponto", label: "Registrar ponto" },
      { path: "/relatorios-funcionarios", label: "Gerar relatórios" },
    ],
  },
];

const NAV_FORNECEDOR = [
  { path: "/fornecedor/pedidos", label: "Pedidos" },
  { path: "/catalogo-fornecedor", label: "Meu Catálogo" },
  { path: "/fornecedor/estoque", label: "Estoque" },
  { path: "/fornecedor/notas-fiscais", label: "Notas Fiscais" },
  { path: "/fornecedor/clientes", label: "Clientes" },
  { path: "/historico-vendas", label: "Histórico de Vendas" },
  { path: "/fornecedor/perfil-fornecedor", label: "Perfil" },
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
  const usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
  const tipo = (usuario.tipo || "").toLowerCase();
  if (tipo === "questionario") return "questionario";
  const fornecedorPaths = [
    "/fornecedor/",
    "/catalogo-fornecedor",
    "/historico-vendas",
  ];
  if (fornecedorPaths.some((p) => pathname.startsWith(p))) return "fornecedor";
  if (tipo === "fornecedor") return "fornecedor";
  return "comprador";
}

function getGroupContainingPath(pathname) {
  for (const g of NAV_COMPRADOR_GROUPS) {
    if (g.items.some((it) => pathname === it.path || pathname.startsWith(it.path + "/"))) return g.id;
  }
  return null;
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const role = getRole(pathname);

  // Grupos abertos no menu comprador: abre o grupo da rota atual ao carregar
  const [openGroups, setOpenGroups] = useState(() => {
    const id = getGroupContainingPath(pathname);
    return id ? new Set([id]) : new Set(["frente-de-loja"]);
  });

  useEffect(() => {
    const id = getGroupContainingPath(pathname);
    if (id) setOpenGroups((prev) => new Set(prev).add(id));
  }, [pathname]);

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

  // Questionário: só pode acessar /questionario ou /meus-diagnosticos
  useEffect(() => {
    const tipo = (usuario?.tipo || "").toLowerCase();
    const pathsPermitidos = ["/questionario", "/meus-diagnosticos"];
    const permitido = pathsPermitidos.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (tipo === "questionario" && !permitido) {
      navigate("/questionario", { replace: true });
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

  function toggleGroup(id) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          {role === "questionario" ? (
            <>
              <button
                type="button"
                className={`layout-nav-item ${pathname === "/questionario" ? "active" : ""}`}
                onClick={() => navigate("/questionario")}
              >
                Questionário
              </button>
              <button
                type="button"
                className={`layout-nav-item ${pathname === "/meus-diagnosticos" ? "active" : ""}`}
                onClick={() => navigate("/meus-diagnosticos")}
              >
                Meus diagnósticos
              </button>
            </>
          ) : role === "fornecedor" ? (
            NAV_FORNECEDOR.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`layout-nav-item ${isActive(item.path) ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))
          ) : (
            NAV_COMPRADOR_GROUPS.map((group) => {
              const isOpen = openGroups.has(group.id);
              const hasActive = group.items.some((it) => isActive(it.path));
              return (
                <div key={group.id} className="layout-nav-group">
                  <button
                    type="button"
                    className={`layout-nav-group-header ${hasActive ? "active" : ""}`}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                  >
                    {group.label}
                    <span className="layout-nav-group-chevron">{isOpen ? "▼" : "▶"}</span>
                  </button>
                  {isOpen && (
                    <div className="layout-nav-group-items">
                      {group.items.map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          className={`layout-nav-item layout-nav-subitem ${isActive(item.path) ? "active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
        <div className="layout-sidebar-footer">
          <button type="button" className="layout-nav-item" onClick={handleLogout}>
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
        <main
        className={`layout-content ${pathname === "/nova-cotacao" || pathname === "/catalogo-comprador" || pathname === "/meu-catalogo" || pathname === "/estoque" || pathname === "/estoque/metricas" || pathname === "/contagem-estoque" || pathname === "/painel-requisicoes" || pathname === "/frente-de-loja" || pathname === "/cardapio-pdv" || pathname === "/proposta" || pathname === "/nova-proposta" || pathname.startsWith("/proposta/") || pathname.startsWith("/nova-proposta/") || pathname === "/propostas" || pathname.startsWith("/propostas/") ? "layout-content-nova-cotacao" : ""}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
