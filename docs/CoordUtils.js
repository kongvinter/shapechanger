// CoordUtils.js
// Converte string DMS (“12°34′56″”) em decimal
function dmsToDecimal(dmsStr) {
  const parts = dmsStr.match(/(\d+)[°º]\s*(\d+)[′']\s*([\d.]+)[″"]?/);
  if (!parts) throw new Error('DMS inválido');
  const [, deg, min, sec] = parts.map(Number);
  return deg + min/60 + sec/3600;
}

// Converte decimal em “12°34′56.78″”
function decimalToDMS(dec, isLon) {
  const sign = dec < 0 ? -1 : 1;
  dec = Math.abs(dec);
  const deg = Math.floor(dec);
  const min = Math.floor((dec - deg) * 60);
  const sec = ((dec - deg) * 60 - min) * 60;
  return `${sign*deg}°${min}′${sec.toFixed(2)}″`;
}

// Para UTM⇄Geográfico você pode usar a biblioteca proj4.js:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.8.0/proj4.js"></script>
function utmToGeographic(easting, northing, zone) {
  const projStr = `+proj=utm +zone=${zone} +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
  const [lon, lat] = proj4(projStr, 'EPSG:4326', [easting, northing]);
  return { latitude: lat, longitude: lon };
}

function geographicToUTM(lat, lon) {
  // detecta zona por longitude
  const zone = Math.floor((lon + 180)/6) + 1;
  const projStr = `+proj=utm +zone=${zone} +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
  const [easting, northing] = proj4('EPSG:4326', projStr, [lon, lat]);
  return { easting, northing, zone };
}

// Exponha no escopo global:
window.CoordUtils = { dmsToDecimal, decimalToDMS, utmToGeographic, geographicToUTM };
