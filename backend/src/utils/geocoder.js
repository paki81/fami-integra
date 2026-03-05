const https = require('https');

/**
 * Geocoding tramite Nominatim (OpenStreetMap) - gratuito, no API key
 * Rate limit: max 1 request/secondo
 * Fallback progressivo: indirizzo+comune → solo comune
 */
function nominatimSearch(query) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=it`;
    const options = {
      headers: { 'User-Agent': 'FAMI-INTEGRA/1.0 (fami-integra@aswell.eu)' }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({
              lat: parseFloat(results[0].lat),
              lng: parseFloat(results[0].lon),
              display_name: results[0].display_name
            });
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function geocodeAddress(indirizzo, comune) {
  // Tentativo 1: indirizzo completo + comune
  if (indirizzo) {
    const r1 = await nominatimSearch(`${indirizzo}, ${comune}, Italia`);
    if (r1) return r1;
    // Rispetta rate limit Nominatim
    await delay(1100);
  }

  // Tentativo 2: solo via (senza numero civico) + comune
  if (indirizzo) {
    const viaSenza = indirizzo.replace(/[,]?\s*\d+\s*\/?[a-zA-Z]?\s*$/,'').trim();
    if (viaSenza !== indirizzo) {
      const r2 = await nominatimSearch(`${viaSenza}, ${comune}, Italia`);
      if (r2) return r2;
      await delay(1100);
    }
  }

  // Tentativo 3: solo comune
  const r3 = await nominatimSearch(`${comune}, Italia`);
  return r3;
}

module.exports = { geocodeAddress };
