# Reforma Tributária (EC 132/2023) — Fase Transição 2026

## Visão geral

Implementação inicial da Reforma Tributária conforme Emenda Constitucional 132/2023, para a fase de transição que inicia em 2026.

## Alíquotas de teste (2026)

| Imposto | Descrição              | Alíquota |
|---------|------------------------|----------|
| CBS     | Contribuição sobre Bens e Serviços (Federal) | 0,9% |
| IBS     | Imposto sobre Bens e Serviços (Estadual/Municipal) | 0,1% |

O cálculo é **por fora**: IBS e CBS não integram a própria base de cálculo.

## Categorias tributárias (medicamentos e itens)

| Categoria          | Descrição                                                    | Efeito                 |
|--------------------|--------------------------------------------------------------|------------------------|
| ALÍQUOTA_ZERO      | Medicamentos câncer, diabetes, hipertensão, Farmácia Popular | IBS = 0, CBS = 0       |
| ALÍQUOTA_REDUZIDA  | Medicamentos essenciais                                      | Redução de 60% na alíquota |
| ALÍQUOTA_PADRÃO    | Demais itens (perfumaria, higiene etc.)                      | Alíquotas completas    |

## Estrutura de dados

### CardapioPDV (produtos)
- `categoriaTributaria`: `"ALÍQUOTA_ZERO"` | `"ALÍQUOTA_REDUZIDA"` | `"ALÍQUOTA_PADRÃO"`

### Venda / itens_venda
- `categoriaTributaria`: por item
- `valorIBS`: IBS calculado por item
- `valorCBS`: CBS calculado por item
- `totalIBS`: total da venda
- `totalCBS`: total da venda

### Comanda
- `totalIBS`, `totalCBS` no documento
- Itens com `categoriaTributaria`, `valorIBS`, `valorCBS`

## API de cálculo

```js
import { calcularImpostosReforma, totalizarImpostosReforma } from './services/reformaTributaria.js';

// Por item
const resultado = calcularImpostosReforma(100, 'ALÍQUOTA_PADRÃO');
// { valorIBS: 0.1, valorCBS: 0.9, valorBase: 100, ... }

// Lista de itens
const totais = totalizarImpostosReforma(itens);
// { totalIBS, totalCBS, totalBase, detalhes }
```

## Exibição no cupom (Lei da Transparência)

O cupom exibe, quando houver valores:
- SUBTOTAL
- IBS (Est./Mun.): R$ X,XX
- CBS (Federal): R$ X,XX
- TOTAL
- Pagamento
