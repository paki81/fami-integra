const https = require('https');

/**
 * Geocoding tramite Nominatim (OpenStreetMap) - gratuito, no API key
 * Rate limit: max 1 request/secondo
 */
function geocodeAddress(indirizzo, comune) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(`${indirizzo}, ${comune}, Italia`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=it`;

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

module.exports = { geocodeAddress };
