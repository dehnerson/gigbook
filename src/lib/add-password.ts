export const ADD_PASSWORD_SECRET = '__gigbookAddPasswordSecret'

export function saveAddPasswordSecret(secret: string) {
  localStorage.setItem(ADD_PASSWORD_SECRET, secret)
}

export function readAddPasswordSecret() {
  return localStorage.getItem(ADD_PASSWORD_SECRET)
}

export function clearAddPasswordSecret() {
  localStorage.removeItem(ADD_PASSWORD_SECRET)
}
