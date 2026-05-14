/**
 * Client-Side File Import Service
 * Parses CSV, JSON, and XLSX files entirely in the browser.
 * No backend required.
 */

import { saveProvider, loadProviders } from './clientScraper';

const IMPORT_KEY = 'fi_import_batches';

export function loadBatches() {
  try { return JSON.parse(localStorage.getItem(IMPORT_KEY) || '[]'); }
  catch { return []; }
}

function saveBatch(batch) {
  const batches = loadBatches();
  const idx = batches.findIndex(b => b.id === batch.id);
  if (idx >= 0) batches[idx] = batch;
  else batches.unshift(batch);
  localStorage.setItem(IMPORT_KEY, JSON.stringify(batches.slice(0, 100)));
}

export function deleteBatch(id) {
  const updated = loadBatches().filter(b => b.id !== id);
  localStorage.setItem(IMPORT_KEY, JSON.stringify(updated));
}

// ── CSV Parser ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  // Detect delimiter (comma or semicolon or tab)
  const firstLine = lines[0];
  const delim = [',', ';', '\t'].reduce((best, d) =>
    (firstLine.split(d).length > firstLine.split(best).length ? d : best), ','
  );

  // Parse header
  const headers = firstLine.split(delim).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields
    const values = [];
    let inQuote = false, current = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === delim && !inQuote) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());

    if (values.every(v => !v)) continue;

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

// ── XLSX Parser (pure JS - no lib needed) ──────────────────────────────────────
async function parseXLSX(file) {
  // Use SheetJS via CDN as a dynamic import
  return new Promise((resolve, reject) => {
    // Load SheetJS if not already loaded
    if (window.XLSX) {
      resolve(readSheets(file));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve(readSheets(file));
    script.onerror = () => reject(new Error('Failed to load XLSX parser'));
    document.head.appendChild(script);
  });
}

function readSheets(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
        // Lowercase keys
        const normalized = rows.map(row => {
          const r = {};
          Object.keys(row).forEach(k => { r[k.toLowerCase().trim()] = row[k]; });
          return r;
        });
        resolve(normalized);
      } catch (err) {
        reject(new Error('Invalid XLSX file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// ── JSON Parser ────────────────────────────────────────────────────────────────
async function parseJSON(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.providers || data.data || [data];
  if (!arr.length) throw new Error('JSON file is empty or has no recognized data array.');
  // Lowercase keys
  return arr.map(item => {
    const r = {};
    Object.keys(item).forEach(k => { r[k.toLowerCase().trim()] = item[k]; });
    return r;
  });
}

// ── Row → Provider mapper ──────────────────────────────────────────────────────
const FIELD_ALIASES = {
  name:         ['name', 'business_name', 'company', 'funeral_home', 'provider', 'organization'],
  email:        ['email', 'email_address', 'mail', 'contact_email'],
  phone:        ['phone', 'telephone', 'tel', 'phone_number', 'contact_phone', 'mobile'],
  website:      ['website', 'url', 'web', 'site', 'homepage', 'link'],
  address:      ['address', 'street', 'street_address', 'addr', 'location'],
  city:         ['city', 'town', 'municipality'],
  state:        ['state', 'province', 'region', 'st'],
  zip:          ['zip', 'postal_code', 'zipcode', 'postcode'],
  services:     ['services', 'service_types', 'offerings'],
  description:  ['description', 'about', 'notes', 'bio', 'info'],
  rating:       ['rating', 'score', 'stars', 'review_score'],
  phone:        ['phone', 'telephone', 'tel', 'phone_number'],
};

function getField(row, fieldKey) {
  const aliases = FIELD_ALIASES[fieldKey] || [fieldKey];
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') return String(row[alias]).trim();
  }
  return null;
}

function rowToProvider(row, index) {
  const name = getField(row, 'name') || `Provider ${index + 1}`;
  const website = getField(row, 'website') || '';
  const phone = getField(row, 'phone') || null;
  const email = getField(row, 'email') || null;
  const address = getField(row, 'address') || null;
  const city = getField(row, 'city') || null;
  const state = getField(row, 'state') || null;
  const zip = getField(row, 'zip') || null;
  const description = getField(row, 'description') || null;
  const servicesRaw = getField(row, 'services') || '';
  const services = servicesRaw
    ? servicesRaw.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
    : [];
  const ratingRaw = getField(row, 'rating');
  const rating = ratingRaw ? Math.min(5, Math.max(0, parseFloat(ratingRaw))) : null;

  let score = 0;
  if (name && name !== `Provider ${index + 1}`) score += 20;
  if (phone) score += 20;
  if (email) score += 15;
  if (address || city) score += 15;
  if (services.length > 0) score += 15;
  if (description) score += 10;
  if (website) score += 5;

  return {
    id: 'prov_imp_' + Date.now() + '_' + index,
    name,
    url: website.startsWith('http') ? website : (website ? `https://${website}` : ''),
    website: website.startsWith('http') ? website : (website ? `https://${website}` : ''),
    phone,
    email,
    address,
    city,
    state,
    zip,
    description,
    services,
    rating: isNaN(rating) ? null : rating,
    ai_verified: score >= 60,
    accuracy_score: score,
    imported: true,
    scraped_at: new Date().toISOString(),
  };
}

// ── Main import function ───────────────────────────────────────────────────────
export async function importFile(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  let rows = [];

  onProgress?.({ status: 'parsing', message: `Reading ${file.name}...` });

  try {
    if (ext === 'csv') {
      const text = await file.text();
      rows = parseCSV(text);
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = await parseXLSX(file);
    } else if (ext === 'json') {
      rows = await parseJSON(file);
    } else {
      throw new Error(`Unsupported file type: .${ext}. Use CSV, XLSX, or JSON.`);
    }
  } catch (err) {
    throw new Error(`Parse error: ${err.message}`);
  }

  if (!rows.length) throw new Error('File contains no data rows.');

  onProgress?.({ status: 'mapping', message: `Mapping ${rows.length} rows...` });

  // Convert rows to providers
  const providers = rows
    .filter(row => Object.values(row).some(v => v !== ''))
    .map((row, i) => rowToProvider(row, i));

  // Deduplicate against existing providers
  const existing = loadProviders();
  const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()));
  const existingWebsites = new Set(existing.map(p => p.website?.replace(/\/$/, '')).filter(Boolean));

  const newProviders = providers.filter(p => {
    const nameKey = p.name.toLowerCase().trim();
    const webKey = p.website?.replace(/\/$/, '');
    if (existingNames.has(nameKey)) return false;
    if (webKey && existingWebsites.has(webKey)) return false;
    return true;
  });

  onProgress?.({ status: 'saving', message: `Saving ${newProviders.length} new records...` });

  // Save all new providers
  const allProviders = [...newProviders, ...existing];
  localStorage.setItem('fi_providers', JSON.stringify(allProviders));

  // Create batch record
  const batch = {
    id: 'batch_' + Date.now(),
    name: file.name,
    source: ext.toUpperCase() + ' Upload',
    date: new Date().toLocaleDateString(),
    total: providers.length,
    imported: newProviders.length,
    duplicates: providers.length - newProviders.length,
    records: newProviders.length,
    health: Math.round(
      (newProviders.filter(p => p.accuracy_score >= 40).length / Math.max(1, newProviders.length)) * 100
    ),
    status: 'completed',
    fields_detected: rows.length > 0 ? Object.keys(rows[0]).join(', ') : '',
  };
  saveBatch(batch);

  return batch;
}
