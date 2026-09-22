// moduloParser.ts
// Estrae i dati dal "modulo tesseramento" scritto nel topic del gruppo.
// Formato atteso (case-insensitive, tollerante a spazi):
// Propagandista: [nome]
// Cittadino: [nome]
// Lavoro: [testo]
// Telegram: [@username oppure "no"]
// Discord: [username oppure "no"]

export interface ModuloParsato {
  propagandista: string;
  cittadino: string;
  lavoro: string;
  telegram: string;
  discord: string;
  contaStipendio: boolean;
}

const CAMPI = {
  propagandista: /propagandista\s*:\s*(.+)/i,
  cittadino: /cittadino\s*:\s*(.+)/i,
  lavoro: /lavoro\s*:\s*(.+)/i,
  telegram: /telegram\s*:\s*(.+)/i,
  discord: /discord\s*:\s*(.+)/i,
};

// Un messaggio è considerato un "modulo" se contiene almeno propagandista e cittadino
export function isModulo(testo: string): boolean {
  return CAMPI.propagandista.test(testo) && CAMPI.cittadino.test(testo);
}

export function parseModulo(testo: string): ModuloParsato | null {
  if (!isModulo(testo)) return null;

  const estrai = (regex: RegExp): string => {
    const match = testo.match(regex);
    return match ? match[1].trim().split("\n")[0].trim() : "";
  };

  const telegram = estrai(CAMPI.telegram);

  return {
    propagandista: estrai(CAMPI.propagandista),
    cittadino: estrai(CAMPI.cittadino),
    lavoro: estrai(CAMPI.lavoro),
    telegram,
    discord: estrai(CAMPI.discord),
    // Conta per lo stipendio solo se il campo telegram contiene una @ (username reale)
    contaStipendio: telegram.includes("@"),
  };
}
