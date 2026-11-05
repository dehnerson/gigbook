const DARK = {
  colorPrimary: '#f2b33d',
  colorTextOnPrimaryBackground: '#1c1406',
  colorBackground: '#1b1d26',
  colorInputBackground: '#23252f',
  colorText: '#f3f4f7',
  colorTextSecondary: '#a4a7b3',
  colorInputText: '#f3f4f7',
  colorNeutral: '#f3f4f7',
  colorDanger: '#f0605a',
  colorSuccess: '#4cc38a',
}

const LIGHT = {
  colorPrimary: '#d9861c',
  colorTextOnPrimaryBackground: '#1c1406',
  colorBackground: '#ffffff',
  colorInputBackground: '#ffffff',
  colorText: '#24262f',
  colorTextSecondary: '#6b6f7d',
  colorInputText: '#24262f',
  colorNeutral: '#24262f',
  colorDanger: '#d93a33',
  colorSuccess: '#1f9a5c',
}

export function clerkAppearance(dark: boolean) {
  return {
    variables: {
      ...(dark ? DARK : LIGHT),
      borderRadius: '0.75rem',
      fontFamily: 'inherit',
    },
    elements: {
      cardBox: 'shadow-none border border-border',
      footer: 'bg-none',
    },
  }
}
