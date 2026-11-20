import { COMMON_PASSWORDS_BY_LENGTH } from './commonPasswords.generated'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 100

const passwords: Record<number, ReadonlyArray<string> | undefined> =
  COMMON_PASSWORDS_BY_LENGTH

function codePointLength(value: string) {
  let length = 0
  for (const _character of value) length += 1
  return length
}

function isCommonPassword(password: string) {
  const normalized = password.normalize('NFC').toLowerCase()
  const bucket = passwords[codePointLength(normalized)]
  if (bucket === undefined) return false
  let low = 0
  let high = bucket.length - 1
  while (low <= high) {
    const middle = (low + high) >> 1
    const candidate = bucket[middle] ?? ''
    if (candidate === normalized) return true
    if (candidate < normalized) low = middle + 1
    else high = middle - 1
  }
  return false
}

export function validateNewPassword(password: string, minimumLength: number) {
  if (
    !(
      minimumLength >= MIN_PASSWORD_LENGTH &&
      minimumLength <= MAX_PASSWORD_LENGTH
    )
  ) {
    throw new Error(
      `minimumLength must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`,
    )
  }
  const length = codePointLength(password)
  if (length < minimumLength) {
    return { error: 'PASSWORD_TOO_SHORT' as const, minimumLength }
  }
  if (length > MAX_PASSWORD_LENGTH) {
    return {
      error: 'PASSWORD_TOO_LONG' as const,
      maximumLength: MAX_PASSWORD_LENGTH,
    }
  }
  if (/^\s|\s$/u.test(password)) {
    return { error: 'PASSWORD_HAS_SURROUNDING_WHITESPACE' as const }
  }
  if (isCommonPassword(password)) {
    return { error: 'PASSWORD_TOO_COMMON' as const }
  }
  return null
}
