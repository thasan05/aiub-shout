const COLORS: { name: string; hex: string }[] = [
  { name: 'Blue',    hex: '#60A5FA' },
  { name: 'Silver',  hex: '#94A3B8' },
  { name: 'Red',     hex: '#F87171' },
  { name: 'Golden',  hex: '#FBBF24' },
  { name: 'Green',   hex: '#4ADE80' },
  { name: 'Purple',  hex: '#C084FC' },
  { name: 'Violet',  hex: '#A78BFA' },
  { name: 'Crimson', hex: '#FB7185' },
  { name: 'Azure',   hex: '#38BDF8' },
  { name: 'Jade',    hex: '#34D399' },
  { name: 'Amber',   hex: '#FCD34D' },
  { name: 'Coral',   hex: '#FB923C' },
  { name: 'Steel',   hex: '#7DD3FC' },
  { name: 'Lunar',   hex: '#E2E8F0' },
  { name: 'Storm',   hex: '#93C5FD' },
  { name: 'Forest',  hex: '#86EFAC' },
  { name: 'Ocean',   hex: '#22D3EE' },
  { name: 'Ember',   hex: '#FCA5A5' },
  { name: 'Mist',    hex: '#BAE6FD' },
  { name: 'Dusk',    hex: '#DDD6FE' },
]

const ANIMALS: string[] = [
  'Tiger',    'Falcon',   'Panda',    'Eagle',    'Lion',
  'Phoenix',  'Dragon',   'Wolf',     'Hawk',     'Raven',
  'Jaguar',   'Lynx',     'Viper',    'Cobra',    'Stallion',
  'Panther',  'Leopard',  'Wolverine','Osprey',   'Condor',
  'Basilisk', 'Kraken',   'Griffin',  'Hydra',    'Wyvern',
  'Leviathan','Chimera',  'Behemoth', 'Sphinx',   'Manticore',
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
