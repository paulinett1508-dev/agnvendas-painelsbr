# Mapeamento da API — AGN Vendas (Supabase)

## Credenciais de acesso (readonly)
```
SUPABASE_URL=https://jthpohihrsacpftklctt.supabase.co
SUPABASE_KEY=sb_publishable_kX2VoqzNuEkiRPPyZ45g6A_p4wIUCYv
SUPABASE_SCHEMA=lab_sobral
```

> ⚠️ Essas credenciais são públicas (expostas no frontend do sistema original).
> São somente leitura. Qualquer tentativa de escrita deve ser bloqueada no harvester.

## Headers obrigatórios em toda requisição
```
apikey: <SUPABASE_KEY>
authorization: Bearer <SUPABASE_KEY>
accept-profile: lab_sobral
accept: application/json
```

## Endpoints

### GET /cadastrodevendedores
Retorna todos os vendedores cadastrados.
Não requer filtro — retorna lista completa.

Campos relevantes:
- `codigo` → slpcode do vendedor
- `nomedovendedor`
- `funcao`

### GET /dashboard
Retorna snapshot atual de faturamento de todos os vendedores.

Campos:
- `slpcode`
- `meta` — meta do mês
- `metadiaria`
- `faturamentomes` — faturamento acumulado no mês
- `faturamentodia`
- `ticketmediodia`
- `percentualmes` — % atingido da meta
- `mediames` — média diária do mês

### GET /positivacao
Retorna positivação e histórico dos últimos 3 meses.

Campos:
- `slpcode`
- `baseativa` — total de clientes ativos na carteira
- `positivacaoatual` — clientes comprados no mês atual
- `qtdvendamesatual` / `qtdvendamesanterior1` / `qtdvendamesanterior2` / `qtdvendamesanterior3`
- `vrvendamesatual` — valor vendido mês atual
- `vrvendamesanterior1` / `vrvendamesanterior2` / `vrvendamesanterior3`
- `vrfatmesatual` — faturamento mês atual
- `vrfatmesanterior1` / `vrfatmesanterior2` / `vrfatmesanterior3`

### GET /top5itens?slpcode=eq.{codigo}
Top 5 itens mais vendidos por vendedor.
Requer filtro por slpcode.

Campos:
- `slpcode`
- `itemcode`
- `item` — nome do produto
- `qtd` — quantidade vendida
- `percentual` — % sobre total
- `created_at`

### GET /positivacaofabricante?slpcode=eq.{codigo}
Positivação por fabricante. Pode retornar vazio para alguns vendedores.

### GET /configuracoes
Configurações gerais do sistema. Útil para entender o período vigente.

### GET /dadosdaempresa
Dados da empresa (nome, logo, etc).

## Observações
- Valores numéricos vêm como string com vírgula decimal (ex: `"44241,910000"`)
- Fazer parse com: `parseFloat(str.replace(',', '.'))`
- `positivacaofabricante` retorna `[]` para a maioria dos vendedores
- O campo `meta` está zerado para todos — metas não estão sendo preenchidas no sistema