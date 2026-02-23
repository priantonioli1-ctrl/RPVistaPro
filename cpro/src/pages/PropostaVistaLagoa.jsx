// PropostaVistaLagoa.jsx — Self-Service de Propostas (Vista Lagoa ou tipo customizado)
// Formulário em etapas + cálculo dinâmico + geração de proposta/contrato em PDF
import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import { DADOS_EMPRESA_PADRAO } from "../data/configPropostaPadrao";
import { CLAUSULA_QUARTA_CONTRATANTE, CLAUSULA_QUINTA_GERAIS, CLAUSULA_SEXTA_FORO } from "../data/clausulasContratoPadrao";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4001";

const BORDER = "1px solid rgba(255,255,255,0.08)";
const ETAPAS = ["Dados", "Escopo", "Gastronomia", "Bar", "Opcionais", "Pagamento"];

// Config padrão (fallback quando não há tipo ou API falha)
const OPCOES_BUFFET = [
  { id: "op01", label: "Opção 01", desc: "15 coquetéis (5 frios, 5 quentes, 5 clássicos) + 2 mini degustações", valor: 215 },
  { id: "op02", label: "Opção 02", desc: "17 coquetéis + 2 mini degustações + 1 caldinho", valor: 229 },
  { id: "op03", label: "Opção 03", desc: "20 coquetéis + 2 caldinhos + lanche madrugada + 3 mini degustações", valor: 247 },
];

const OPCOES_BAR = [
  { id: "padrao", label: "Bar padrão sem adicionais", valor: 0 },
  { id: "drinks", label: "Bar de Drinks (5 clássicos)", valor: 45 },
  { id: "caips", label: "Bar de Caipirinhas (4 frutas)", valor: 30 },
  { id: "combo", label: "Drinks + Caipirinhas", valor: 55 },
];

const ILHAS_TEMATICAS = [
  {
    id: "japonesa",
    label: "Comida japonesa",
    opcoes: [
      { id: "10", label: "10 peças/pessoa", valor: 60 },
      { id: "15", label: "15 peças/pessoa", valor: 90 },
    ],
  },
  { id: "massas", label: "Estação de massas", valor: 52 },
  { id: "risotos", label: "Estação de risotos", valor: 52 },
  { id: "degustacao", label: "Mesa de antepastos", valor: 90 },
];

// Regras por opção de buffet: quantos de cada categoria o cliente deve selecionar
const REGRAS_BUFFET = {
  op01: [
    { cat: "frios", qtd: 5, label: "Coquetéis frios" },
    { cat: "quentes", qtd: 5, label: "Coquetéis quentes" },
    { cat: "classicos", qtd: 5, label: "Coquetéis clássicos" },
    { cat: "miniDeg", qtd: 2, label: "Mini degustações" },
  ],
  op02: [
    { cat: "frios", qtd: 6, label: "Coquetéis frios" },
    { cat: "quentes", qtd: 6, label: "Coquetéis quentes" },
    { cat: "classicos", qtd: 5, label: "Coquetéis clássicos" },
    { cat: "miniDeg", qtd: 2, label: "Mini degustações" },
    { cat: "caldinho", qtd: 1, label: "Caldinho" },
  ],
  op03: [
    { cat: "frios", qtd: 7, label: "Coquetéis frios" },
    { cat: "quentes", qtd: 7, label: "Coquetéis quentes" },
    { cat: "classicos", qtd: 6, label: "Coquetéis clássicos" },
    { cat: "caldinhos", qtd: 2, label: "Caldinhos" },
    { cat: "lancheMadrugada", qtd: 1, label: "Lanche madrugada" },
    { cat: "miniDeg", qtd: 3, label: "Mini degustações" },
  ],
};

// Regras por opção de bar (sucos obrigatório em todos)
const REGRAS_BAR = {
  padrao: [{ cat: "sucos", qtd: 2, label: "Sucos (escolha 2 sabores)" }],
  drinks: [
    { cat: "sucos", qtd: 2, label: "Sucos (escolha 2 sabores)" },
    { cat: "classicos", qtd: 5, label: "Drinks clássicos" },
  ],
  caips: [
    { cat: "sucos", qtd: 2, label: "Sucos (escolha 2 sabores)" },
    { cat: "frutas", qtd: 4, label: "Caipirinhas (frutas)" },
  ],
  combo: [
    { cat: "sucos", qtd: 2, label: "Sucos (escolha 2 sabores)" },
    { cat: "classicos", qtd: 5, label: "Drinks clássicos" },
    { cat: "frutas", qtd: 4, label: "Caipirinhas (frutas)" },
  ],
};

const BAR_PADRAO_INCLUSO = [
  { titulo: "BEBIDAS VOLANTES", itens: ["Água mineral com e sem gás", "Refrigerante comum e zero", "2 variedades de suco", "Cerveja"] },
  { titulo: "TIPOS DE SUCOS", itens: ["Abacaxi com hortelã", "Uva", "Tangerina", "Manga"] },
  { titulo: "SUCOS ESPECIAIS (com acréscimo)", itens: ["Melancia com água de coco", "Caju", "Frutas vermelhas", "Manga com gengibre"] },
  { titulo: "MESA DE CAFÉ", itens: ["Café", "Petit four", "Chá"] },
];

// Itens do cardápio Buffet por categoria (coquetéis)
const CARDAPIO_BUFFET = {
  frios: [
    "Ceviche (peixe branco com limão e pimenta dedo de moça)",
    "Wrap de Parma com rúcula e cream cheese",
    "Tartar de salmão, guacamole e sour cream",
    "Batatinha calabresa com lâmina de polvo e páprica picante",
    "Batatinha calabresa com sour cream e crispy de bacon",
    "Stick Caprese (tomate cereja com mussarela de búfala e manjericão)",
    "Steak tartar no chips de batata crocante",
    "Wrap de frango desfiado com especiarias e cream cheese",
    "Stick de rosbife com molho chimichurri",
    "Crostini de gorgonzola e pera caramelizada",
    "Carpaccio de carne com alcaparras e mostarda Dijon, em base de torradinhas crocantes",
    "Carpaccio de salmão com azeite trufado e flor de sal",
    "Espetinho de atum em crosta de gergelim com molho teriyaki",
    "Massa filo com queijo de cabra, parma e chutney de figos",
  ],
  quentes: [
    "Harumaki de camarão e cream cheese ao molho agridoce",
    "Harumaki de legumes ao molho agridoce",
    "Harumaki de suíno desfiado com abacaxi ao molho tonkatsu",
    "Linguiça de costela ao molho de pimenta doce",
    "Escondidinho de carne seca com aipim na tartelette",
    "Escondidinho de frango com damasco",
    "Mini Bruschetta de tomate marinado e manjericão",
    "Mini Bruschetta de brie com geleia de damasco",
    "Mini Bruschetta rústica de calabresa, tomate confit com lâminas de parmesão",
    "Grissini de queijo coalho com mel de laranjeiras",
    "Batatinha calabresa com creme de espinafre e farofa de parmesão",
    "Pipoca de camarão crocante com chutney de banana ou teriyaki",
    "Stick de peixe crocante com molho tártaro",
    "Dadinho de tapioca com melaço",
    "Panceta crocante com molho do chefe",
  ],
  classicos: [
    "Bolinho de bacalhau com azeite de ervas",
    "Bolinho crocante de costela com maionese de ervas",
    "Coxinha de cupim com molho do chefe",
    "Bolinha de queijo com alho",
    "Croquete de mignon com molho de mostarda escura",
    "Mini kibe com molho de alho",
    "Bolinho de aipim com carne seca",
    "Mini quiche de alho poró",
    "Mini quiche de espinafre e queijo",
    "Risole de camarão",
    "Risole de frango",
    "Folhado de ameixa com bacon",
    "Folhado de camarão",
    "Folhado de bacalhau",
    "Mini pastel de camarão com alho poró",
    "Mini pastel de queijo",
    "Mini pastel de carne seca",
    "Mini pastel de costela",
  ],
  caldinho: [
    "Caldo de feijão", "Canja", "Caldo verde", "Vatapá",
  ],
  caldinhos: [
    "Caldo de feijão", "Canja", "Caldo verde", "Vatapá", "Caldo de mandioca",
  ],
  lancheMadrugada: [
    "Pão com manteiga", "Mini sanduíche", "Pão de queijo", "Cachorro-quente",
  ],
};

// Menu Degustação — subdividido. Cliente escolhe N itens (2 ou 3 conforme opção).
// Categorias com max 1: Peixes/Frutos do Mar, Carne (branca ou vermelha), Caldinho.
// Demais: sem limite. Pode escolher 2 da mesma categoria (exceto as de "apenas 01").
const MENU_DEGUSTACAO = [
  {
    id: "peixesFrutosMar",
    label: "Peixes e frutos do mar",
    max: 1,
    hint: "apenas 01 opção",
    items: [
      "Camarão ao alho e óleo", "Filé de tilápia grelhado", "Salmão ao molho de maracujá",
      "Moqueca de peixe", "Polvo grelhado", "Ceviche de peixe",
    ],
  },
  {
    id: "carneBranca",
    label: "Carne branca",
    max: 2,
    grupoCarne: false,
    items: [
      "Filé de frango grelhado", "Frango ao molho madeira", "Estrogonofe de frango",
      "Frango xadrez", "Coxa e sobrecoxa assada",
    ],
  },
  {
    id: "carneVermelha",
    label: "Carne vermelha",
    max: 1,
    grupoCarne: false,
    hint: "apenas 01 opção",
    items: [
      "Filé mignon ao molho", "Carne ao vinho", "Bife acebolado",
      "Strogonoff de carne", "Picanha na chapa", "Costela bovina",
    ],
  },
  {
    id: "risoto",
    label: "Risoto",
    max: null,
    items: [
      "Risoto de frutos do mar", "Risoto de cogumelos", "Risoto de camarão",
      "Risoto arbório", "Risoto de parmesão", "Risoto trufado",
    ],
  },
  {
    id: "massas",
    label: "Massas",
    max: null,
    items: [
      "Nhoque ao molho sugo", "Talharim ao molho branco", "Penne ao molho de tomate",
      "Lasanha à bolonhesa", "Ravioli", "Espaguete carbonara",
    ],
  },
  {
    id: "vegano",
    label: "Vegano",
    max: null,
    items: [
      "Quibe de grão-de-bico", "Falafel", "Tabule",
      "Lasanha de berinjela", "Cogumelos grelhados", "Salada de quinoa",
    ],
  },
  {
    id: "caldinhoDeg",
    label: "Caldinho",
    max: 1,
    hint: "apenas 01 opção",
    items: [
      "Caldo de feijão", "Canja", "Caldo verde", "Vatapá", "Caldo de mandioca",
    ],
  },
  {
    id: "saladas",
    label: "Saladas",
    max: null,
    items: [
      "Salada verde", "Salada caprese", "Salada de quinoa",
      "Salada Caesar", "Salada tropical", "Salada de rúcula",
    ],
  },
  {
    id: "miniDoces",
    label: "Mini doces",
    max: null,
    items: [
      "Mini brownie", "Mini torta de limão", "Brigadeiro",
      "Mini cheesecake", "Mousse de maracujá", "Pudim", "Mini pavê",
    ],
  },
];

// Itens do cardápio Bar (Drinks clássicos: vodka, cachaça ou sake)
const CARDAPIO_BAR = {
  sucos: ["Abacaxi com hortelã", "Uva", "Tangerina", "Manga"],
  classicos: [
    "Vodka e Red Bull",
    "Tropical Gin",
    "Melancita",
    "Gin Tônica",
    "Aperol Spritz",
    "Mojito",
    "Marguerita",
    "Fitzgerald",
    "Basil Smash",
    "Gin Moscow",
    "Negroni",
    "Moscow Mule",
    "Old Fashioned",
    "Dry Martini",
    "Cuba Libre",
  ],
  frutas: [
    "Abacaxi",
    "Maracujá",
    "Morango",
    "Limão Tahiti",
    "Limão Siciliano",
    "Lima",
    "Tangerina",
  ],
  caipsEspeciais: [
    { id: "lichia", label: "Lichia" },
    { id: "caju", label: "Caju" },
    { id: "frutasVermelhas", label: "Frutas vermelhas" },
    { id: "kiwi", label: "Kiwi" },
    { id: "uvaManjericao", label: "Uva com Manjericão" },
  ],
};

function formatarMoeda(v) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

function numeroPorExtenso(n) {
  const un = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dez = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const cem = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  const esp = { 10: "dez", 11: "onze", 12: "doze", 13: "treze", 14: "quatorze", 15: "quinze", 16: "dezesseis", 17: "dezessete", 18: "dezoito", 19: "dezenove" };
  let v = Math.floor(Math.abs(n));
  if (v === 0) return "zero";
  if (v >= 1000000) return `${numeroPorExtenso(Math.floor(v / 1000000))} milh${Math.floor(v / 1000000) === 1 ? "ão" : "ões"} e ${numeroPorExtenso(v % 1000000)}`;
  if (v >= 1000) {
    const mil = Math.floor(v / 1000);
    const rest = v % 1000;
    const parte = mil === 1 ? "mil" : `${numeroPorExtenso(mil)} mil`;
    return rest > 0 ? `${parte} e ${numeroPorExtenso(rest)}` : parte;
  }
  if (v >= 100) {
    const c = Math.floor(v / 100);
    const rest = v % 100;
    const parte = v === 100 ? "cem" : (c === 1 ? "cento" : cem[c]);
    return rest > 0 ? `${parte} e ${numeroPorExtenso(rest)}` : parte;
  }
  if (v >= 20) {
    const d = Math.floor(v / 10);
    const u = v % 10;
    return u > 0 ? `${dez[d]} e ${un[u]}` : dez[d];
  }
  if (v >= 10) return esp[v] || `${dez[Math.floor(v / 10)]} e ${un[v % 10]}`;
  return un[v];
}

export default function PropostaVistaLagoa() {
  const { tipoId, propostaId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const enviarAoCarregar = location.state?.enviarAoCarregar;
  const [tipo, setTipo] = useState(null);
  const [loadingTipo, setLoadingTipo] = useState(!!tipoId || !!propostaId);
  const [propostaAtual, setPropostaAtual] = useState(null);
  const [propostaCarregada, setPropostaCarregada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const enviarTriggered = useRef(false);

  const usuario = typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("usuario") || "{}") : {};
  const empresaId = usuario?.compradorId || (usuario?.tipo === "comprador" ? usuario?._id : null);

  useEffect(() => {
    if (propostaId) {
      fetch(`${API_URL}/api/propostas/${propostaId}`)
        .then((r) => r.json())
        .then((p) => {
          setPropostaAtual(p);
          if (p.tipoProposta && (p.tipoProposta.config?.opcoesBuffet?.length || p.tipoProposta._id)) {
            setTipo(typeof p.tipoProposta === "object" ? p.tipoProposta : null);
          }
        })
        .catch(() => setPropostaAtual(null))
        .finally(() => setLoadingTipo(false));
    } else if (tipoId) {
      fetch(`${API_URL}/api/tipo-proposta/${tipoId}`)
        .then((r) => r.json())
        .then((t) => setTipo(t))
        .catch(() => setTipo(null))
        .finally(() => setLoadingTipo(false));
    } else if (empresaId) {
      fetch(`${API_URL}/api/tipo-proposta?empresa=${encodeURIComponent(empresaId)}`)
        .then((r) => r.json())
        .then((lista) => setTipo(Array.isArray(lista) && lista.length > 0 ? lista[0] : null))
        .catch(() => setTipo(null))
        .finally(() => setLoadingTipo(false));
    } else {
      setLoadingTipo(false);
    }
  }, [tipoId, propostaId]);

  useEffect(() => {
    if (!propostaAtual) return;
    if (propostaAtual.tipoProposta && typeof propostaAtual.tipoProposta === "object") setTipo(propostaAtual.tipoProposta);
    if (propostaAtual.dados) setDados((p) => ({ ...p, ...propostaAtual.dados }));
    if (propostaAtual.escopo) setEscopo((p) => ({ ...p, ...propostaAtual.escopo }));
    if (propostaAtual.gastronomia) setGastronomia((p) => ({ ...p, ...propostaAtual.gastronomia }));
    if (propostaAtual.bar) setBar((p) => ({ ...p, ...propostaAtual.bar }));
    if (propostaAtual.pagamento) setPagamento((p) => ({ ...p, ...propostaAtual.pagamento }));
    setEtapa(5);
    setPropostaCarregada(true);
  }, [propostaAtual?._id]);

  const cfg = useMemo(() => {
    if (tipo?.config?.opcoesBuffet?.length) {
      const c = { ...tipo.config };
      if (!c.dadosEmpresa) c.dadosEmpresa = { ...DADOS_EMPRESA_PADRAO };
      return c;
    }
    return {
      tituloCardapio: "Coquetéis",
      dadosEmpresa: DADOS_EMPRESA_PADRAO,
      opcoesBuffet: OPCOES_BUFFET,
      opcoesBar: OPCOES_BAR,
      barPadraoIncluso: BAR_PADRAO_INCLUSO,
      regrasBuffet: REGRAS_BUFFET,
      regrasBar: REGRAS_BAR,
      cardapioBuffet: CARDAPIO_BUFFET,
      menuDegustacao: MENU_DEGUSTACAO,
      cardapioBar: CARDAPIO_BAR,
      ilhasTematicas: ILHAS_TEMATICAS,
    };
  }, [tipo]);

  const [etapa, setEtapa] = useState(0);
  const [dados, setDados] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    rg: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "RJ",
    cep: "",
    nacionalidade: "brasileira",
    estadoCivil: "",
    profissao: "",
    tipoEvento: "",
    dataEvento: "",
  });
  const [escopo, setEscopo] = useState({
    nConvidados: 0,
    local: "deck",
    nomeLocal: "", // ex: Boate Galera, Deck
    horaInicio: "15:00",
    horaFim: "20:00",
  });
  const [gastronomia, setGastronomia] = useState({
    buffetId: "op01",
    ilhas: [],
    japonesaPecas: null, // "10" | "15" quando comida japonesa selecionada
    cardapioBuffet: {}, // { frios: ["item1"], quentes: [...] }
  });
  const [bar, setBar] = useState({
    opcaoId: "padrao",
    shotBatida: false,
    cardapioBar: {}, // { classicos: [], frutas: [] }
    caipsEspeciais: [], // ids selecionados: + R$ 5/pessoa por sabor
  });
  const [pagamento, setPagamento] = useState({
    modo: "padrao", // padrao | avista
    descontoAvista: 0, // % quando à vista
    dataSinal: "", // data prevista pagamento do sinal (YYYY-MM-DD)
    dataSaldo: "", // data prevista pagamento do saldo (YYYY-MM-DD)
    observacoes: "", // texto livre para forma de pagamento combinada
  });

  const valorBuffet = cfg.opcoesBuffet.find((b) => b.id === gastronomia.buffetId)?.valor ?? 215;
  const valorBar = cfg.opcoesBar.find((b) => b.id === bar.opcaoId)?.valor ?? 0;
  const valorShot = bar.shotBatida ? 10 : 0;
  const temCaip = bar.opcaoId === "caips" || bar.opcaoId === "combo";
  const valorCaipsEspeciais = temCaip ? (bar.caipsEspeciais?.length || 0) * 5 : 0;
  const valorIlhas = (gastronomia.ilhas || []).reduce((acc, id) => {
    const il = cfg.ilhasTematicas.find((i) => i.id === id);
    if (!il) return acc;
    if (il.opcoes) {
      const pecas = gastronomia.japonesaPecas;
      const op = il.opcoes.find((o) => o.id === pecas);
      return acc + (op?.valor ?? 0);
    }
    return acc + (il.valor ?? 0);
  }, 0);
  const qtd = Math.max(0, Number(escopo.nConvidados) || 0);

  const valorPorPessoa = valorBuffet + valorBar + valorShot + valorCaipsEspeciais + valorIlhas;
  const valorTotal = valorPorPessoa * qtd;

  const resumo = useMemo(
    () => ({
      valorBuffet,
      valorBar,
      valorShot,
      valorCaipsEspeciais,
      valorIlhas,
      valorPorPessoa,
      valorTotal,
      qtd,
    }),
    [valorBuffet, valorBar, valorShot, valorCaipsEspeciais, valorIlhas, valorPorPessoa, valorTotal, qtd]
  );

  const etapaCompleta = useMemo(() => {
    if (etapa === 0) return !!(dados.nome?.trim() && dados.email?.trim() && dados.cpf?.trim());
    if (etapa === 1) return Number(escopo.nConvidados) >= 1;
    if (etapa === 2) {
      const regras = cfg.regrasBuffet[gastronomia.buffetId] || [];
      return regras.every((reg) => {
        if (reg.cat === "miniDeg") {
          const md = gastronomia.cardapioBuffet?.miniDeg || {};
          const total = Object.values(md).flat().length;
          const qtd = gastronomia.buffetId === "op03" ? 3 : 2;
          return total === qtd;
        }
        return (gastronomia.cardapioBuffet?.[reg.cat] || []).length === reg.qtd;
      });
    }
    if (etapa === 3) {
      const regras = cfg.regrasBar[bar.opcaoId] || [];
      return regras.every((reg) => (bar.cardapioBar?.[reg.cat] || []).length === reg.qtd);
    }
    if (etapa === 4) return true;
    if (etapa === 5) return true; // Pagamento sempre completo
    return false;
  }, [etapa, dados, escopo, gastronomia, bar, cfg]);

  function toggleIlha(id) {
    const il = cfg.ilhasTematicas.find((i) => i.id === id);
    setGastronomia((p) => {
      if (p.ilhas.includes(id)) {
        return { ...p, ilhas: p.ilhas.filter((x) => x !== id), japonesaPecas: id === "japonesa" ? null : p.japonesaPecas };
      }
      if (il?.opcoes) {
        return { ...p, ilhas: [...p.ilhas, id], japonesaPecas: "10" };
      }
      return { ...p, ilhas: [...p.ilhas, id] };
    });
  }

  function setJaponesaPecas(pecas) {
    setGastronomia((p) => ({ ...p, japonesaPecas: pecas }));
  }

  function toggleItemBuffet(cat, item) {
    if (cat === "miniDeg") return toggleItemMiniDeg(item);
    const regras = cfg.regrasBuffet[gastronomia.buffetId] || [];
    const reg = regras.find((r) => r.cat === cat);
    const max = reg?.qtd ?? 0;
    setGastronomia((p) => {
      const lista = p.cardapioBuffet?.[cat] || [];
      const idx = lista.indexOf(item);
      const novo = idx >= 0 ? lista.filter((_, i) => i !== idx) : lista.length < max ? [...lista, item] : lista;
      return { ...p, cardapioBuffet: { ...p.cardapioBuffet, [cat]: novo } };
    });
  }

  function toggleItemMiniDeg(item) {
    const qtdMiniDeg = obterQtdMiniDeg();
    const subcat = cfg.menuDegustacao.find((s) => s.items.includes(item));
    if (!subcat) return;
    const md = gastronomia.cardapioBuffet?.miniDeg || {};
    const lista = md[subcat.id] || [];
    const totalGeral = Object.values(md).flat().length;
    const grupoCarneTotal = (md.carneBranca || []).length + (md.carneVermelha || []).length;

    const isRemover = lista.includes(item);
    if (isRemover) {
      setGastronomia((p) => {
        const m = p.cardapioBuffet?.miniDeg || {};
        const novaLista = (m[subcat.id] || []).filter((x) => x !== item);
        return { ...p, cardapioBuffet: { ...p.cardapioBuffet, miniDeg: { ...m, [subcat.id]: novaLista } } };
      });
      return;
    }
    if (totalGeral >= qtdMiniDeg) return;
    if (subcat.max != null && lista.length >= subcat.max) return;
    if (subcat.grupoCarne && grupoCarneTotal >= 1) return;
    setGastronomia((p) => {
      const m = p.cardapioBuffet?.miniDeg || {};
      const novaLista = [...(m[subcat.id] || []), item];
      return { ...p, cardapioBuffet: { ...p.cardapioBuffet, miniDeg: { ...m, [subcat.id]: novaLista } } };
    });
  }

  function obterQtdMiniDeg() {
    const op = gastronomia.buffetId;
    return op === "op03" ? 3 : 2;
  }

  function podeSelecionarMiniDeg(subcat, item) {
    const md = gastronomia.cardapioBuffet?.miniDeg || {};
    const lista = md[subcat.id] || [];
    const totalGeral = Object.values(md).flat().length;
    const grupoCarneTotal = (md.carneBranca || []).length + (md.carneVermelha || []).length;
    const qtd = obterQtdMiniDeg();
    if (lista.includes(item)) return true;
    if (totalGeral >= qtd) return false;
    if (subcat.max != null && lista.length >= subcat.max) return false;
    if (subcat.grupoCarne && grupoCarneTotal >= 1) return false;
    return true;
  }

  function toggleItemBar(cat, item) {
    const regras = cfg.regrasBar[bar.opcaoId] || [];
    const reg = regras.find((r) => r.cat === cat);
    const max = reg?.qtd ?? 0;
    setBar((p) => {
      const lista = p.cardapioBar?.[cat] || [];
      const idx = lista.indexOf(item);
      const novo = idx >= 0 ? lista.filter((_, i) => i !== idx) : lista.length < max ? [...lista, item] : lista;
      return { ...p, cardapioBar: { ...p.cardapioBar, [cat]: novo } };
    });
  }

  function resetCardapioBuffet() {
    setGastronomia((p) => ({ ...p, cardapioBuffet: {} }));
  }
  function resetCardapioBar() {
    setBar((p) => ({ ...p, cardapioBar: { sucos: p.cardapioBar?.sucos || [] } }));
  }

  function toggleCaipEspecial(id) {
    setBar((p) => {
      const lista = p.caipsEspeciais || [];
      const novo = lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
      return { ...p, caipsEspeciais: novo };
    });
  }

  function gerarPdf(paraEnvio = false) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const emp = cfg.dadosEmpresa || DADOS_EMPRESA_PADRAO;
    const logoData = emp.logoBase64;
    let y = 20;
    if (logoData) {
      const logoW = 50;
      const logoH = 18;
      const pageW = 210;
      const logoX = (pageW - logoW) / 2;
      doc.addImage(logoData, "PNG", logoX, 8, logoW, logoH);
      y = 8 + logoH + 8;
    }
    const fontSize = 10;
    const pageHeight = 275;
    const LINE_HEIGHT = 6;
    doc.setFontSize(fontSize);

    function novaPagina() {
      if (y > pageHeight) { doc.addPage(); y = 20; }
    }
    function escrever(texto, espaco = LINE_HEIGHT) {
      const linhas = doc.splitTextToSize(String(texto), 170);
      linhas.forEach((l) => {
        novaPagina();
        doc.text(l, 20, y);
        y += espaco;
      });
    }

    doc.setFont(undefined, "bold");
    doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", 105, y, { align: "center" });
    doc.setFont(undefined, "normal");
    y += 10;

    const enderecoParts = [dados.logradouro, dados.numero ? `nº ${dados.numero}` : "", dados.complemento, dados.bairro, dados.cidade, dados.uf].filter(Boolean);
    const enderecoStr = enderecoParts.length >= 4
      ? `${dados.logradouro}, nº ${dados.numero}${dados.complemento ? ", " + dados.complemento : ""} - ${dados.bairro}, ${dados.cidade}/${dados.uf}`
      : dados.logradouro || dados.cidade ? [dados.logradouro, dados.numero, dados.complemento, dados.bairro, dados.cidade, dados.uf].filter(Boolean).join(", ") : "[ENDEREÇO]";
    const partes = [dados.nome || "[NOME]", dados.nacionalidade || "brasileira", dados.estadoCivil && { solteiro: "solteiro(a)", casado: "casado(a)", divorciado: "divorciado(a)", viuvo: "viúvo(a)", uniao: "em união estável" }[dados.estadoCivil], dados.profissao].filter(Boolean);
    const txtContratante = `${partes.join(", ")}, inscrito(a) no CPF sob o nº ${dados.cpf || "[CPF]"}, portador(a) da carteira de identidade sob o nº ${dados.rg || "[RG]"}, residente e domiciliado(a) na ${enderecoStr}. Contato pelo telefone ${dados.telefone || "[TELEFONE]"}. Neste ato denominado(a) simplesmente CONTRATANTE, e do outro lado, ${emp.razaoSocial || "LEQ BAR RESTAURANTE E LANCHONETE LTDA."}, inscrito no CNPJ sob o número: ${emp.cnpj || "08.906.069/0001-90"}, nome fantasia: ${emp.nomeFantasia || "VISTA LAGOA"}, Endereço: ${emp.endereco || "Av. Borges de Medeiros, 2364, Lagoa Rodrigo de Freitas, Rio de Janeiro/RJ CEP: 22470-003"}, representado por ${emp.representante || "Romulo Aquino"}, portador da carteira de identidade ${emp.rgRepresentante || "10982605-7"}, neste ato denominado simplesmente CONTRATADO, e tem entre si justos e acertados em conformidade com as cláusulas e condições a seguir estipuladas:`;
    const contratanteLines = doc.splitTextToSize(txtContratante, 170);
    contratanteLines.forEach((line) => { novaPagina(); doc.text(line, 20, y); y += LINE_HEIGHT; });
    y += 6;

    const buf = cfg.opcoesBuffet.find((b) => b.id === gastronomia.buffetId);
    const dataFmt = dados.dataEvento ? new Date(dados.dataEvento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "[DATA]";
    const localNome = escopo.nomeLocal || (escopo.local === "deck" ? "Deck" : "Salão");
    const localCompleto = escopo.nomeLocal ? `${escopo.nomeLocal}, no Clube Naval Piraquê` : `${localNome}, no Clube Naval Piraquê`;
    novaPagina();
    doc.setFont(undefined, "bold");
    doc.text("CLÁUSULA PRIMEIRA – OBJETIVO", 20, y);
    y += 6;
    doc.setFont(undefined, "normal");
    const horaIniFmt = (escopo.horaInicio || "15:00").slice(0, 5).replace(":", "h");
    const horaFimFmt = (escopo.horaFim || "20:00").slice(0, 5).replace(":", "h");
    const objTexto = `O presente contrato tem como objeto a prestação de serviços de alimentação (comidas e bebidas) para a proposição de serviço de Buffet coquetel volante com almoço estacionado (${buf?.label || "Opção 01"}) para atender ${qtd || "[N]"} pessoas com até 05 horas de duração ininterrupta, no dia ${dataFmt}. O Evento em ${localCompleto} das ${horaIniFmt} às ${horaFimFmt}.`;
    const objLines = doc.splitTextToSize(objTexto, 170);
    objLines.forEach((line) => { novaPagina(); doc.text(line, 20, y); y += LINE_HEIGHT; });
    y += 8;

    const b = cfg.opcoesBar.find((x) => x.id === bar.opcaoId);
    const valorBuffetTotal = valorBuffet * (qtd || 0);
    const valorBarTotal = valorBar * (qtd || 0);
    const valorAdicTotal = (valorIlhas + (bar.shotBatida ? 10 : 0) + valorCaipsEspeciais) * (qtd || 0);
    novaPagina();
    doc.setFont(undefined, "bold");
    doc.text("CLÁUSULA SEGUNDA – DO PREÇO", 20, y);
    y += 6;
    doc.setFont(undefined, "normal");
    const ln1 = `Fica certo e ajustado entre as partes que o valor unitário para o buffet será de ${formatarMoeda(valorBuffet)} (${numeroPorExtenso(valorBuffet)} reais) por pessoa, totalizando o valor de ${formatarMoeda(valorBuffetTotal)} (${numeroPorExtenso(Math.floor(valorBuffetTotal))} reais);`;
    doc.splitTextToSize(ln1, 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; });
    if (valorBar > 0) {
      const ln2 = `Adicional o serviço de ${b?.label || "Bar"} no valor unitário de ${formatarMoeda(valorBar)} (${numeroPorExtenso(valorBar)} reais) por pessoa, totalizando ${formatarMoeda(valorBarTotal)} (${numeroPorExtenso(Math.floor(valorBarTotal))} reais);`;
      doc.splitTextToSize(ln2, 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; });
    }
    if (valorAdicTotal > 0) {
      escrever(`Adicionais (estações gastronômicas, shot de batida, caips especiais): ${formatarMoeda(valorAdicTotal)};`, LINE_HEIGHT);
      y += 2;
    }
    const valorFinal = pagamento.modo === "avista" ? valorTotal * (1 - (pagamento.descontoAvista || 0) / 100) : valorTotal;
    escrever(`Valor total de ${formatarMoeda(pagamento.modo === "avista" ? valorFinal : valorTotal)} (${numeroPorExtenso(Math.floor(pagamento.modo === "avista" ? valorFinal : valorTotal))} reais).`, LINE_HEIGHT);
    y += 2;
    novaPagina(); doc.text("2.1. Forma de pagamento:", 20, y); y += LINE_HEIGHT;
    if (pagamento.observacoes?.trim()) {
      doc.splitTextToSize(pagamento.observacoes.trim(), 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; });
      y += 4;
    } else if (pagamento.modo === "avista") {
      const desc = (pagamento.descontoAvista || 0) > 0 ? ` Com desconto de ${pagamento.descontoAvista}% por pagamento à vista.` : "";
      escrever(`Pagamento à vista no valor de ${formatarMoeda(valorFinal)} (${numeroPorExtenso(Math.floor(valorFinal))} reais) através do PIX.${desc}`, LINE_HEIGHT);
    } else {
      const sinalValor = valorTotal * 0.5;
      const saldoValor = valorTotal * 0.5;
      const fmtData = (s) => {
        if (!s) return "";
        try {
          const d = new Date(s + "T12:00:00");
          return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
        } catch { return ""; }
      };
      const dataSinalFmt = fmtData(pagamento.dataSinal);
      const dataSaldoFmt = fmtData(pagamento.dataSaldo);
      const txtSinal = dataSinalFmt
        ? `Sinal de 50% (cinquenta por cento), no valor de ${formatarMoeda(sinalValor)} (${numeroPorExtenso(Math.floor(sinalValor))} reais) com o pagamento através do PIX, com vencimento em ${dataSinalFmt};`
        : `Sinal de 50% (cinquenta por cento), no valor de ${formatarMoeda(sinalValor)} (${numeroPorExtenso(Math.floor(sinalValor))} reais) com o pagamento através do PIX;`;
      const txtSaldo = dataSaldoFmt
        ? `Saldo de 50% (cinquenta por cento), no valor de ${formatarMoeda(saldoValor)} (${numeroPorExtenso(Math.floor(saldoValor))} reais) com o pagamento através do PIX, com vencimento em ${dataSaldoFmt};`
        : `Saldo de 50% (cinquenta por cento), no valor de ${formatarMoeda(saldoValor)} (${numeroPorExtenso(Math.floor(saldoValor))} reais) com o pagamento através do PIX com o vencimento até 21 (vinte e um) dias antes do evento;`;
      escrever(txtSinal, LINE_HEIGHT);
      escrever(txtSaldo, LINE_HEIGHT);
    }
    y += 4;
    novaPagina(); doc.text("DADOS DO BANCO", 20, y); y += LINE_HEIGHT;
    novaPagina(); doc.text(`Banco ${emp.banco || "SICOOB"}: ${emp.bancoCodigo || "756"}  |  Agência: ${emp.agencia || "3001"}  |  C/C: ${emp.conta || "131.023-2"}`, 20, y); y += LINE_HEIGHT;
    novaPagina(); doc.text(`CNPJ: ${emp.cnpj || "08.906.069/0001-90"}  |  PIX: ${emp.pix || "financeiro@grroma.com.br"}`, 20, y); y += LINE_HEIGHT;
    novaPagina(); doc.text(`Obs. O comprovante deve ser enviado para ${emp.emailComprovante || emp.pix || "financeiro@grroma.com.br"}`, 20, y); y += LINE_HEIGHT + 4;

    novaPagina();
    doc.setFont(undefined, "bold");
    doc.text("CLÁUSULA TERCEIRA – OBRIGAÇÃO DO CONTRATADO", 20, y);
    y += 6;
    doc.setFont(undefined, "normal");
    const sucosSel = (bar.cardapioBar?.sucos || []);
    const sucoTxt = sucosSel.length === 2 ? `Suco (${sucosSel.join(", ")})` : "Suco (2 opções)";
    const itensBarTxt = bar.opcaoId === "padrao" ? ["Refrigerantes", "Água com e sem gás", sucoTxt, "Cerveja"] : [b?.label || "Bar de Drinks e Caipirinhas", "Refrigerantes", "Água com e sem gás", sucoTxt, "Cerveja"];
    doc.splitTextToSize("Em razão de o objeto contratual requerer habilitação especializada, o CONTRATADO obriga-se a dispor de pessoal para a execução do serviço, como:", 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; });
    novaPagina(); doc.text("1. Staff: Gerente, Maitre operacional, Garçom, Copeiro, Barman, Auxiliares de barman, Chefe de cozinha, Auxiliares de cozinha", 20, y); y += LINE_HEIGHT;
    novaPagina(); doc.text("2. Alimentos e bebidas:", 20, y); y += LINE_HEIGHT;
    novaPagina(); doc.text("- Buffet (" + (buf?.label || "Opção 01") + ")", 20, y); y += LINE_HEIGHT;
    itensBarTxt.forEach((i) => { novaPagina(); doc.text("- " + i, 20, y); y += LINE_HEIGHT; });
    doc.splitTextToSize("3. Da equipe: A quantidade de garçons e serviços é determinada de acordo com os serviços e o número de convidados do evento. É personalizado para cada festa.", 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; });
    y += 6;

    novaPagina();
    doc.setFont(undefined, "bold");
    doc.text("CLÁUSULA QUARTA – OBRIGAÇÃO DA CONTRATANTE", 20, y);
    y += 6;
    doc.setFont(undefined, "normal");
    CLAUSULA_QUARTA_CONTRATANTE.forEach((p) => { doc.splitTextToSize(p, 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; }); y += 3; });
    y += 4;

    novaPagina();
    doc.setFont(undefined, "bold");
    doc.text("CLÁUSULA QUINTA – DISPOSIÇÕES GERAIS", 20, y);
    y += 6;
    doc.setFont(undefined, "normal");
    CLAUSULA_QUINTA_GERAIS.forEach((p) => { doc.splitTextToSize(p, 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; }); y += 3; });
    y += 4;

    novaPagina();
    doc.setFont(undefined, "bold");
    doc.text("CLÁUSULA SEXTA – FORO", 20, y);
    y += 6;
    doc.setFont(undefined, "normal");
    doc.splitTextToSize(CLAUSULA_SEXTA_FORO, 170).forEach((l) => { novaPagina(); doc.text(l, 20, y); y += LINE_HEIGHT; });
    y += 12;

    novaPagina(); doc.text(`Rio de Janeiro, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.`, 20, y);
    y += 12;
    novaPagina(); doc.text("__________________________________", 20, y);
    doc.text("__________________________________", 115, y);
    y += 6;
    doc.text("CONTRATANTE", 20, y);
    doc.text(`CONTRATADO ${emp.nomeFantasia || "VISTA LAGOA"}`, 115, y);
    const slug = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "cliente";
    const nomeSlug = slug(dados.nome);
    const festaSlug = slug(dados.tipoEvento) || "proposta";
    if (paraEnvio) return doc.output("dataurlstring").split(",")[1];
    doc.save(`${nomeSlug}-${festaSlug}.pdf`);
  }

  async function salvarProposta() {
    const tipoId = tipo?._id || propostaAtual?.tipoProposta?._id || propostaAtual?.tipoProposta;
    if (!empresaId) throw new Error("Sessão inválida. Faça login novamente.");
    if (!tipoId) throw new Error("Nenhum tipo de proposta carregado. Acesse Modelos para cadastrar um tipo ou aguarde o carregamento.");
    const payload = {
      empresa: empresaId,
      tipoProposta: tipoId,
      dados,
      escopo,
      gastronomia,
      bar,
      pagamento,
      valorTotal: pagamento.modo === "avista" && (pagamento.descontoAvista || 0) > 0
        ? resumo.valorTotal * (1 - pagamento.descontoAvista / 100)
        : resumo.valorTotal,
    };
    if (propostaId) {
      const res = await fetch(`${API_URL}/api/propostas/${propostaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao salvar");
      const updated = await res.json();
      setPropostaAtual(updated);
      return updated;
    }
    const res = await fetch(`${API_URL}/api/propostas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Erro ao criar");
    return await res.json();
  }

  async function enviarPorEmail() {
    if (!propostaId || !dados?.email?.trim()) {
      Swal.fire("Aviso", "Informe o email do cliente na proposta.", "warning");
      return;
    }
    setEnviando(true);
    try {
      const pdfBase64 = gerarPdf(true);
      const res = await fetch(`${API_URL}/api/propostas/${propostaId}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      Swal.fire("Enviado!", "O contrato foi enviado por email para o cliente.", "success");
      navigate("/propostas", { replace: true });
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    if (!enviarAoCarregar || !propostaId || !propostaCarregada || enviarTriggered.current) return;
    if (!propostaAtual?.dados?.email?.trim()) {
      Swal.fire("Aviso", "Esta proposta não tem email do cliente.", "warning");
      navigate("/propostas");
      return;
    }
    enviarTriggered.current = true;
    setEnviando(true);
    const timer = setTimeout(() => {
      (async () => {
        try {
          const pdfBase64 = gerarPdf(true);
          const res = await fetch(`${API_URL}/api/propostas/${propostaId}/enviar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfBase64 }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao enviar");
          Swal.fire("Enviado!", "O contrato foi enviado por email para o cliente.", "success");
          navigate("/propostas", { replace: true });
        } catch (err) {
          Swal.fire("Erro", err.message, "error");
          setEnviando(false);
        }
      })();
    }, 100);
    return () => clearTimeout(timer);
  }, [enviarAoCarregar, propostaId, propostaCarregada, propostaAtual]);

  async function handleGerarPdf() {
    setSalvando(true);
    try {
      gerarPdf(false);
    } catch (err) {
      Swal.fire("Erro", "Não foi possível gerar o PDF.", "error");
      setSalvando(false);
      return;
    }
    try {
      const salva = await salvarProposta();
      if (!propostaId && salva?._id) {
        await Swal.fire({
          title: "Salvo!",
          html: "Proposta gerada e salva. Redirecionando para a lista de Propostas...",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        navigate("/propostas", { replace: true });
      }
    } catch (err) {
      await Swal.fire({
        title: "PDF gerado!",
        html: "O contrato foi baixado. A proposta <b>não foi salva</b> (servidor pode estar iniciando).<br><br>Clique em <b>Salvar novamente</b> para tentar guardar na lista.",
        icon: "warning",
        confirmButtonText: "Entendi",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNaLista() {
    if (!empresaId || !tipo) {
      Swal.fire("Aviso", "Faça login e aguarde o carregamento do tipo de proposta.", "warning");
      return;
    }
    setSalvando(true);
    try {
      const salva = await salvarProposta();
      if (salva?._id) {
        await Swal.fire({
          title: "Salvo!",
          html: "Proposta salva na lista. Você pode visualizá-la na página <b>Propostas</b>.",
          icon: "success",
          confirmButtonText: "Ver Propostas",
        });
        navigate("/propostas", { replace: true });
      }
    } catch (err) {
      Swal.fire("Erro ao salvar", err.message || "Servidor indisponível. Tente novamente em alguns segundos.", "error");
    } finally {
      setSalvando(false);
    }
  }

  const cardStyle = "rounded-xl p-6 bg-transparent";
  const inputStyle = "w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400";
  const btnPrim = "rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-slate-900 hover:opacity-90 transition";

  if (loadingTipo) {
    return (
      <div className="min-h-screen bg-transparent text-white font-sans flex items-center justify-center" style={{ fontFamily: "Inter, Montserrat, sans-serif" }}>
        <p className="text-white/70">Carregando tipo de proposta...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white font-sans" style={{ fontFamily: "Inter, Montserrat, sans-serif" }}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          {propostaId && (
            <button
              type="button"
              onClick={() => navigate("/propostas")}
              className="mb-4 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              ← Voltar para Propostas
            </button>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cyan-400">{tipo?.nome || "Proposta"}</h1>
            <p className="mt-2 text-white/70">{tipo?.subtitulo || "Self-Service de Propostas"}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-6">
              {ETAPAS.map((e, i) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEtapa(i)}
                  className={`flex-1 py-2 px-3 rounded-lg text-base font-semibold transition ${etapa === i ? "bg-cyan-500/30 text-cyan-400 border border-cyan-400/50" : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"}`}
                >
                  {e}
                </button>
              ))}
            </div>

            <div className={cardStyle}>
              {etapa === 0 && (
                <>
                  <h2 className="text-lg font-semibold mb-4">Dados do Contratante</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><label className="block text-sm text-white/70 mb-1">Nome completo *</label><input type="text" className={inputStyle} value={dados.nome} onChange={(e) => setDados((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">E-mail *</label><input type="email" className={inputStyle} value={dados.email} onChange={(e) => setDados((p) => ({ ...p, email: e.target.value }))} placeholder="E-mail" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Telefone *</label><input type="tel" className={inputStyle} value={dados.telefone} onChange={(e) => setDados((p) => ({ ...p, telefone: e.target.value }))} placeholder="(21) 99999-9999" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">CPF *</label><input type="text" className={inputStyle} value={dados.cpf} onChange={(e) => setDados((p) => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" maxLength={14} /></div>
                    <div><label className="block text-sm text-white/70 mb-1">RG</label><input type="text" className={inputStyle} value={dados.rg} onChange={(e) => setDados((p) => ({ ...p, rg: e.target.value }))} placeholder="Nº documento identidade" /></div>
                    <div className="sm:col-span-2 pt-2 border-t border-white/10"><p className="text-sm font-medium text-cyan-400/90 mb-3">Endereço</p></div>
                    <div><label className="block text-sm text-white/70 mb-1">Logradouro *</label><input type="text" className={inputStyle} value={dados.logradouro} onChange={(e) => setDados((p) => ({ ...p, logradouro: e.target.value }))} placeholder="Rua ou Av." /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Número *</label><input type="text" className={inputStyle} value={dados.numero} onChange={(e) => setDados((p) => ({ ...p, numero: e.target.value }))} placeholder="Nº" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Complemento</label><input type="text" className={inputStyle} value={dados.complemento} onChange={(e) => setDados((p) => ({ ...p, complemento: e.target.value }))} placeholder="Apto, bloco, etc." /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Bairro *</label><input type="text" className={inputStyle} value={dados.bairro} onChange={(e) => setDados((p) => ({ ...p, bairro: e.target.value }))} placeholder="Bairro" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Cidade *</label><input type="text" className={inputStyle} value={dados.cidade} onChange={(e) => setDados((p) => ({ ...p, cidade: e.target.value }))} placeholder="Cidade" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">UF *</label><select className={inputStyle} value={dados.uf} onChange={(e) => setDados((p) => ({ ...p, uf: e.target.value }))}>{["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></div>
                    <div><label className="block text-sm text-white/70 mb-1">CEP *</label><input type="text" className={inputStyle} value={dados.cep} onChange={(e) => setDados((p) => ({ ...p, cep: e.target.value }))} placeholder="00000-000" maxLength={9} /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Nacionalidade</label><input type="text" className={inputStyle} value={dados.nacionalidade} onChange={(e) => setDados((p) => ({ ...p, nacionalidade: e.target.value }))} placeholder="Ex.: brasileira" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Estado civil</label><select className={inputStyle} value={dados.estadoCivil} onChange={(e) => setDados((p) => ({ ...p, estadoCivil: e.target.value }))}><option value="">—</option><option value="solteiro">Solteiro(a)</option><option value="casado">Casado(a)</option><option value="divorciado">Divorciado(a)</option><option value="viuvo">Viúvo(a)</option><option value="uniao">União estável</option></select></div>
                    <div><label className="block text-sm text-white/70 mb-1">Profissão</label><input type="text" className={inputStyle} value={dados.profissao} onChange={(e) => setDados((p) => ({ ...p, profissao: e.target.value }))} placeholder="Ex.: Advogada" /></div>
                    <div className="sm:col-span-2 pt-2 border-t border-white/10"><p className="text-sm font-medium text-cyan-400/90 mb-3">Evento</p></div>
                    <div><label className="block text-sm text-white/70 mb-1">Tipo de evento</label><input type="text" className={inputStyle} value={dados.tipoEvento} onChange={(e) => setDados((p) => ({ ...p, tipoEvento: e.target.value }))} placeholder="Ex.: Casamento, Aniversário" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Data prevista *</label><input type="date" className={inputStyle} value={dados.dataEvento} onChange={(e) => setDados((p) => ({ ...p, dataEvento: e.target.value }))} /></div>
                  </div>
                </>
              )}
              {etapa === 1 && (
                <>
                  <h2 className="text-lg font-semibold mb-4">Escopo do Evento</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="block text-sm text-white/70 mb-1">Número de convidados *</label><input type="number" min="1" className={inputStyle} value={escopo.nConvidados || ""} onChange={(e) => setEscopo((p) => ({ ...p, nConvidados: e.target.value }))} placeholder="Quantidade" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Local</label><select className={inputStyle} value={escopo.local} onChange={(e) => setEscopo((p) => ({ ...p, local: e.target.value }))}><option value="deck">Deck</option><option value="salao">Salão</option></select></div>
                    <div><label className="block text-sm text-white/70 mb-1">Nome do espaço</label><input type="text" className={inputStyle} value={escopo.nomeLocal} onChange={(e) => setEscopo((p) => ({ ...p, nomeLocal: e.target.value }))} placeholder="Ex.: Boate Galera, no Clube Naval Piraquê" /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Horário início</label><input type="time" className={inputStyle} value={escopo.horaInicio} onChange={(e) => setEscopo((p) => ({ ...p, horaInicio: e.target.value }))} /></div>
                    <div><label className="block text-sm text-white/70 mb-1">Horário término</label><input type="time" className={inputStyle} value={escopo.horaFim} onChange={(e) => setEscopo((p) => ({ ...p, horaFim: e.target.value }))} /></div>
                  </div>
                </>
              )}
              {etapa === 2 && (
                <>
                  <h2 className="text-lg font-semibold mb-4">Gastronomia — Buffet</h2>
                  <div className="space-y-3">
                    {cfg.opcoesBuffet.map((op) => (
                      <label key={op.id} className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 border border-white/10">
                        <input type="radio" name="buffet" checked={gastronomia.buffetId === op.id} onChange={() => { setGastronomia((p) => ({ ...p, buffetId: op.id })); resetCardapioBuffet(); }} className="mt-1" />
                        <div><span className="font-medium">{op.label}</span> — {formatarMoeda(op.valor)}/pessoa<p className="text-sm text-white/60 mt-0.5">{op.desc}</p></div>
                      </label>
                    ))}
                  </div>
                  {/* Cardápio — seleção conforme regras da opção */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="text-base font-semibold mb-3 text-cyan-400">Cardápio{((cfg.tituloCardapio || "Coquetéis").trim() ? " — " + (cfg.tituloCardapio || "Coquetéis").trim() : "")} — Selecione os itens conforme sua opção</h3>
                    {(cfg.regrasBuffet[gastronomia.buffetId] || []).map((reg) => {
                      if (reg.cat === "miniDeg") {
                        const qtdDeg = gastronomia.buffetId === "op03" ? 3 : 2;
                        const md = gastronomia.cardapioBuffet?.miniDeg || {};
                        const totalDeg = Object.values(md).flat().length;
                        return (
                          <div key="miniDeg" className="mb-6">
                            <p className="text-sm text-white/70 mb-1">
                              Menu degustação: escolha {qtdDeg} itens no total (selecionados: {totalDeg}/{qtdDeg})
                            </p>
                            <p className="text-xs text-white/50 mb-3">Respeite o limite de cada categoria (até 02 opções ou apenas 01 opção, conforme indicado).</p>
                            {cfg.menuDegustacao.map((subcat) => (
                              <div key={subcat.id} className="mb-4">
                                <p className="text-sm font-medium text-white/80 mb-2">
                                  {subcat.label}
                                  {subcat.hint && <span className="text-cyan-400/90 font-normal"> ({subcat.hint})</span>}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {subcat.items.map((item) => {
                                    const checked = (md[subcat.id] || []).includes(item);
                                    const pode = podeSelecionarMiniDeg(subcat, item);
                                    return (
                                      <button
                                        key={item}
                                        type="button"
                                        onClick={() => pode && toggleItemBuffet("miniDeg", item)}
                                        disabled={!pode}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left w-full sm:w-auto ${checked ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 cursor-pointer" : !pode ? "opacity-50 border-white/10 cursor-not-allowed" : "border-white/20 hover:bg-white/5 cursor-pointer"}`}
                                      >
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${checked ? "bg-cyan-500 border-cyan-400" : "border-white/40"}`}>{checked && "✓"}</span>
                                        <span className="text-sm">{item}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      const itens = cfg.cardapioBuffet[reg.cat] || [];
                      const sel = gastronomia.cardapioBuffet?.[reg.cat] || [];
                      return (
                        <div key={reg.cat} className="mb-4">
                          <p className="text-sm text-white/70 mb-2">
                            {reg.label}: escolha {reg.qtd} (selecionados: {sel.length}/{reg.qtd})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {itens.map((item) => {
                              const checked = sel.includes(item);
                              const atMax = !checked && sel.length >= reg.qtd;
                              const pode = checked || !atMax;
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => pode && toggleItemBuffet(reg.cat, item)}
                                  disabled={!pode}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left ${checked ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 cursor-pointer" : atMax ? "opacity-50 border-white/10 cursor-not-allowed" : "border-white/20 hover:bg-white/5 cursor-pointer"}`}
                                >
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${checked ? "bg-cyan-500 border-cyan-400" : "border-white/40"}`}>{checked && "✓"}</span>
                                  <span className="text-sm">{item}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {etapa === 3 && (
                <>
                  <h2 className="text-lg font-semibold mb-4">Bebidas / Bar</h2>
                  <div className="space-y-3">
                    {cfg.opcoesBar.map((op) => (
                      <label key={op.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 border border-white/10">
                        <input type="radio" name="bar" checked={bar.opcaoId === op.id} onChange={() => { setBar((p) => ({ ...p, opcaoId: op.id, caipsEspeciais: (op.id === "caips" || op.id === "combo") ? (p.caipsEspeciais || []) : [], shotBatida: op.id === "padrao" ? false : p.shotBatida })); resetCardapioBar(); }} />
                        <span className="font-medium">{op.label}</span>
                        {op.valor > 0 && <> — {formatarMoeda(op.valor)}/pessoa</>}
                      </label>
                    ))}
                  </div>
                  {bar.opcaoId === "padrao" && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h3 className="text-base font-semibold mb-3 text-cyan-400">Incluso no bar padrão</h3>
                      <p className="text-sm text-white/60 mb-4">Os seguintes itens já estão incluídos. Escolha os 2 sabores de suco abaixo.</p>
                      {(cfg.barPadraoIncluso || []).map((grupo, idx) => (
                        <div key={idx} className="mb-4">
                          <p className="text-sm font-medium text-cyan-400/90 mb-2">{grupo.titulo}</p>
                          <ul className="text-sm text-white/80 space-y-1 list-disc list-inside">
                            {grupo.itens.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Seleção de sucos (obrigatória em todos) + demais regras do bar */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="text-base font-semibold mb-3 text-cyan-400">{bar.opcaoId === "padrao" ? "Escolha 2 sabores de suco" : "Cardápio Bar — Selecione os itens conforme sua opção"}</h3>
                    {(cfg.regrasBar[bar.opcaoId] || []).map((reg) => {
                      const itens = cfg.cardapioBar[reg.cat] || [];
                      const sel = bar.cardapioBar?.[reg.cat] || [];
                      return (
                        <div key={reg.cat} className="mb-4">
                          <p className="text-sm text-white/70 mb-2">
                            {reg.label}: escolha {reg.qtd} (selecionados: {sel.length}/{reg.qtd})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {itens.map((item) => {
                              const checked = sel.includes(item);
                              const atMax = !checked && sel.length >= reg.qtd;
                              const pode = checked || !atMax;
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => pode && toggleItemBar(reg.cat, item)}
                                  disabled={!pode}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left ${checked ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 cursor-pointer" : atMax ? "opacity-50 border-white/10 cursor-not-allowed" : "border-white/20 hover:bg-white/5 cursor-pointer"}`}
                                >
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${checked ? "bg-cyan-500 border-cyan-400" : "border-white/40"}`}>{checked && "✓"}</span>
                                  <span className="text-sm">{item}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {bar.opcaoId !== "padrao" && (bar.opcaoId === "caips" || bar.opcaoId === "combo") && (cfg.cardapioBar?.caipsEspeciais || []).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h3 className="text-base font-semibold mb-2 text-cyan-400">Caips Especiais (opcional)</h3>
                      <p className="text-sm text-white/60 mb-3">Acréscimo de R$ 5,00/pessoa por sabor escolhido.</p>
                      <div className="flex flex-wrap gap-2">
                        {(cfg.cardapioBar?.caipsEspeciais || []).map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => toggleCaipEspecial(op.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left ${(bar.caipsEspeciais || []).includes(op.id) ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 cursor-pointer" : "border-white/20 hover:bg-white/5 cursor-pointer"}`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${(bar.caipsEspeciais || []).includes(op.id) ? "bg-cyan-500 border-cyan-400" : "border-white/40"}`}>{(bar.caipsEspeciais || []).includes(op.id) && "✓"}</span>
                            <span className="text-sm">{op.label}</span>
                            <span className="text-xs text-white/50">+ R$ 5/pessoa</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {bar.opcaoId !== "padrao" && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h3 className="text-base font-semibold mb-2 text-cyan-400">Shot de Batida — Adicional</h3>
                      <p className="text-sm text-white/60 mb-3">Sabores: coco, maracujá, amendoim. Acréscimo de R$ 10,00/pessoa.</p>
                      <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 border border-white/10">
                        <input type="checkbox" checked={bar.shotBatida} onChange={(e) => setBar((p) => ({ ...p, shotBatida: e.target.checked }))} />
                        <span>Adicionar Shot de Batida — + R$ 10,00/pessoa</span>
                      </label>
                    </div>
                  )}
                </>
              )}
              {etapa === 4 && (
                <>
                  <h2 className="text-lg font-semibold mb-2 text-cyan-400">Estações Gastronômicas</h2>
                  <p className="text-white/70 text-sm mb-4">Avalie o investimento da sua proposta acima e adicione estas opções se desejar. Valores sob consulta.</p>
                  <div className="flex flex-col gap-4">
                    {cfg.ilhasTematicas.map((il) =>
                      il.opcoes ? (
                        <div key={il.id} className="rounded-lg border border-white/20 p-4">
                          <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input type="checkbox" checked={gastronomia.ilhas.includes(il.id)} onChange={() => toggleIlha(il.id)} />
                            <span className="font-medium">{il.label}</span>
                            <span className="text-white/50 text-sm">(adicional)</span>
                          </label>
                          {gastronomia.ilhas.includes(il.id) && (
                            <div className="ml-6 flex flex-col gap-2">
                              <p className="text-sm text-white/70">Escolha uma opção:</p>
                              {il.opcoes.map((op) => (
                                <label key={op.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`japonesa-${il.id}`}
                                    checked={gastronomia.japonesaPecas === op.id}
                                    onChange={() => setJaponesaPecas(op.id)}
                                  />
                                  <span>{op.label}</span>
                                  <span className="text-cyan-400 text-sm">+ {formatarMoeda(op.valor)}/pessoa</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <label key={il.id} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 cursor-pointer hover:bg-white/5">
                          <input type="checkbox" checked={gastronomia.ilhas.includes(il.id)} onChange={() => toggleIlha(il.id)} />
                          <span>{il.label}</span>
                          {il.valor != null && <span className="text-cyan-400 text-sm">+ {formatarMoeda(il.valor)}/pessoa</span>}
                          {il.valor == null && <span className="text-white/50 text-sm">(sob consulta)</span>}
                        </label>
                      )
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-3">As estações selecionadas serão incluídas na proposta como “sob consulta” para cotação personalizada.</p>
                </>
              )}
              {etapa === 5 && (
                <>
                  <h2 className="text-lg font-semibold mb-4 text-cyan-400">Forma de Pagamento</h2>
                  <p className="text-white/70 text-sm mb-4">Selecione a forma de pagamento combinada com o cliente. Estas informações serão incluídas no contrato.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-white/80 mb-2">Modo de pagamento</p>
                      <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 border border-white/10 mb-2">
                        <input type="radio" name="pagamento" checked={pagamento.modo === "padrao"} onChange={() => setPagamento((p) => ({ ...p, modo: "padrao" }))} />
                        <span>Padrão — 50% de sinal + 50% de saldo (vencimento até 21 dias antes do evento)</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 border border-white/10">
                        <input type="radio" name="pagamento" checked={pagamento.modo === "avista"} onChange={() => setPagamento((p) => ({ ...p, modo: "avista" }))} />
                        <span>À vista (pagamento único)</span>
                      </label>
                    </div>
                    {pagamento.modo === "avista" && (
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Desconto concedido (%)</label>
                        <input type="number" min="0" max="100" step="0.5" className={inputStyle} value={pagamento.descontoAvista || ""} onChange={(e) => setPagamento((p) => ({ ...p, descontoAvista: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 5" style={{ maxWidth: 120 }} />
                      </div>
                    )}
                    {pagamento.modo === "padrao" && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm text-white/70 mb-1">Data prevista pagamento do sinal</label>
                          <input type="date" className={inputStyle} value={pagamento.dataSinal || ""} onChange={(e) => setPagamento((p) => ({ ...p, dataSinal: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm text-white/70 mb-1">Data prevista pagamento do saldo</label>
                          <input type="date" className={inputStyle} value={pagamento.dataSaldo || ""} onChange={(e) => setPagamento((p) => ({ ...p, dataSaldo: e.target.value }))} />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm text-white/70 mb-1">Observações (forma de pagamento combinada)</label>
                      <textarea className={inputStyle} rows={4} value={pagamento.observacoes} onChange={(e) => setPagamento((p) => ({ ...p, observacoes: e.target.value }))} placeholder="Ex: Pagamento via PIX. Sinal até dia 16/02/2026. Saldo até 10/05/2026." />
                      <p className="text-xs text-white/50 mt-1">Descreva aqui qualquer detalhe específico da forma de pagamento acordada com o cliente.</p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-6">
                {etapa > 0 && <button type="button" onClick={() => setEtapa((e) => e - 1)} className="px-6 py-3 rounded-lg border border-white/20 hover:bg-white/10 transition">Voltar</button>}
                {etapa < 5 ? (
                  <button
                    type="button"
                    onClick={() => etapaCompleta && setEtapa((e) => e + 1)}
                    disabled={!etapaCompleta}
                    className={`ml-auto ${btnPrim} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50`}
                  >
                    Próximo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 lg:pl-4">
            <div className={`${cardStyle} sticky top-6`}>
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Resumo da Proposta</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Buffet/pessoa</span><span>{formatarMoeda(resumo.valorBuffet)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Bar/pessoa</span><span>{formatarMoeda(resumo.valorBar)}</span></div>
                {resumo.valorCaipsEspeciais > 0 && <div className="flex justify-between"><span className="text-white/70">Caips especiais/pessoa</span><span>{formatarMoeda(resumo.valorCaipsEspeciais)}</span></div>}
                {resumo.valorIlhas > 0 && <div className="flex justify-between"><span className="text-white/70">Estações</span><span>{formatarMoeda(resumo.valorIlhas)}</span></div>}
                {resumo.valorShot > 0 && <div className="flex justify-between"><span className="text-white/70">Shot/pessoa</span><span>{formatarMoeda(resumo.valorShot)}</span></div>}
                <div className="border-t border-white/20 my-3 pt-3 flex justify-between"><span className="text-white/80">Por pessoa</span><span className="font-semibold">{formatarMoeda(resumo.valorPorPessoa)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Convidados</span><span>{resumo.qtd}</span></div>
                {pagamento.modo === "avista" && (pagamento.descontoAvista || 0) > 0 && (
                  <div className="flex justify-between text-cyan-400/90"><span>Desconto à vista</span><span>- {pagamento.descontoAvista}%</span></div>
                )}
                <div className="border-t border-cyan-400/50 my-3 pt-3 flex justify-between text-lg"><span className="text-cyan-400 font-semibold">{pagamento.modo === "avista" && (pagamento.descontoAvista || 0) > 0 ? "Total final" : "Total"}</span><span className="font-bold text-cyan-400">{formatarMoeda(pagamento.modo === "avista" && (pagamento.descontoAvista || 0) > 0 ? resumo.valorTotal * (1 - pagamento.descontoAvista / 100) : resumo.valorTotal)}</span></div>
              </div>
              {etapa === 5 && (
                <>
                  {propostaId && (
                    <button
                      type="button"
                      onClick={enviarPorEmail}
                      disabled={enviando || !dados?.email?.trim()}
                      className={`w-full mt-4 ${btnPrim}`}
                    >
                      {enviando ? "Enviando..." : "Enviar contrato por email"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGerarPdf}
                    disabled={salvando}
                    className={`w-full mt-4 ${btnPrim}`}
                  >
                    {salvando ? "Salvando..." : "Gerar Proposta e Contrato (PDF)"}
                  </button>
                  {!propostaId && empresaId && tipo && (
                    <button
                      type="button"
                      onClick={salvarNaLista}
                      disabled={salvando}
                      className="w-full mt-3 px-4 py-2 rounded-lg border border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 transition text-sm"
                    >
                      {salvando ? "Salvando..." : "Salvar proposta na lista (sem gerar PDF)"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
