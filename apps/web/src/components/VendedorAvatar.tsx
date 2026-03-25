import { initials } from '../lib/format'

const PALETTE = [
  ['#f97316', '#431407'],
  ['#3b82f6', '#1e3a5f'],
  ['#8b5cf6', '#2e1065'],
  ['#10b981', '#064e3b'],
  ['#ec4899', '#500724'],
  ['#f59e0b', '#451a03'],
  ['#06b6d4', '#083344'],
  ['#84cc16', '#1a2e05'],
]

function colorFor(slpcode: string): [string, string] {
  const n = parseInt(slpcode, 10) || 0
  return PALETTE[n % PALETTE.length] as [string, string]
}

interface Props {
  nome: string | null
  slpcode: string
  size?: number
}

export default function VendedorAvatar({ nome, slpcode, size = 36 }: Props) {
  const [fg, bg] = colorFor(slpcode)
  const fs = Math.round(size * 0.38)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: `${bg}cc`,
        border: `1px solid ${fg}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        fontSize: fs,
        color: fg,
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
    >
      {initials(nome)}
    </div>
  )
}
