const https = require('https');

/**
 * Geocoding con Photon (Komoot) - gratuito, basato su OSM, no rate limit aggressivo
 * Fallback a Nominatim se Photon non risponde
 * Fallback progressivo: indirizzo+comune → via senza civico+comune → solo comune
 */

const delay = (ms) => new Promise(r => setTimeout(r, ms));

function photonSearch(query) {
  return new Promise((resolve) => {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.features && json.features.length > 0) {
            const coords = json.features[0].geometry.coordinates;
            const props = json.features[0].properties || {};
            resolve({
              lat: coords[1],
              lng: coords[0],
              display_name: [props.name, props.street, props.city, props.county, props.state].filter(Boolean).join(', ')
            });
          } else { resolve(null); }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null))
      .on('timeout', function() { this.destroy(); resolve(null); });
  });
}

function nominatimSearch(query) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=it`;
    const options = { headers: { 'User-Agent': 'FAMI-INTEGRA/1.0 (fami-integra@aswell.eu)' }, timeout: 8000 };
    https.get(url, options, (res) => {
      if (res.statusCode === 429) { resolve(null); return; }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), display_name: results[0].display_name });
          } else { resolve(null); }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null))
      .on('timeout', function() { this.destroy(); resolve(null); });
  });
}

async function searchWithFallback(query) {
  // Prova Photon prima, poi Nominatim
  const r = await photonSearch(query);
  if (r) return r;
  await delay(1100);
  return await nominatimSearch(query);
}

async function geocodeAddress(indirizzo, comune) {
  // Step 0: geocodifica il comune per ottenere coordinate di riferimento
  // (Photon puo' essere irraggiungibile: fallback su Nominatim)
  const comuneRef = await searchWithFallback(`${comune}, Italia`);
  const comuneLat = comuneRef ? comuneRef.lat : null;
  const comuneLng = comuneRef ? comuneRef.lng : null;
  await delay(300);

  // Prova una query a livello stradale su entrambi i provider (Photon biased -> Nominatim)
  // e accetta solo risultati vicini al comune di riferimento.
  const tryQuery = async (q) => {
    const rp = await photonSearchBiased(q, comuneLat, comuneLng);
    if (rp && isNearComune(rp, comuneLat, comuneLng)) return rp;
    await delay(1100);
    const rn = await nominatimSearch(q);
    if (rn && isNearComune(rn, comuneLat, comuneLng)) return rn;
    return null;
  };

  // Tentativo 1: indirizzo completo + comune
  if (indirizzo) {
    const r1 = await tryQuery(`${indirizzo}, ${comune}, Italia`);
    if (r1) return r1;
    await delay(300);
  }

  // Tentativo 2: solo via (senza numero civico) + comune
  if (indirizzo) {
    const viaSenza = indirizzo.replace(/[,]?\s*(N\.?\s*)?\d+\s*\/?[a-zA-Z]?\s*$/i,'').trim();
    if (viaSenza && viaSenza !== indirizzo) {
      const r2 = await tryQuery(`${viaSenza}, ${comune}, Italia`);
      if (r2) return r2;
      await delay(300);
    }
  }

  // Tentativo 3: restituisci le coordinate del comune
  if (comuneRef) return comuneRef;

  // Tentativo 4: fallback Nominatim sul solo comune
  return await nominatimSearch(`${comune}, Italia`);
}

function photonSearchBiased(query, lat, lng) {
  if (lat && lng) {
    return new Promise((resolve) => {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=${lat}&lon=${lng}`;
      https.get(url, { timeout: 8000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.features && json.features.length > 0) {
              // Scegli il risultato più vicino al comune
              let best = null, bestDist = Infinity;
              for (const f of json.features) {
                const c = f.geometry.coordinates;
                const d = Math.sqrt(Math.pow(c[1] - lat, 2) + Math.pow(c[0] - lng, 2));
                if (d < bestDist) { bestDist = d; best = f; }
              }
              if (best) {
                const coords = best.geometry.coordinates;
                const props = best.properties || {};
                resolve({
                  lat: coords[1], lng: coords[0],
                  display_name: [props.name, props.street, props.city, props.county, props.state].filter(Boolean).join(', ')
                });
              } else { resolve(null); }
            } else { resolve(null); }
          } catch { resolve(null); }
        });
      }).on('error', () => resolve(null))
        .on('timeout', function() { this.destroy(); resolve(null); });
    });
  }
  return photonSearch(query);
}

function isNearComune(result, comuneLat, comuneLng) {
  if (!comuneLat || !comuneLng) return true;
  // Tolleranza ~30km (circa 0.3 gradi)
  const dist = Math.sqrt(Math.pow(result.lat - comuneLat, 2) + Math.pow(result.lng - comuneLng, 2));
  return dist < 0.3;
}

module.exports = { geocodeAddress };
