/**
 * Reforma Tributária (EC 132/2023) — Cálculo no frontend para exibição
 * Alíquotas de teste 2026: CBS 0,9%, IBS 0,1%. Redução 60% para ALÍQUOTA_REDUZIDA.
 */
export const CATEGORIA_TRIBUTARIA = {
  ALÍQUOTA_ZERO: "ALÍQUOTA_ZERO",
  ALÍQUOTA_REDUZIDA: "ALÍQUOTA_REDUZIDA",
  ALÍQUOTA_PADRÃO: "ALÍQUOTA_PADRÃO",
};

const CBS_PCT = 0.9 / 100;
const IBS_PCT = 0.1 / 100;
const REDUCAO = 0.6;

export function calcularIbsCbs(subtotal, categoria) {
  const val = Number(subtotal) || 0;
  const cat = String(categoria || CATEGORIA_TRIBUTARIA.ALÍQUOTA_PADRÃO).trim();
  let fIBS = IBS_PCT;
  let fCBS = CBS_PCT;
  if (cat === CATEGORIA_TRIBUTARIA.ALÍQUOTA_ZERO) fIBS = fCBS = 0;
  else if (cat === CATEGORIA_TRIBUTARIA.ALÍQUOTA_REDUZIDA) {
    fIBS *= 1 - REDUCAO;
    fCBS *= 1 - REDUCAO;
  }
  return {
    valorIBS: Math.round(val * fIBS * 100) / 100,
    valorCBS: Math.round(val * fCBS * 100) / 100,
  };
}

export function totalizarIbsCbs(itens) {
  let totalIBS = 0;
  let totalCBS = 0;
  (itens || []).forEach((i) => {
    const subtotal = (i.quantidade || 0) * (i.precoUnitario || 0);
    const { valorIBS, valorCBS } = calcularIbsCbs(subtotal, i.categoriaTributaria);
    totalIBS += valorIBS;
    totalCBS += valorCBS;
  });
  return {
    totalIBS: Math.round(totalIBS * 100) / 100,
    totalCBS: Math.round(totalCBS * 100) / 100,
  };
}
