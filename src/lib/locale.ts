import * as runtime from '@/paraglide/runtime'

export type Lang = 'en' | 'de'

export function currentLocale(): Lang {
  return runtime.getLocale() === 'de' ? 'de' : 'en'
}

// The generated runtime.d.ts types setLocale via a JSDoc typedef the checker cannot see.
export const changeLocale = (
  runtime as unknown as { setLocale: (locale: Lang) => void }
).setLocale
