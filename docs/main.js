// main.js - Coordinate Converter Logic
let map;
let marker;
document.addEventListener('DOMContentLoaded', () => {
  map = L.map('map').setView([-15.7801, -47.9292], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  const inputFormatSelect = document.getElementById('inputFormat');
  const outputFormatSelect = document.getElementById('outputFormat');
  const fieldsContainer = document.getElementById('fieldsContainer');
  const convertBtn = document.getElementById('convertBtn');
  const batchBtn = document.getElementById('batchBtn');
  const exportBtn = document.getElementById('exportBtn');
  const addBtn = document.getElementById('addBtn');
  const resultContainer = document.getElementById('result');
  const resultsTableBody = document.querySelector('#resultsTable tbody');
  const tableContainer = document.getElementById('tableContainer');
 convertBtn.addEventListener('click', handleConvert);
    const epsgSelect = document.getElementById('epsgSelect');
    if (!latInput || !lonInput) {
      alert('Campos de latitude e longitude não encontrados.');
      return;
    }

    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);

    if (isNaN(lat) || isNaN(lon)) {
      alert('Informe latitude e longitude válidas.');
      return;
    }

    const epsg = epsgSelect ? epsgSelect.value : "EPSG:31982";

    const utm = CoordUtils.geographicToUTM(lat, lon, epsg);
    console.log('UTM:', utm);
  <p><strong>UTM:</strong> Easting: ${utm.easting.toFixed(2)}, Northing: ${utm.northing.toFixed(2)}, Zone: ${utm.zone}S</p>
`;
  });
  const formatOptions = {
    dms: 'DMS (Degrees, Minutes, Seconds)',
    decimal: 'Decimal (DD)',
    utm: 'UTM (Universal Transverse Mercator)',
    all: 'All Formats'
  };
  
  Object.entries(formatOptions).forEach(([val, label]) => {
    const inputOpt = new Option(label, val);
    const outputOpt = new Option(label, val);
    inputFormatSelect.add(inputOpt.cloneNode(true));
    if (val !== 'all') outputFormatSelect.add(outputOpt);
  });
  outputFormatSelect.value = 'all';

  inputFormatSelect.addEventListener('change', updateInputFields);
  convertBtn.addEventListener('click', handleConvert);
  batchBtn.addEventListener('click', processBatch);
  exportBtn.addEventListener('click', exportToCSV);
  addBtn.addEventListener('click', addToTable);

  function updateInputFields() {
    fieldsContainer.innerHTML = '';
    const type = inputFormatSelect.value;
    const frag = document.createDocumentFragment();

    const createField = (id, label) => {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `<label for="${id}">${label}</label><input type="text" id="${id}" placeholder="" />`;
      frag.appendChild(div);
    };

    if (type === 'dms') {
      createField('latDMS', 'Latitude (DMS)');
      createField('lonDMS', 'Longitude (DMS)');
    } else if (type === 'decimal') {
      createField('latDD', 'Latitude (Decimal)');
      createField('lonDD', 'Longitude (Decimal)');
    } else if (type === 'utm') {
      createField('easting', 'Easting');
      createField('northing', 'Northing');
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `<label for="utmZone">UTM Zone</label>
        <select id="utmZone">
          <option value="21">21S (Bahia)</option>
          <option value="22" selected>22S (Santa Catarina)</option>
          <option value="23">23S (Southeast)</option>
          <option value="24">24S (Paraná)</option>
          <option value="25">25S (RS)</option>
        </select>`;
      frag.appendChild(div);
    }

    fieldsContainer.appendChild(frag);
  }

  function handleConvert() {
    const type = inputFormatSelect.value;
    let lat, lon, easting, northing, zone;
    resultContainer.innerHTML = '';

    try {
      if (type === 'dms') {
        lat = CoordUtils.dmsToDecimal(document.getElementById('latDMS').value);
        lon = CoordUtils.dmsToDecimal(document.getElementById('lonDMS').value);
      } else if (type === 'decimal') {
        lat = parseFloat(document.getElementById('latDD').value);
        lon = parseFloat(document.getElementById('lonDD').value);
      } else if (type === 'utm') {
        easting = parseFloat(document.getElementById('easting').value);
        northing = parseFloat(document.getElementById('northing').value);
        zone = parseInt(document.getElementById('utmZone').value);
        const geo = CoordUtils.utmToGeographic(easting, northing, zone);
        lat = geo.latitude;
        lon = geo.longitude;
      }

      if (type !== 'utm') {
        const utm = CoordUtils.geographicToUTM(lat, lon);
        easting = utm.easting;
        northing = utm.northing;
        zone = utm.zone;
      }
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map)
    .bindPopup(`<b>Latitude:</b> ${lat.toFixed(5)}<br/><b>Longitude:</b> ${lon.toFixed(5)}`)
    .openPopup();
    map.setView([lat, lon], 14);
      const output = {
        area: '',
        point: '',
        latDMS: CoordUtils.decimalToDMS(lat, false),
        lonDMS: CoordUtils.decimalToDMS(lon, true),
        latDecimal: lat.toFixed(8),
        lonDecimal: lon.toFixed(8),
        easting: easting.toFixed(2),
        northing: northing.toFixed(2),
        zone: zone + 'S'
      };

      const format = outputFormatSelect.value;
      const div = document.createElement('div');
      div.className = 'success';
      div.innerHTML = `<h3>✅ Conversion successful!</h3>`;
      if (format === 'all' || format === 'dms') div.innerHTML += `<p><strong>DMS:</strong> ${output.latDMS}, ${output.lonDMS}</p>`;
      if (format === 'all' || format === 'decimal') div.innerHTML += `<p><strong>Decimal:</strong> ${output.latDecimal}, ${output.lonDecimal}</p>`;
      if (format === 'all' || format === 'utm') div.innerHTML += `<p><strong>UTM:</strong> ${output.easting}E, ${output.northing}N (Zone ${output.zone})</p>`;
      resultContainer.appendChild(div);

      addBtn.hidden = false;
      addBtn.dataset.result = JSON.stringify(output);

    } catch (err) {
      resultContainer.innerHTML = `<div class="error">❌ Error: ${err.message}</div>`;
      addBtn.hidden = true;
    }
  }

  function addToTable() {
    const data = JSON.parse(addBtn.dataset.result);
    const row = document.createElement('tr');
    row.innerHTML = `<td>${data.area}</td><td>${data.point}</td><td>${data.latDMS}</td><td>${data.lonDMS}</td><td>${data.latDecimal}</td><td>${data.lonDecimal}</td><td>${data.easting}</td><td>${data.northing}</td><td>${data.zone}</td>`;
    resultsTableBody.appendChild(row);
    tableContainer.hidden = false;
  }

  function processBatch() {
    const input = document.getElementById('bulkInput').value.trim();
    if (!input) return;
    const lines = input.split('\n');
    resultsTableBody.innerHTML = '';

    lines.forEach((line, i) => {
      const parts = line.split(',').map(s => s.trim());
      let area = '', point = '', latStr, lonStr;
      if (parts.length === 2) {
        latStr = parts[0]; lonStr = parts[1];
      } else if (parts.length === 4) {
        [area, point, latStr, lonStr] = parts;
      } else return;

      const lat = latStr.includes('°') ? CoordUtils.dmsToDecimal(latStr) : parseFloat(latStr);
      const lon = lonStr.includes('°') ? CoordUtils.dmsToDecimal(lonStr) : parseFloat(lonStr);
      if (isNaN(lat) || isNaN(lon)) return;

      const utm = CoordUtils.geographicToUTM(lat, lon);
      const row = document.createElement('tr');
      row.innerHTML = `<td>${area}</td><td>${point}</td><td>${CoordUtils.decimalToDMS(lat, false)}</td><td>${CoordUtils.decimalToDMS(lon, true)}</td><td>${lat.toFixed(8)}</td><td>${lon.toFixed(8)}</td><td>${utm.easting.toFixed(2)}</td><td>${utm.northing.toFixed(2)}</td><td>${utm.zone}S</td>`;
      resultsTableBody.appendChild(row);
    });

    tableContainer.hidden = false;
    resultContainer.innerHTML = `<div class="success">✅ ${lines.length} coordinates processed.</div>`;
  }

  function exportToCSV() {
    const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
    if (rows.length === 0) return;
    const header = ['Area','Point','Lat (DMS)','Lon (DMS)','Lat (Dec)','Lon (Dec)','Easting','Northing','Zone'];
    const csv = [header.join(',')];
    rows.forEach(row => {
      const cols = Array.from(row.children).map(td => td.textContent);
      csv.push(cols.join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coordinates.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  updateInputFields(); // initial call
});
