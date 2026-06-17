const COLORS: { name: string; hex: string }[] = [
  { name: 'Blue', hex: '#60A5FA' },
  { name: 'Ash',  hex: '#94A3B8' },
  { name: 'Red',  hex: '#F87171' },
  { name: 'Gold', hex: '#FBBF24' },
  { name: 'Lime', hex: '#4ADE80' },
  { name: 'Plum', hex: '#C084FC' },
  { name: 'Iris', hex: '#A78BFA' },
  { name: 'Ruby', hex: '#FB7185' },
  { name: 'Sky',  hex: '#38BDF8' },
  { name: 'Jade', hex: '#34D399' },
  { name: 'Tan',  hex: '#FCD34D' },
  { name: 'Rust', hex: '#FB923C' },
  { name: 'Cyan', hex: '#7DD3FC' },
  { name: 'Gray', hex: '#E2E8F0' },
  { name: 'Fog',  hex: '#93C5FD' },
  { name: 'Fern', hex: '#86EFAC' },
  { name: 'Aqua', hex: '#22D3EE' },
  { name: 'Rose', hex: '#FCA5A5' },
  { name: 'Mist', hex: '#BAE6FD' },
  { name: 'Dusk', hex: '#DDD6FE' },
]

const ANIMALS: string[] = [
  'Fox',  'Owl',  'Wolf', 'Hawk', 'Lion',
  'Lynx', 'Puma', 'Bear', 'Bat',  'Colt',
  'Orca', 'Crow', 'Bull', 'Mink', 'Eel',
  'Yak',  'Crab', 'Deer', 'Frog', 'Hare',
  'Moth', 'Pike', 'Seal', 'Toad', 'Wren',
  'Kite', 'Dove', 'Ibis', 'Newt', 'Vole',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash | 0
  }
  return Math.abs(hash)
}

export function getNicknameForId(userId: string, salt = ''): { name: string; hex: string } {
  const hash = hashString(userId + salt)
  const color = COLORS[hash % COLORS.length]
  const animal = ANIMALS[Math.floor(hash / COLORS.length) % ANIMALS.length]
  return { name: `${color.name} ${animal}`, hex: color.hex }
}

export async function generateUniqueNickname(
  supabase: ReturnType<typeof import('./supabase/server').createServerClient> extends Promise<infer T> ? T : never,
  userId: string
): Promise<{ name: string; hex: string }> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = getNicknameForId(userId, attempt === 0 ? '' : String(attempt))
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', candidate.name)
      .neq('id', userId)
      .maybeSingle()

    if (!data) return candidate
  }
  // Fallback: append random suffix
  const base = getNicknameForId(userId)
  return { name: `${base.name} ${Math.floor(Math.random() * 999) + 1}`, hex: base.hex }
}
