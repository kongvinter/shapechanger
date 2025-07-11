// CoordUtils.js - Coordinate Conversion Utilities

// Converte string DMS para decimal
function dmsToDecimal(dmsStr) {
  if (!dmsStr || typeof dmsStr !== 'string') {
    throw new Error('String DMS inválida');
  }
  
  // Remove espaços e normaliza
  const cleaned = dmsStr.trim().replace(/\s+/g, '');
  
  // Regex mais robusta para DMS
  const patterns = [
    // Padrão: 12°34'56.78"S ou 12°34'56.78"
    /^([+-]?\d{1,3})[°º]\s*(\d{1,2})[′']\s*([\d.]+)[″"]?\s*([NSEW])?$/i,
    // Padrão: 12 34 56.78 S
    /^([+-]?\d{1,3})\s+(\d{1,2})\s+([\d.]+)\s*([NSEW])?$/i,
    // Padrão: 12:34:56.78
    /^([+-]?\d{1,3}):(\d{1,2}):([\d.]+)$/,
    // Padrão simples: apenas graus
    /^([+-]?\d{1,3}(?:\.\d+)?)[°º]?\s*([NSEW])?$/i
  ];
  
  let match = null;
  for (const pattern of patterns) {
    match = cleaned.match(pattern);
    if (match) break;
  }
  
  if (!match) {
    throw new Error('Formato DMS não reconhecido. Use formatos como: 25°30\'45"S, 25 30 45.5 S, ou 25:30:45.5');
  }
  
  let [, degStr, minStr = '0', secStr = '0', hemisphere = ''] = match;
  
  const deg = Math.abs(parseFloat(degStr));
  const min = parseFloat(minStr);
  const sec = parseFloat(secStr);
  
  // Validações
  if (deg > 180) throw new Error('Graus não podem ser maiores que 180');
  if (min >= 60) throw new Error('Minutos devem ser menores que 60');
  if (sec >= 60) throw new Error('Segundos devem ser menores que 60');
  
  let decimal = deg + min/60 + sec/3600;
  
  // Aplicar sinal baseado no hemisfério ou sinal original
  if (hemisphere.toUpperCase() === 'S' || hemisphere.toUpperCase() === 'W' || degStr.startsWith('-')) {
    decimal = -decimal;
  }
  
  return decimal;
}

// Converte decimal para DMS
function decimalToDMS(decimal, isLongitude = false) {
  if (typeof decimal !== 'number' || isNaN(decimal)) {
    throw new Error('Coordenada decimal inválida');
  }
  
  const absDecimal = Math.abs(decimal);
  const degrees = Math.floor(absDecimal);
  const minutesFloat = (absDecimal - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  
  // Determinar hemisfério
  let hemisphere;
  if (isLongitude) {
    hemisphere = decimal >= 0 ? 'E' : 'W';
  } else {
    hemisphere = decimal >= 0 ? 'N' : 'S';
  }
  
  return `${degrees}°${minutes.toString().padStart(2, '0')}′${seconds.toFixed(2).padStart(5, '0')}″${hemisphere}`;
}

// Converte UTM para coordenadas geográficas
function utmToGeographic(easting, northing, zone) {
  if (!window.proj4) {
    throw new Error('Biblioteca proj4 não encontrada. Certifique-se de que está carregada.');
  }
  
  if (typeof easting !== 'number' || typeof northing !== 'number' || typeof zone !== 'number') {
    throw new Error('Parâmetros UTM devem ser números válidos');
  }
  
  // Validações básicas UTM
  if (easting < 100000 || easting > 900000) {
    throw new Error('Easting fora do intervalo válido (100000-900000)');
  }
  if (northing < 0 || northing > 10000000) {
    throw new Error('Northing fora do intervalo válido (0-10000000)');
  }
  if (zone < 1 || zone > 60) {
    throw new Error('Zona UTM deve estar entre 1 e 60');
  }
  
  try {
    const projString = `+proj=utm +zone=${zone} +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
    const [longitude, latitude] = proj4(projString, 'EPSG:4326', [easting, northing]);
    
    return { 
      latitude: latitude, 
      longitude: longitude 
    };
  } catch (error) {
    throw new Error(`Erro na conversão UTM para geográfica: ${error.message}`);
  }
}

// Converte coordenadas geográficas para UTM
function geographicToUTM(latitude, longitude) {
  if (!window.proj4) {
    throw new Error('Biblioteca proj4 não encontrada. Certifique-se de que está carregada.');
  }
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Latitude e longitude devem ser números válidos');
  }
  
  // Validações básicas
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude deve estar entre -90 e 90 graus');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude deve estar entre -180 e 180 graus');
  }
  
  try {
    // Calcular zona UTM baseada na longitude
    let zone = Math.floor((longitude + 180) / 6) + 1;
    
    // Ajustes especiais para o Brasil
    if (longitude >= -84 && longitude < -78) zone = 18;
    else if (longitude >= -78 && longitude < -72) zone = 19;
    else if (longitude >= -72 && longitude < -66) zone = 20;
    else if (longitude >= -66 && longitude < -60) zone = 21;
    else if (longitude >= -60 && longitude < -54) zone = 22;
    else if (longitude >= -54 && longitude < -48) zone = 23;
    else if (longitude >= -48 && longitude < -42) zone = 24;
    else if (longitude >= -42 && longitude < -36) zone = 25;
    
    const projString = `+proj=utm +zone=${zone} +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
    const [easting, northing] = proj4('EPSG:4326', projString, [longitude, latitude]);
    
    return { 
      easting: easting, 
      northing: northing, 
      zone: zone 
    };
  } catch (error) {
    throw new Error(`Erro na conversão geográfica para UTM: ${error.message}`);
  }
}

// Função auxiliar para validar coordenadas do Brasil
function validateBrazilianCoordinates(latitude, longitude) {
  const bounds = {
    north: 5.27,
    south: -33.75,
    east: -28.85,
    west: -73.99
  };
  
  return latitude >= bounds.south && latitude <= bounds.north && 
         longitude >= bounds.west && longitude <= bounds.east;
}

// Função para detectar formato de coordenada
function detectCoordinateFormat(coordStr) {
  if (!coordStr || typeof coordStr !== 'string') {
    return 'unknown';
  }
  
  const cleaned = coordStr.trim();
  
  // Detectar DMS
  if (cleaned.match(/[°º]/) || cleaned.match(/[′'″"]/) || cleaned.match(/[NSEW]/i)) {
    return 'dms';
  }
  
  // Detectar decimal
  if (cleaned.match(/^[+-]?\d+(\.\d+)?$/)) {
    return 'decimal';
  }
  
  return 'unknown';
}

// Expor no escopo global
window.CoordUtils = { 
  dmsToDecimal, 
  decimalToDMS, 
  utmToGeographic, 
  geographicToUTM,
  validateBrazilianCoordinates,
  detectCoordinateFormat
};

// Exponha no escopo global:
window.CoordUtils = { dmsToDecimal, decimalToDMS, utmToGeographic, geographicToUTM };
