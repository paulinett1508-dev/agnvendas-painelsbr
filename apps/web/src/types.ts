export interface Vendedor {
  id: number
  slpcode: string
  nome: string | null
  funcao: string | null
  ativo: boolean
  createdAt: string
}

export interface DashboardRow {
  slpcode: string
  meta: string | null
  faturamentoMes: string | null
  faturamentoDia: string | null
  ticketMedioDia: string | null
  percentualMes: string | null
  mediaMes: string | null
  capturedAt: string
}

export interface PositivacaoRow {
  slpcode: string
  baseAtiva: number | null
  positivacaoAtual: number | null
  qtdVendaMesAtual: number | null
  vrFatMesAtual: string | null
  vrFatMesAnterior1: string | null
  vrFatMesAnterior2: string | null
  vrFatMesAnterior3: string | null
  capturedAt: string
}

export interface Top5Item {
  id: number
  slpcode: string
  itemcode: string | null
  item: string | null
  qtd: number | null
  percentual: string | null
  capturedAt: string
}

export interface VendedorEnriquecido extends Vendedor {
  dashboard?: DashboardRow
  positivacao?: PositivacaoRow
}
