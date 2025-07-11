// main.js - Coordinate Converter Logic

document.addEventListener('DOMContentLoaded', () => {
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

  const formatOptions = {
    dms: 'DMS (Degrees, Minutes, Seconds)',
    decimal: 'Decimal (DD)',
    utm: 'UTM (Universal Transverse Mercator)',
    all: 'All Formats'
  };

  // Fusos UTM que cobrem o Brasil e regiões adjacentes
  const utmZones = {
    18: { name: '18S (Acre - Oeste)', states: ['AC (oeste)'] },
    19: { name: '19S (Acre - Leste, Rondônia)', states: ['AC (leste)', 'RO'] },
    20: { name: '20S (Amazonas - Oeste)', states: ['AM (oeste)'] },
    21: { name: '21S (Amazonas - Centro/Leste, Roraima, Pará - Oeste)', states: ['AM (centro/leste)', 'RR', 'PA (oeste)', 'MT (norte)'] },
    22: { name: '22S (Pará - Centro/Leste, Amapá, Maranhão, Tocantins)', states: ['PA (centro/leste)', 'AP', 'MA', 'TO', 'PI (oeste)', 'MT (centro)', 'GO (norte)', 'BA (oeste)'] },
    23: { name: '23S (Ceará, Piauí, Bahia, Goiás, Mato Grosso, Minas Gerais)', states: ['CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'PI (leste)', 'BA (centro)', 'GO (sul)', 'MT (sul)', 'MG (oeste)', 'DF'] },
    24: { name: '24S (Bahia - Leste, Minas Gerais, Espírito Santo, São Paulo, Paraná)', states: ['BA (leste)', 'MG (centro/leste)', 'ES', 'RJ', 'SP', 'PR', 'SC (oeste)', 'MS'] },
    25: { name: '25S (Santa Catarina - Leste, Rio Grande do Sul, Fernando de Noronha)', states: ['SC (leste)', 'RS', 'Fernando de Noronha'] }
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

    const createField = (id, label, placeholder = '') => {
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `<label for="${id}">${label}</label><input type="text" id="${id}" placeholder="${placeholder}" />`;
      frag.appendChild(div);
    };

    if (type === 'dms') {
      createField('latDMS', 'Latitude (DMS)', 'Ex: 25°45′30″S');
      createField('lonDMS', 'Longitude (DMS)', 'Ex: 48°30′45″W');
    } else if (type === 'decimal') {
      createField('latDD', 'Latitude (Decimal)', 'Ex: -25.7583');
      createField('lonDD', 'Longitude (Decimal)', 'Ex: -48.5125');
    } else if (type === 'utm') {
      createField('easting', 'Easting (m)', 'Ex: 734567.89');
      createField('northing', 'Northing (m)', 'Ex: 7145678.90');
      
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `<label for="utmZone">Fuso UTM</label><select id="utmZone">` +
        Object.entries(utmZones).map(([zone, info]) => 
          `<option value="${zone}" ${zone === '22' ? 'selected' : ''}>${info.name}</option>`
        ).join('') + 
        `</select>`;
      frag.appendChild(div);
      
      // Adicionar tooltip com informações dos estados
      const tooltip = document.createElement('div');
      tooltip.className = 'utm-tooltip';
      tooltip.innerHTML = `<small>Estados/Regiões: <span id="zoneInfo">${utmZones[22].states.join(', ')}</span></small>`;
      div.appendChild(tooltip);
    }

    fieldsContainer.appendChild(frag);
    
    // Adicionar evento para atualizar informações do fuso
    if (type === 'utm') {
      document.getElementById('utmZone').addEventListener('change', (e) => {
        const selectedZone = e.target.value;
        const zoneInfo = document.getElementById('zoneInfo');
        if (zoneInfo) {
          zoneInfo.textContent = utmZones[selectedZone].states.join(', ');
        }
      });
    }
  }

  function handleConvert() {
    const type = inputFormatSelect.value;
    let lat, lon, easting, northing, zone;
    resultContainer.innerHTML = '';

    try {
      if (type === 'dms') {
        const latDMS = document.getElementById('latDMS').value.trim();
        const lonDMS = document.getElementById('lonDMS').value.trim();
        if (!latDMS || !lonDMS) {
          throw new Error('Por favor, preencha ambos os campos de coordenadas DMS');
        }
        lat = CoordUtils.dmsToDecimal(latDMS);
        lon = CoordUtils.dmsToDecimal(lonDMS);
      } else if (type === 'decimal') {
        const latDD = document.getElementById('latDD').value.trim();
        const lonDD = document.getElementById('lonDD').value.trim();
        if (!latDD || !lonDD) {
          throw new Error('Por favor, preencha ambos os campos de coordenadas decimais');
        }
        lat = parseFloat(latDD);
        lon = parseFloat(lonDD);
        if (isNaN(lat) || isNaN(lon)) {
          throw new Error('Coordenadas decimais devem ser números válidos');
        }
      } else if (type === 'utm') {
        const eastingVal = document.getElementById('easting').value.trim();
        const northingVal = document.getElementById('northing').value.trim();
        if (!eastingVal || !northingVal) {
          throw new Error('Por favor, preencha os campos Easting e Northing');
        }
        easting = parseFloat(eastingVal);
        northing = parseFloat(northingVal);
        zone = parseInt(document.getElementById('utmZone').value);
        if (isNaN(easting) || isNaN(northing)) {
          throw new Error('Easting e Northing devem ser números válidos');
        }
        const geo = CoordUtils.utmToGeographic(easting, northing, zone);
        lat = geo.latitude;
        lon = geo.longitude;
      }

      // Validar se as coordenadas estão dentro do Brasil (aproximadamente)
      if (lat < -35 || lat > 5 || lon < -75 || lon > -30) {
        const proceed = confirm('As coordenadas parecem estar fora do Brasil. Continuar mesmo assim?');
        if (!proceed) return;
      }

      if (type !== 'utm') {
        const utm = CoordUtils.geographicToUTM(lat, lon);
        easting = utm.easting;
        northing = utm.northing;
        zone = utm.zone;
      }

      const output = {
        area: '',
        point: '',
        latDMS: CoordUtils.decimalToDMS(lat, false),
        lonDMS: CoordUtils.decimalToDMS(lon, true),
        latDecimal: lat.toFixed(8),
        lonDecimal: lon.toFixed(8),
        easting: easting.toFixed(2),
        northing: northing.toFixed(2),
        zone: zone + 'S',
        zoneName: utmZones[zone] ? utmZones[zone].name : zone + 'S'
      };

      const format = outputFormatSelect.value;
      const div = document.createElement('div');
      div.className = 'success';
      div.innerHTML = `<h3>✅ Conversão realizada com sucesso!</h3>`;
      if (format === 'all' || format === 'dms') {
        div.innerHTML += `<p><strong>DMS:</strong> ${output.latDMS}, ${output.lonDMS}</p>`;
      }
      if (format === 'all' || format === 'decimal') {
        div.innerHTML += `<p><strong>Decimal:</strong> ${output.latDecimal}, ${output.lonDecimal}</p>`;
      }
      if (format === 'all' || format === 'utm') {
        div.innerHTML += `<p><strong>UTM:</strong> ${output.easting}E, ${output.northing}N (${output.zoneName})</p>`;
      }
      resultContainer.appendChild(div);

      addBtn.hidden = false;
      addBtn.dataset.result = JSON.stringify(output);

    } catch (err) {
      resultContainer.innerHTML = `<div class="error">❌ Erro: ${err.message}</div>`;
      addBtn.hidden = true;
    }
  }

  function addToTable() {
    const data = JSON.parse(addBtn.dataset.result);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${data.area}</td>
      <td>${data.point}</td>
      <td>${data.latDMS}</td>
      <td>${data.lonDMS}</td>
      <td>${data.latDecimal}</td>
      <td>${data.lonDecimal}</td>
      <td>${data.easting}</td>
      <td>${data.northing}</td>
      <td>${data.zone}</td>
    `;
    resultsTableBody.appendChild(row);
    tableContainer.hidden = false;
    
    // Limpar campos após adicionar
    const inputs = fieldsContainer.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    resultContainer.innerHTML = '';
    addBtn.hidden = true;
  }

  function processBatch() {
    const input = document.getElementById('bulkInput').value.trim();
    if (!input) {
      alert('Por favor, insira os dados para processamento em lote.');
      return;
    }
    
    const lines = input.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      alert('Nenhuma linha válida encontrada.');
      return;
    }
    
    resultsTableBody.innerHTML = '';
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    lines.forEach((line, index) => {
      try {
        const parts = line.split(',').map(s => s.trim());
        let area = '', point = '', latStr, lonStr;
        
        if (parts.length === 2) {
          [latStr, lonStr] = parts;
          area = `Área ${index + 1}`;
          point = `Ponto ${index + 1}`;
        } else if (parts.length === 4) {
          [area, point, latStr, lonStr] = parts;
        } else {
          throw new Error(`Formato inválido. Esperado: "Área,Ponto,Lat,Lon" ou "Lat,Lon"`);
        }

        if (!latStr || !lonStr) {
          throw new Error('Coordenadas não podem estar vazias');
        }

        // Detectar formato automático
        let lat, lon;
        if (latStr.includes('°') || latStr.includes('º')) {
          // Formato DMS
          lat = CoordUtils.dmsToDecimal(latStr);
          lon = CoordUtils.dmsToDecimal(lonStr);
        } else {
          // Formato decimal
          lat = parseFloat(latStr);
          lon = parseFloat(lonStr);
          if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Coordenadas decimais devem ser números válidos');
          }
        }

        // Validação básica do Brasil
        if (lat < -35 || lat > 5 || lon < -75 || lon > -30) {
          console.warn(`Linha ${index + 1}: Coordenadas podem estar fora do Brasil`);
        }

        const utm = CoordUtils.geographicToUTM(lat, lon);
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${area}</td>
          <td>${point}</td>
          <td>${CoordUtils.decimalToDMS(lat, false)}</td>
          <td>${CoordUtils.decimalToDMS(lon, true)}</td>
          <td>${lat.toFixed(8)}</td>
          <td>${lon.toFixed(8)}</td>
          <td>${utm.easting.toFixed(2)}</td>
          <td>${utm.northing.toFixed(2)}</td>
          <td>${utm.zone}S</td>
        `;
        resultsTableBody.appendChild(row);
        successCount++;
        
      } catch (err) {
        errorCount++;
        errors.push(`Linha ${index + 1}: ${err.message}`);
      }
    });

    tableContainer.hidden = false;
    
    let message = `✅ Processamento concluído: ${successCount} pontos processados com sucesso`;
    if (errorCount > 0) {
      message += `, ${errorCount} erros encontrados`;
    }
    
    resultContainer.innerHTML = `<div class="${errorCount > 0 ? 'warning' : 'success'}">${message}</div>`;
    
    if (errors.length > 0) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.innerHTML = `<h4>Erros encontrados:</h4><ul>` + 
        errors.slice(0, 5).map(err => `<li>${err}</li>`).join('') + 
        (errors.length > 5 ? `<li>... e mais ${errors.length - 5} erros</li>` : '') +
        `</ul>`;
      resultContainer.appendChild(errorDiv);
    }
  }

  function exportToCSV() {
    const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
    if (rows.length === 0) {
      alert('Nenhum dado para exportar. Processe algumas coordenadas primeiro.');
      return;
    }
    
    const header = ['Área', 'Ponto', 'Latitude (DMS)', 'Longitude (DMS)', 'Latitude (Decimal)', 'Longitude (Decimal)', 'Easting', 'Northing', 'Fuso UTM'];
    const csvData = [header.join(',')];
    
    rows.forEach(row => {
      const cols = Array.from(row.children).map(td => {
        const text = td.textContent.trim();
        // Escapar vírgulas no CSV
        return text.includes(',') ? `"${text}"` : text;
      });
      csvData.push(cols.join(','));
    });
    
    const csvContent = csvData.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coordenadas_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    resultContainer.innerHTML = `<div class="success">✅ Arquivo CSV exportado com ${rows.length} coordenadas.</div>`;
  }

  // Inicializar campos
  updateInputFields();
});

  updateInputFields(); // initial call
});
