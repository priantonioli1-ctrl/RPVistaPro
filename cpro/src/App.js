// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import VerificarEmail from "./pages/VerificarEmail";
import AppLayout from "./components/AppLayout";

import CadastroFuncionarios from "./pages/Comprador/CadastroFuncionarios";
import PainelRequisicoes from "./pages/Comprador/SaidaMercadorias";
import ContagemReal from "./pages/Comprador/ContagemReal";
import MeuCatalogo from "./pages/Comprador/MeuCatalogo";
import MeusPedidos from "./pages/Comprador/MeusPedidos";
import Fornecedores from "./pages/Comprador/Fornecedores";
import ResumoCotacao from "./pages/Comprador/ResumoCotacao";
import CotacaoAbastecimento from "./pages/Comprador/CotacaoAbastecimento";
import CatalogoComprador from "./pages/Comprador/CatalogoComprador";
import Estoque from "./pages/Comprador/Estoque";
import PerfilComprador from "./pages/Comprador/PerfilComprador";
import ConferenciaPedido from "./pages/Comprador/ConferenciaPedido";
import HistoricoCompras from "./pages/Comprador/HistoricoCompras";
import Metricas from "./pages/Comprador/Metricas";
import MetricasEstoque from "./pages/Comprador/MetricasEstoque";
import RequisicaoEstoque from "./pages/Comprador/RequisicaoEstoque";
import RequisicaoPorLink from "./pages/Comprador/RequisicaoPorLink";
import ProdutosVenda from "./pages/Comprador/ProdutosVenda";
import CardapioPDV from "./pages/Comprador/CardapioPDV";
import DocumentosContabilidade from "./pages/Comprador/DocumentosContabilidade";
import EntradaPorNotaFiscal from "./pages/Comprador/EntradaPorNotaFiscal";
import CertificadoDigital from "./pages/Comprador/CertificadoDigital";
import ImpressoraFiscal from "./pages/Comprador/ImpressoraFiscal";
import ConfiguracaoNFCe from "./pages/Comprador/ConfiguracaoNFCe";
import FichasTecnicas from "./pages/Comprador/FichasTecnicas";
import FrenteDeLoja from "./pages/Comprador/FrenteDeLoja";
import Comandas from "./pages/Comprador/Comandas";
import Caixa from "./pages/Comprador/Caixa";
import DRE from "./pages/Comprador/DRE";
import RelatoriosFuncionarios from "./pages/Comprador/RelatoriosFuncionarios";
import FolhaPontoFuncionario from "./pages/Comprador/FolhaPontoFuncionario";
import FichaFuncionario from "./pages/Comprador/FichaFuncionario";
import PontoBatida from "./pages/Comprador/PontoBatida";

import Pedidos from "./pages/Fornecedor/Pedidos";
import EstoqueFornecedor from "./pages/Fornecedor/EstoqueFornecedor";
import NotasFiscaisFornecedor from "./pages/Fornecedor/NotasFiscaisFornecedor";
import HistoricoVendas from "./pages/Fornecedor/HistoricoVendas";
import PerfilFornecedor from "./pages/Fornecedor/PerfilFornecedor";
import CatalogoFornecedor from "./pages/Fornecedor/CatalogoFornecedor";
import Clientes from "./pages/Fornecedor/Clientes";

import Questionario from "./pages/Questionario/Questionario";
import MeusDiagnosticos from "./pages/Questionario/MeusDiagnosticos";
import PedidoDetalhado from "./pages/Compartilhado/PedidoDetalhado";
import OrcamentoDetalhe from "./pages/Comprador/OrcamentoDetalhe";
import TiposProposta from "./pages/Comprador/TiposProposta";
import Propostas from "./pages/Comprador/Propostas";
import OrcamentoLinkPublico from "./pages/OrcamentoLinkPublico";
import PropostaVistaLagoa from "./pages/PropostaVistaLagoa";
import DiagnosticoRota from "./pages/DiagnosticoRota";

function RedirectEventoToken() {
  const { token } = useParams();
  return <Navigate to={`/orcamento/${token}`} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/verificar-email" element={<VerificarEmail />} />
        <Route path="/diagnostico-rota" element={<DiagnosticoRota />} />
        <Route path="/requisicao-link/:token" element={<RequisicaoPorLink />} />
        <Route path="/orcamento/:token" element={<OrcamentoLinkPublico />} />
        <Route path="/evento/:token" element={<RedirectEventoToken />} />

        <Route element={<AppLayout />}>
          <Route path="/home-comprador" element={<Navigate to="/meus-pedidos" replace />} />
          <Route path="/contagem-estoque" element={<ContagemReal />} />
          <Route path="/cadastro-funcionarios" element={<CadastroFuncionarios />} />
          <Route path="/painel-requisicoes" element={<PainelRequisicoes />} />
          <Route path="/produtos-venda" element={<ProdutosVenda />} />
          <Route path="/fichas-tecnicas" element={<FichasTecnicas />} />
          <Route path="/documentos-contabilidade" element={<DocumentosContabilidade />} />
          <Route path="/entrada-por-nota-fiscal" element={<EntradaPorNotaFiscal />} />
          <Route path="/comprador/certificado-digital" element={<CertificadoDigital />} />
          <Route path="/impressora-fiscal" element={<ImpressoraFiscal />} />
          <Route path="/configuracao-nfce" element={<ConfiguracaoNFCe />} />
          <Route path="/contagem-real" element={<Navigate to="/contagem-estoque" replace />} />
          <Route path="/nova-cotacao" element={<CatalogoComprador />} />
          <Route path="/catalogo-comprador" element={<CatalogoComprador />} />
          <Route path="/meus-pedidos" element={<MeusPedidos />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/resumo-cotacao" element={<ResumoCotacao />} />
          <Route path="/cotacao-abastecimento" element={<CotacaoAbastecimento />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/estoque/metricas" element={<MetricasEstoque />} />
          <Route path="/frente-de-loja" element={<FrenteDeLoja />} />
          <Route path="/cardapio-pdv" element={<CardapioPDV />} />
          <Route path="/orcamentos" element={<Navigate to="/nova-proposta" replace />} />
          <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
          <Route path="/proposta-vista-lagoa" element={<Navigate to="/nova-proposta" replace />} />
          <Route path="/proposta" element={<Navigate to="/nova-proposta" replace />} />
          <Route path="/proposta/:tipoId" element={<PropostaVistaLagoa />} />
          <Route path="/nova-proposta" element={<PropostaVistaLagoa />} />
          <Route path="/nova-proposta/:tipoId" element={<PropostaVistaLagoa />} />
          <Route path="/propostas" element={<Propostas />} />
          <Route path="/propostas/:propostaId" element={<PropostaVistaLagoa />} />
          <Route path="/produtos-orcamento" element={<TiposProposta />} />
          <Route path="/produtos-orcamento/:id" element={<TiposProposta />} />
          <Route path="/comandas" element={<Comandas />} />
          <Route path="/caixa" element={<Caixa />} />
          <Route path="/relatorios-funcionarios" element={<RelatoriosFuncionarios />} />
          <Route path="/folha-ponto/:id" element={<FolhaPontoFuncionario />} />
          <Route path="/ficha-funcionario/:id" element={<FichaFuncionario />} />
          <Route path="/ponto" element={<PontoBatida />} />
          <Route path="/comprador/perfil-comprador" element={<PerfilComprador />} />
          <Route path="/metricas" element={<Metricas />} />
          <Route path="/historico-compras" element={<HistoricoCompras />} />
          <Route path="/meu-catalogo" element={<MeuCatalogo />} />
          <Route path="/requisicao-estoque" element={<RequisicaoEstoque />} />
          <Route path="/conferencia-pedido/:id" element={<ConferenciaPedido />} />
          <Route path="/pedido-detalhado/:id" element={<PedidoDetalhado />} />
          <Route path="/dre" element={<DRE />} />

          <Route path="/home-fornecedor" element={<Navigate to="/fornecedor/pedidos" replace />} />
          <Route path="/fornecedor/pedidos" element={<Pedidos />} />
          <Route path="/fornecedor/estoque" element={<EstoqueFornecedor />} />
          <Route path="/fornecedor/notas-fiscais" element={<NotasFiscaisFornecedor />} />
          <Route path="/historico-vendas" element={<HistoricoVendas />} />
          <Route path="/fornecedor/perfil-fornecedor" element={<PerfilFornecedor />} />
          <Route path="/catalogo-fornecedor" element={<CatalogoFornecedor />} />
          <Route path="/fornecedor/clientes" element={<Clientes />} />

          <Route path="/questionario" element={<Questionario />} />
          <Route path="/meus-diagnosticos" element={<MeusDiagnosticos />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;