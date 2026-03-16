/**
 * Reforma Tributária (EC 132/2023) — Fase de transição 2026
 *
 * Alíquotas de teste conforme normativa:
 * - CBS (Federal): 0,9% sobre valor da operação
 * - IBS (Estadual/Municipal): 0,1% sobre valor da operação
 *
 * Cálculo "por fora": IBS e CBS não integram a própria base de cálculo.
 * Categorias de medicamentos conforme Lei da Reforma.
 */

// =============================================================================
// ENUM — Categorias tributárias (medicamentos e demais itens)
// =============================================================================
export const CATEGORIA_TRIBUTARIA = {
  ALÍQUOTA_ZERO: "ALÍQUOTA_ZERO",
  ALÍQUOTA_REDUZIDA: "ALÍQUOTA_REDUZIDA",
  ALÍQUOTA_PADRÃO: "ALÍQUOTA_PADRÃO",
};

export const CATEGORIA_TRIBUTARIA_LABELS = {
  [CATEGORIA_TRIBUTARIA.ALÍQUOTA_ZERO]:
    "Alíquota zero (ex: medicamentos câncer, diabetes, hipertensão, Farmácia Popular)",
  [CATEGORIA_TRIBUTARIA.ALÍQUOTA_REDUZIDA]:
    "Alíquota reduzida 60% (medicamentos essenciais)",
  [CATEGORIA_TRIBUTARIA.ALÍQUOTA_PADRÃO]:
    "Alíquota padrão (demais itens, perfumaria, higiene)",
};

export const VALORES_PADRAO = {
  CBS_PERCENTUAL: 0.9,
  IBS_PERCENTUAL: 0.1,
  REDUCAO_ALIQUOTA_REDUZIDA: 0.6, // 60% de redução
};

/**
 * Calcula IBS e CBS "por fora" — não integram a base de cálculo.
 *
 * @param {number} valorItem - Valor do item (subtotal = qtd * precoUnitario)
 * @param {string} categoria - Uma de CATEGORIA_TRIBUTARIA
 * @returns {{ valorIBS: number, valorCBS: number, valorBase: number, categoria: string, aliquotaEfetivaIBS: number, aliquotaEfetivaCBS: number }}
 */
export function calcularImpostosReforma(valorItem, categoria) {
  const valor = Number(valorItem) || 0;
  const cat = String(categoria || CATEGORIA_TRIBUTARIA.ALÍQUOTA_PADRÃO).trim();

  let fatorIBS = VALORES_PADRAO.IBS_PERCENTUAL / 100;
  let fatorCBS = VALORES_PADRAO.CBS_PERCENTUAL / 100;

  if (cat === CATEGORIA_TRIBUTARIA.ALÍQUOTA_ZERO) {
    fatorIBS = 0;
    fatorCBS = 0;
  } else if (cat === CATEGORIA_TRIBUTARIA.ALÍQUOTA_REDUZIDA) {
    fatorIBS *= 1 - VALORES_PADRAO.REDUCAO_ALIQUOTA_REDUZIDA;
    fatorCBS *= 1 - VALORES_PADRAO.REDUCAO_ALIQUOTA_REDUZIDA;
  }

  const valorIBS = Math.round(valor * fatorIBS * 100) / 100;
  const valorCBS = Math.round(valor * fatorCBS * 100) / 100;

  return {
    valorIBS,
    valorCBS,
    valorBase: valor,
    categoria: cat,
    aliquotaEfetivaIBS: fatorIBS * 100,
    aliquotaEfetivaCBS: fatorCBS * 100,
  };
}

/**
 * Calcula totais de IBS e CBS para uma lista de itens.
 *
 * @param {Array<{ subtotal: number, categoriaTributaria?: string }>} itens
 * @returns {{ totalIBS: number, totalCBS: number, totalBase: number, detalhes: Array }}
 */
export function totalizarImpostosReforma(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return { totalIBS: 0, totalCBS: 0, totalBase: 0, detalhes: [] };
  }

  const detalhes = [];
  let totalIBS = 0;
  let totalCBS = 0;
  let totalBase = 0;

  for (const item of itens) {
    const subtotal = Number(item.subtotal) || 0;
    const cat = item.categoriaTributaria || CATEGORIA_TRIBUTARIA.ALÍQUOTA_PADRÃO;
    const calc = calcularImpostosReforma(subtotal, cat);

    detalhes.push({ ...calc, nome: item.nome });
    totalIBS += calc.valorIBS;
    totalCBS += calc.valorCBS;
    totalBase += subtotal;
  }

  totalIBS = Math.round(totalIBS * 100) / 100;
  totalCBS = Math.round(totalCBS * 100) / 100;

  return { totalIBS, totalCBS, totalBase, detalhes };
}
