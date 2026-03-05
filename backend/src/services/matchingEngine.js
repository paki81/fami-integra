/**
 * FAMI INTEGRA - Motore di Matching
 * 
 * Matching Alloggi: score basato su vani, distanza stradale (OSRM), canone/budget,
 * disponibilità temporale, tipologia nucleo.
 *
 * Matching Aziende: score basato su distanza stradale, competenze, tirocinio, orario.
 *
 * Le funzioni suggerisci* sono ASINCRONE perché chiamano OSRM per la distanza.
 */

const https = require('https');
const http = require('http');

// --- Distanza stradale via OSRM (gratuito, nessuna API key) ---
function calcolaDistanzaStradaleOSRM(lat1, lon1, lat2, lon2) {
  return new Promise((resolve) => {
    const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
            resolve({
              distanzaKm: Math.round(json.routes[0].distance / 100) / 10,
              durataMin: Math.round(json.routes[0].duration / 60)
            });
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// Fallback: distanza in linea d'aria (Haversine)
function distanzaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Calcola distanza con OSRM, fallback Haversine * 1.3
async function calcolaDistanza(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const osrm = await calcolaDistanzaStradaleOSRM(lat1, lon1, lat2, lon2);
  if (osrm) return osrm;
  const lineare = distanzaHaversine(lat1, lon1, lat2, lon2);
  return { distanzaKm: Math.round(lineare * 13) / 10, durataMin: Math.round(lineare * 1.5) };
}

// Punteggio distanza: 0 km = max punti, >50 km = 0 punti
function punteggioDistanza(distanzaKm, maxPunti) {
  if (distanzaKm === null || distanzaKm === undefined) return maxPunti * 0.3;
  if (distanzaKm <= 5) return maxPunti;
  if (distanzaKm <= 10) return maxPunti * 0.85;
  if (distanzaKm <= 20) return maxPunti * 0.65;
  if (distanzaKm <= 30) return maxPunti * 0.4;
  if (distanzaKm <= 50) return maxPunti * 0.2;
  return 0;
}

// --- Score Alloggio ---
async function scoreAlloggio(beneficiario, alloggio) {
  let score = 0;
  const maxScore = 100;

  // Requisito minimo: vani sufficienti
  const vaniNecessari = Math.ceil(beneficiario.n_componenti_nucleo * 0.5);
  if (alloggio.n_vani < vaniNecessari) return { score: 0, motivo: 'Vani insufficienti', compatibile: false };

  // Vani adeguati: +30 punti
  score += 30;
  if (alloggio.n_vani === vaniNecessari) score += 5;
  if (alloggio.n_vani > vaniNecessari + 2) score -= 5;

  // Distanza stradale: fino a +25 punti
  const dist = await calcolaDistanza(
    beneficiario.latitudine, beneficiario.longitudine,
    alloggio.latitudine, alloggio.longitudine
  );
  const distKm = dist ? dist.distanzaKm : null;
  const durataMin = dist ? dist.durataMin : null;
  const stessoComune = beneficiario.comune && alloggio.comune &&
    beneficiario.comune.toUpperCase().trim() === alloggio.comune.toUpperCase().trim();
  score += Math.round(punteggioDistanza(distKm, 25));

  // Canone/Budget: fino a +15 punti
  let canoneOk = null;
  if (alloggio.canone_mensile && beneficiario.budget_alloggio) {
    if (alloggio.canone_mensile <= beneficiario.budget_alloggio) {
      score += 15;
      canoneOk = true;
    } else if (alloggio.canone_mensile <= beneficiario.budget_alloggio * 1.2) {
      score += 8;
      canoneOk = 'parziale';
    } else {
      canoneOk = false;
    }
  } else {
    score += 5;
  }

  // Disponibilità temporale: +15 punti
  if (alloggio.stato === 'Disponibile') {
    score += 8;
    if (beneficiario.data_uscita_sai && alloggio.disponibile_da) {
      const uscita = new Date(beneficiario.data_uscita_sai);
      const disponibile = new Date(alloggio.disponibile_da);
      if (disponibile <= uscita) score += 7;
    } else {
      score += 3;
    }
  }

  // Tipologia adeguata al nucleo: +10 punti
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
    distanzaKm: distKm,
    durataMin,
    canoneOk,
    vaniNecessari,
    dettagli: {
      punteggioVani: alloggio.n_vani >= vaniNecessari ? 'Adeguato' : 'Insufficiente',
      punteggioDistanza: distKm !== null ? `${distKm} km` : 'Non calcolabile',
      punteggioBudget: canoneOk === true ? 'Nel budget' : canoneOk === 'parziale' ? 'Leggermente sopra' : canoneOk === false ? 'Fuori budget' : 'Budget non impostato',
      punteggioTipologia: 'Calcolato'
    }
  };
}

// --- Score Azienda ---
async function scoreAzienda(beneficiario, azienda) {
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

  // Base: azienda disponibile +15
  score += 15;

  // Distanza stradale: fino a +25 punti
  const dist = await calcolaDistanza(
    beneficiario.latitudine, beneficiario.longitudine,
    azienda.latitudine, azienda.longitudine
  );
  const distKm = dist ? dist.distanzaKm : null;
  const durataMin = dist ? dist.durataMin : null;
  const stessoComune = beneficiario.comune && azienda.comune &&
    beneficiario.comune.toUpperCase().trim() === azienda.comune.toUpperCase().trim();
  score += Math.round(punteggioDistanza(distKm, 25));

  // Competenze matching: +30 punti
  let matchCompetenze = 0;
  if (beneficiario.competenze && azienda.mansione_profilo) {
    const compBen = beneficiario.competenze.toLowerCase().split(/[,;\/\s]+/).filter(Boolean);
    const compAz = azienda.mansione_profilo.toLowerCase() + ' ' + (azienda.settore || '').toLowerCase();
    compBen.forEach(comp => {
      if (comp.length > 2 && compAz.includes(comp)) matchCompetenze++;
    });
    if (matchCompetenze > 0) score += Math.min(30, matchCompetenze * 15);
  }

  // Tirocinio disponibile: +10 punti
  if (azienda.tirocinio === 'S') score += 10;

  // Orario: +10 punti
  if (azienda.orario === 'Full-time') score += 10;
  else if (azienda.orario === 'Part-time') score += 5;

  return {
    score: Math.min(score, maxScore),
    compatibile: true,
    stessoComune,
    distanzaKm: distKm,
    durataMin,
    dettagli: {
      punteggioDistanza: distKm !== null ? `${distKm} km` : 'Non calcolabile',
      punteggioCompetenze: matchCompetenze > 0 ? `${matchCompetenze} match` : 'Nessun match',
      tirocinio: azienda.tirocinio === 'S' ? 'Disponibile' : 'Non disponibile'
    }
  };
}

// --- Funzioni suggerimento (ASINCRONE) ---
async function suggerisciAlloggi(beneficiario, alloggiDisponibili) {
  const promises = alloggiDisponibili.map(async alloggio => ({
    alloggio,
    ...(await scoreAlloggio(beneficiario, alloggio))
  }));
  const risultati = await Promise.all(promises);
  return risultati.filter(r => r.compatibile).sort((a, b) => b.score - a.score);
}

async function suggerisciAziende(beneficiario, aziendeDisponibili) {
  const promises = aziendeDisponibili.map(async azienda => ({
    azienda,
    ...(await scoreAzienda(beneficiario, azienda))
  }));
  const risultati = await Promise.all(promises);
  return risultati.filter(r => r.compatibile).sort((a, b) => b.score - a.score);
}

module.exports = { scoreAlloggio, scoreAzienda, suggerisciAlloggi, suggerisciAziende };
