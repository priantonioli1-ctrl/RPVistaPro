// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import AppLayout from "./components/AppLayout";

import CadastroFuncionarios from "./pages/Comprador/CadastroFuncionarios";
import PainelRequisicoes from "./pages/Comprador/SaidaMercadorias";
import ContagemReal from "./pages/Comprador/ContagemReal";
import MeuCatalogo from "./pages/Comprador/MeuCatalogo";
import MeusPedidos from "./pages/Comprador/MeusPedidos";
import Fornecedores from "./pages/Comprador/Fornecedores";
import ResumoCotacao from "./pages/Comprador/ResumoCotacao";
import CatalogoComprador from "./pages/Comprador/CatalogoComprador";
import Estoque from "./pages/Comprador/Estoque";
import PerfilComprador from "./pages/Comprador/PerfilComprador";
import ConferenciaPedido from "./pages/Comprador/ConferenciaPedido";
import HistoricoCompras from "./pages/Comprador/HistoricoCompras";
import Metricas from "./pages/Comprador/Metricas";
import RequisicaoEstoque from "./pages/Comprador/RequisicaoEstoque";
import RequisicaoPorLink from "./pages/Comprador/RequisicaoPorLink";

import Pedidos from "./pages/Fornecedor/Pedidos";
import HistoricoVendas from "./pages/Fornecedor/HistoricoVendas";
import PerfilFornecedor from "./pages/Fornecedor/PerfilFornecedor";
import CatalogoFornecedor from "./pages/Fornecedor/CatalogoFornecedor";
import Clientes from "./pages/Fornecedor/Clientes";

import PedidoDetalhado from "./pages/Compartilhado/PedidoDetalhado";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/requisicao-link/:token" element={<RequisicaoPorLink />} />

        <Route element={<AppLayout />}>
          <Route path="/home-comprador" element={<Navigate to="/meus-pedidos" replace />} />
          <Route path="/contagem-estoque" element={<ContagemReal />} />
          <Route path="/cadastro-funcionarios" element={<CadastroFuncionarios />} />
          <Route path="/painel-requisicoes" element={<PainelRequisicoes />} />
          <Route path="/contagem-real" element={<Navigate to="/contagem-estoque" replace />} />
          <Route path="/nova-cotacao" element={<CatalogoComprador />} />
          <Route path="/catalogo-comprador" element={<CatalogoComprador />} />
          <Route path="/meus-pedidos" element={<MeusPedidos />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/resumo-cotacao" element={<ResumoCotacao />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/comprador/perfil-comprador" element={<PerfilComprador />} />
          <Route path="/metricas" element={<Metricas />} />
          <Route path="/historico-compras" element={<HistoricoCompras />} />
          <Route path="/meu-catalogo" element={<MeuCatalogo />} />
          <Route path="/requisicao-estoque" element={<RequisicaoEstoque />} />
          <Route path="/conferencia-pedido/:id" element={<ConferenciaPedido />} />
          <Route path="/pedido-detalhado/:id" element={<PedidoDetalhado />} />

          <Route path="/home-fornecedor" element={<Navigate to="/fornecedor/pedidos" replace />} />
          <Route path="/fornecedor/pedidos" element={<Pedidos />} />
          <Route path="/historico-vendas" element={<HistoricoVendas />} />
          <Route path="/fornecedor/perfil-fornecedor" element={<PerfilFornecedor />} />
          <Route path="/catalogo-fornecedor" element={<CatalogoFornecedor />} />
          <Route path="/fornecedor/clientes" element={<Clientes />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;