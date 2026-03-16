# Estados e Alíquotas de ICMS

O sistema possui uma base de dados com os 27 estados do Brasil e suas alíquotas de ICMS. Essa informação é usada no cadastro de fornecedores e na cotação.

## Popular a base de estados

Antes de cadastrar fornecedores com estado, rode o seed:

```bash
cd backend-rpvistapro
npm run seed:estados
```

Isso cria/atualiza os estados na coleção `estados` do MongoDB.

## Fluxo

1. **Cadastro de fornecedor:** Campos obrigatórios para fornecedores: Nome da empresa, Endereço, Estado (UF). Ao escolher o estado, a alíquota é atribuída automaticamente.
2. **Perfil do fornecedor:** O fornecedor pode editar endereço e estado. Ao alterar o estado, a alíquota é recalculada.
3. **Catálogo:** Quando o fornecedor salva seu catálogo, a alíquota do seu perfil é associada ao catálogo.
4. **Cotação:** O resumo da cotação exibe subtotal e total com ICMS por fornecedor, usando a alíquota do estado de cada um.
