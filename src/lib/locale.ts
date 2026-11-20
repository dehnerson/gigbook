import { getLocale, setLocale } from '@/paraglide/runtime'

export type Lang = 'en' | 'de'

export function currentLocale(): Lang {
  return getLocale() === 'de' ? 'de' : 'en'
}

export function changeLocale(locale: Lang) {
  return setLocale(locale)
}
