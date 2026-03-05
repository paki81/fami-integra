const { scoreAlloggio, scoreAzienda, suggerisciAlloggi, suggerisciAziende } = require('../src/services/matchingEngine');

describe('Matching Engine - Alloggi', () => {
  const beneficiarioNucleo = {
    id: 1, cognome: 'KHAN', nome: 'FATIMA', n_componenti_nucleo: 4,
    comune: 'CASERTA', area_intervento: 'LAVORATIVO-ALLOGGIO',
    data_uscita_sai: '2026-05-01', competenze: 'Sartoria, pulizie'
  };

  const beneficiarioSingolo = {
    id: 2, cognome: 'AHMED', nome: 'HASSAN', n_componenti_nucleo: 1,
    comune: 'CASERTA', area_intervento: 'LAVORATIVO-ALLOGGIO',
    data_uscita_sai: '2026-04-01', competenze: 'Ristorazione, cucina'
  };

  const alloggiDisponibili = [
    { id: 1, id_alloggio: 'ALG01', comune: 'CASERTA', tipologia: 'Bilocale', n_vani: 3, canone_mensile: 400, stato: 'Disponibile', disponibile_da: '2026-03-01' },
    { id: 2, id_alloggio: 'ALG02', comune: 'CASERTA', tipologia: 'Monolocale', n_vani: 2, canone_mensile: 300, stato: 'Disponibile', disponibile_da: '2026-03-15' },
    { id: 3, id_alloggio: 'ALG03', comune: 'NAPOLI', tipologia: 'Appartamento', n_vani: 4, canone_mensile: 550, stato: 'Disponibile', disponibile_da: '2026-04-01' },
    { id: 4, id_alloggio: 'ALG04', comune: 'CASERTA', tipologia: 'Appartamento', n_vani: 4, canone_mensile: 480, stato: 'Disponibile', disponibile_da: '2026-05-01' },
    { id: 5, id_alloggio: 'ALG06', comune: 'CASERTA', tipologia: 'Stanza singola', n_vani: 1, canone_mensile: 200, stato: 'Disponibile', disponibile_da: '2026-03-01' },
  ];

  test('Nucleo 4 persone necessita almeno 2 vani', () => {
    const result = scoreAlloggio(beneficiarioNucleo, alloggiDisponibili[0]);
    expect(result.compatibile).toBe(true);
    expect(result.vaniNecessari).toBe(2);
    expect(result.score).toBeGreaterThan(0);
  });

  test('Stanza singola (1 vano) insufficiente per nucleo 4', () => {
    const result = scoreAlloggio(beneficiarioNucleo, alloggiDisponibili[4]);
    expect(result.compatibile).toBe(false);
    expect(result.score).toBe(0);
  });

  test('Stesso comune dà punteggio più alto', () => {
    const scoreCaserta = scoreAlloggio(beneficiarioNucleo, alloggiDisponibili[0]);
    const scoreNapoli = scoreAlloggio(beneficiarioNucleo, alloggiDisponibili[2]);
    expect(scoreCaserta.score).toBeGreaterThan(scoreNapoli.score);
    expect(scoreCaserta.stessoComune).toBe(true);
    expect(scoreNapoli.stessoComune).toBe(false);
  });

  test('Singolo può stare in monolocale', () => {
    const result = scoreAlloggio(beneficiarioSingolo, alloggiDisponibili[1]);
    expect(result.compatibile).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  test('suggerisciAlloggi ordina per score decrescente', () => {
    const risultati = suggerisciAlloggi(beneficiarioNucleo, alloggiDisponibili);
    expect(risultati.length).toBeGreaterThan(0);
    for (let i = 1; i < risultati.length; i++) {
      expect(risultati[i - 1].score).toBeGreaterThanOrEqual(risultati[i].score);
    }
  });

  test('suggerisciAlloggi esclude alloggi con vani insufficienti', () => {
    const risultati = suggerisciAlloggi(beneficiarioNucleo, alloggiDisponibili);
    risultati.forEach(r => {
      expect(r.alloggio.n_vani).toBeGreaterThanOrEqual(r.vaniNecessari);
    });
  });
});

describe('Matching Engine - Aziende', () => {
  const beneficiarioLavorativo = {
    id: 1, cognome: 'AHMED', nome: 'HASSAN', n_componenti_nucleo: 1,
    comune: 'CASERTA', area_intervento: 'LAVORATIVO-ALLOGGIO',
    competenze: 'Ristorazione, cucina'
  };

  const beneficiarioSoloAlloggio = {
    id: 3, cognome: 'DIALLO', nome: 'MAMADOU', n_componenti_nucleo: 1,
    comune: 'NAPOLI', area_intervento: 'ALLOGGIO',
    competenze: 'Magazziniere'
  };

  const aziendeDisponibili = [
    { id: 1, id_azienda: 'AZ001', nome_azienda: 'Ristorante Da Giovanni', settore: 'Ristorazione', mansione_profilo: 'Aiuto cuoco / Lavapiatti', comune: 'CASERTA', disponibile: 'S', tirocinio: 'S', orario: 'Full-time' },
    { id: 2, id_azienda: 'AZ003', nome_azienda: 'Edil Casa', settore: 'Edilizia', mansione_profilo: 'Manovale / Operaio edile', comune: 'CASERTA', disponibile: 'S', tirocinio: 'N', orario: 'Full-time' },
    { id: 3, id_azienda: 'AZ004', nome_azienda: 'Clean Service', settore: 'Pulizie', mansione_profilo: 'Addetto/a pulizie', comune: 'NAPOLI', disponibile: 'S', tirocinio: 'S', orario: 'Part-time' },
    { id: 4, id_azienda: 'AZ008', nome_azienda: 'SuperMarket', settore: 'Commercio', mansione_profilo: 'Scaffalista', comune: 'CASERTA', disponibile: 'N', tirocinio: 'N', orario: 'Part-time' },
  ];

  test('Beneficiario con area LAVORATIVO è compatibile', () => {
    const result = scoreAzienda(beneficiarioLavorativo, aziendeDisponibili[0]);
    expect(result.compatibile).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  test('Beneficiario solo ALLOGGIO non è compatibile per lavoro', () => {
    const result = scoreAzienda(beneficiarioSoloAlloggio, aziendeDisponibili[0]);
    expect(result.compatibile).toBe(false);
  });

  test('Azienda non disponibile viene esclusa', () => {
    const result = scoreAzienda(beneficiarioLavorativo, aziendeDisponibili[3]);
    expect(result.compatibile).toBe(false);
  });

  test('Competenze ristorazione matchano ristorante', () => {
    const scoreRistorante = scoreAzienda(beneficiarioLavorativo, aziendeDisponibili[0]);
    const scoreEdilizia = scoreAzienda(beneficiarioLavorativo, aziendeDisponibili[1]);
    expect(scoreRistorante.score).toBeGreaterThan(scoreEdilizia.score);
  });

  test('Stesso comune dà punteggio più alto', () => {
    const scoreCaserta = scoreAzienda(beneficiarioLavorativo, aziendeDisponibili[0]);
    const scoreNapoli = scoreAzienda(beneficiarioLavorativo, aziendeDisponibili[2]);
    expect(scoreCaserta.stessoComune).toBe(true);
    expect(scoreNapoli.stessoComune).toBe(false);
  });

  test('suggerisciAziende ordina per score e filtra', () => {
    const risultati = suggerisciAziende(beneficiarioLavorativo, aziendeDisponibili);
    expect(risultati.length).toBeGreaterThan(0);
    risultati.forEach(r => expect(r.compatibile).toBe(true));
    for (let i = 1; i < risultati.length; i++) {
      expect(risultati[i - 1].score).toBeGreaterThanOrEqual(risultati[i].score);
    }
  });
});
