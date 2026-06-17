const BD_PHONE = /(\+?880|0)\s*[-. ]?\s*1[3-9]\d{2}[-. ]?\d{3}[-. ]?\d{3}/
const GENERIC_PHONE = /\b\d{10,13}\b/
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const REPEATED_CHARS = /(.)\1{9,}/  // 10+ same char in a row (spam)
const ALL_CAPS_LONG = /^[A-Z\s!?.,]{30,}$/  // all caps 30+ chars

const BLOCKED_WORDS: string[] = [
  // Add offensive words/slurs specific to your community
  // Keeping this minimal — add more as needed
]

export interface ModerationResult {
  allowed: boolean
  reason?: string
}

export function moderateContent(content: string): ModerationResult {
  const trimmed = content.trim()

  if (trimmed.length === 0) {
    return { allowed: false, reason: 'Message cannot be empty' }
  }
  if (trimmed.length > 200) {
    return { allowed: false, reason: 'Message too long (max 200 characters)' }
  }
  if (BD_PHONE.test(trimmed) || GENERIC_PHONE.test(trimmed)) {
    return { allowed: false, reason: 'Phone numbers are not allowed' }
  }
  if (EMAIL_PATTERN.test(trimmed)) {
    return { allowed: false, reason: 'Email addresses are not allowed' }
  }
  if (REPEATED_CHARS.test(trimmed)) {
    return { allowed: false, reason: 'Spam detected' }
  }

  const lower = trimmed.toLowerCase()
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return { allowed: false, reason: 'Content violates community guidelines' }
    }
  }

  return { allowed: true }
}

export function isValidAiubEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@student\.aiub\.edu$/.test(email)
}
