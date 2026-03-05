/**
 * FAMI INTEGRA - Motore di Matching
 * 
 * Matching Alloggi: per un beneficiario, suggerisce alloggi dove:
 * - N_Vani >= N_Componenti_Nucleo * 0.5 (1 vano per 2 persone)
 * - Stesso Comune preferenziale
 * - Stato = Disponibile
 * Score: 100% match perfetto, penalità per comune diverso
 *
 * Matching Aziende: suggerisce per:
 * - Area_Intervento contiene LAVORATIVO
 * - Disponibile = S
 * - Stesso Comune preferenziale
 * - Score basato su competenze
 */

function scoreAlloggio(beneficiario, alloggio) {
  let score = 0;
  const maxScore = 100;

  // Requisito minimo: vani sufficienti
  const vaniNecessari = Math.ceil(beneficiario.n_componenti_nucleo * 0.5);
  if (alloggio.n_vani < vaniNecessari) return { score: 0, motivo: 'Vani insufficienti', compatibile: false };

  // Vani adeguati: +40 punti
  score += 40;
  // Bonus se vani == necessari (match esatto)
  if (alloggio.n_vani === vaniNecessari) score += 10;
  // Leggera penalità se troppi vani (spreco)
  if (alloggio.n_vani > vaniNecessari + 2) score -= 5;

  // Comune: +30 punti se stesso
  const stessoComune = beneficiario.comune && alloggio.comune &&
    beneficiario.comune.toUpperCase().trim() === alloggio.comune.toUpperCase().trim();
  if (stessoComune) {
    score += 30;
  } else {
    score += 5; // comune diverso, punteggio minimo
  }

  // Disponibilità: +20 punti se disponibile subito o prima della data uscita
  if (alloggio.stato === 'Disponibile') {
    score += 10;
    if (beneficiario.data_uscita_sai && alloggio.disponibile_da) {
      const uscita = new Date(beneficiario.data_uscita_sai);
      const disponibile = new Date(alloggio.disponibile_da);
      if (disponibile <= uscita) score += 10;
    } else {
      score += 5;
    }
  }

  // Tipologia adeguata al nucleo
  if (beneficiario.n_componenti_nucleo >= 4 && ['Appartamento', 'Casa indipendente'].includes(alloggio.tipologia)) {
    score += 10;
  } else if (beneficiario.n_componenti_nucleo <= 2 && ['Monolocale', 'Bilocale', 'Stanza singola'].includes(alloggio.tipologia)) {
    score += 10;
  } else {
    score += 5;
  }

  return {
    score: Math.min(score, maxScore),
    compatibile: true,
    stessoComune,
    vaniNecessari,
    dettagli: {
      punteggioVani: alloggio.n_vani >= vaniNecessari ? 'Adeguato' : 'Insufficiente',
      punteggioComune: stessoComune ? 'Stesso comune' : 'Comune diverso',
      punteggioTipologia: 'Calcolato'
    }
  };
}

function scoreAzienda(beneficiario, azienda) {
  let score = 0;
  const maxScore = 100;

  // Area intervento deve contenere LAVORATIVO
  if (!beneficiario.area_intervento || !beneficiario.area_intervento.toUpperCase().includes('LAVORATIVO')) {
    return { score: 0, motivo: 'Beneficiario non cerca lavoro', compatibile: false };
  }

  // Azienda disponibile
  if (azienda.disponibile !== 'S') {
    return { score: 0, motivo: 'Azienda non disponibile', compatibile: false };
  }

  // Base: azienda disponibile +20
  score += 20;

  // Comune: +30 punti se stesso
  const stessoComune = beneficiario.comune && azienda.comune &&
    beneficiario.comune.toUpperCase().trim() === azienda.comune.toUpperCase().trim();
  if (stessoComune) score += 30;
  else score += 5;

  // Competenze matching: +30 punti
  if (beneficiario.competenze && azienda.mansione_profilo) {
    const compBen = beneficiario.competenze.toLowerCase().split(/[,;\/\s]+/).filter(Boolean);
    const compAz = azienda.mansione_profilo.toLowerCase() + ' ' + (azienda.settore || '').toLowerCase();
    let matchCount = 0;
    compBen.forEach(comp => {
      if (comp.length > 2 && compAz.includes(comp)) matchCount++;
    });
    if (matchCount > 0) score += Math.min(30, matchCount * 15);
  }

  // Tirocinio disponibile: +10 punti (ideale per inserimento)
  if (azienda.tirocinio === 'S') score += 10;

  // Orario: +10 punti (full-time preferito per autonomia)
  if (azienda.orario === 'Full-time') score += 10;
  else if (azienda.orario === 'Part-time') score += 5;

  return {
    score: Math.min(score, maxScore),
    compatibile: true,
    stessoComune,
    dettagli: {
      punteggioComune: stessoComune ? 'Stesso comune' : 'Comune diverso',
      punteggioCompetenze: 'Calcolato',
      tirocinio: azienda.tirocinio === 'S' ? 'Disponibile' : 'Non disponibile'
    }
  };
}

function suggerisciAlloggi(beneficiario, alloggiDisponibili) {
  const risultati = alloggiDisponibili
    .map(alloggio => ({
      alloggio,
      ...scoreAlloggio(beneficiario, alloggio)
    }))
    .filter(r => r.compatibile)
    .sort((a, b) => b.score - a.score);

  return risultati;
}

function suggerisciAziende(beneficiario, aziendeDisponibili) {
  const risultati = aziendeDisponibili
    .map(azienda => ({
      azienda,
      ...scoreAzienda(beneficiario, azienda)
    }))
    .filter(r => r.compatibile)
    .sort((a, b) => b.score - a.score);

  return risultati;
}

module.exports = { scoreAlloggio, scoreAzienda, suggerisciAlloggi, suggerisciAziende };
