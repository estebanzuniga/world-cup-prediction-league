const EN_TO_ES: Record<string, string> = {
  // Group A
  Mexico:        'México',
  'South Africa': 'Sudáfrica',
  'South Korea':  'Corea del Sur',
  Czechia:        'Chequia',
  // Group B
  Canada:                    'Canadá',
  'Bosnia and Herzegovina':  'Bosnia y Herzegovina',
  Qatar:                     'Qatar',
  Switzerland:               'Suiza',
  // Group C
  Brazil:   'Brasil',
  Morocco:  'Marruecos',
  Haiti:    'Haití',
  Scotland: 'Escocia',
  // Group D
  'United States': 'Estados Unidos',
  Paraguay:        'Paraguay',
  Australia:       'Australia',
  Türkiye:         'Turquía',
  // Group E
  Germany:      'Alemania',
  'Curaçao':    'Curazao',
  'Ivory Coast': 'Costa de Marfil',
  Ecuador:      'Ecuador',
  // Group F
  Netherlands: 'Países Bajos',
  Japan:       'Japón',
  Sweden:      'Suecia',
  Tunisia:     'Túnez',
  // Group G
  Belgium:      'Bélgica',
  Egypt:        'Egipto',
  Iran:         'Irán',
  'New Zealand': 'Nueva Zelanda',
  // Group H
  Spain:          'España',
  'Cape Verde':   'Cabo Verde',
  'Saudi Arabia': 'Arabia Saudita',
  Uruguay:        'Uruguay',
  // Group I
  France:  'Francia',
  Senegal: 'Senegal',
  Iraq:    'Irak',
  Norway:  'Noruega',
  // Group J
  Argentina: 'Argentina',
  Algeria:   'Argelia',
  Austria:   'Austria',
  Jordan:    'Jordania',
  // Group K
  Portugal:   'Portugal',
  'DR Congo': 'RD Congo',
  Colombia:   'Colombia',
  Uzbekistan: 'Uzbekistán',
  // Group L
  England:  'Inglaterra',
  Croatia:  'Croacia',
  Ghana:    'Ghana',
  Panama:   'Panamá',
}

export function toSpanish(name: string): string {
  return EN_TO_ES[name] ?? name
}
