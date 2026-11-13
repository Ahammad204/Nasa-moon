// Build script: Lunar Feature Explorer — Phase 1 (data).
//
// What it does
//   Downloads the official USGS Gazetteer of Planetary Nomenclature Moon
//   nomenclature archive and converts it into src/data/lunar-features.json
//   (one record per approved IAU feature name on the Moon).
//
// Source
//   Listing page: https://planetarynames.wr.usgs.gov/GIS_Downloads
//   File:         MOON_nomenclature_center_pts.zip
//   URL:          https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.zip
//   (the current Moon shapefile linked from the GIS Downloads page; the
//   S3 bucket is USGS's own hosting for these files. The archive contains
//   a shapefile; only its .dbf attribute table is read — the geometry in
//   the .shp is the same centre point the .dbf already carries as
//   center_lat / center_lon, so no shapefile parsing is needed.)
//
// Output
//   src/data/lunar-features.json — array of records, one JSON object per
//   line, sorted by Gazetteer id ascending. Fields per record:
//     id            Gazetteer feature id (number, parsed from the `link`
//                   field: https://planetarynames.wr.usgs.gov/Feature/<id>)
//     name          approved feature name
//     featureType   raw Gazetteer 2-letter type code (e.g. "AA" = crater;
//                   see the CODE_TO_TYPE table below — the code is 1:1
//                   with the descriptive type in this download)
//     typeName      raw Gazetteer descriptive type (e.g. "Crater, craters")
//     category      our grouped label (see CATEGORY_BY_TERM)
//     lat           centre latitude, degrees, [-90, 90]
//     lon           centre longitude, EAST-POSITIVE, degrees, [-180, 180].
//                   The Gazetteer stores 0..360 east longitude; values
//                   > 180 are shifted by -360 (e.g. 339.92 -> -20.08).
//     diameterKm    feature diameter in km, or null if unknown. A stored
//                   diameter of 0 means "not published", so it is null.
//     originOfName  Gazetteer `origin` text, or null if blank
//     approvalYear  year from `approvaldt`, or null if unparseable
//     gazetteerUrl  https://planetarynames.wr.usgs.gov/Feature/<id>
//     sources       ["usgs-gazetteer"] (see src/data/sources.json)
//     lastVerified  date this build ran (UTC, YYYY-MM-DD)
//
// Rules (Boss: "Andaje kisu krio na" — no guessing)
//   - Only APPROVED names are in the download (every record in the file
//     carries approval "Adopted by IAU"); nothing is invented.
//   - Unknown values are null, never estimated. Records are never dropped:
//     a feature type with no category mapping lands in "Other" with its
//     raw type kept (see CATEGORY_BY_TERM and the run summary). The one
//     exception is Satellite Feature (SF): per the IAU it is a lettered
//     satellite crater, so those records are grouped under "Crater" (raw
//     type and typeName kept — see toRecord).
//   - The category map lists ONLY types that occur in this download, plus
//     Fossa and Planum, which are named in the project spec's mapping but
//     did not occur in the 2026-11-13 download (noted in the run summary
//     if they ever appear). Lingula and Terra are NOT mapped: they do not
//     occur for the Moon and are not in the spec's mapping.
//
// Usage
//   node scripts/build-features.mjs [--input <local .zip>] [--out <path>]
//   No dependencies beyond Node itself (uses global fetch, node:zlib,
//   node:fs). Re-runnable: a fresh download replaces the output file.
//   Pass --input to reuse an already-downloaded archive instead of
//   downloading again (useful offline or to reproduce an earlier build).

import { inflateRawSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GIS_PAGE_URL =
  'https://planetarynames.wr.usgs.gov/GIS_Downloads';
const ARCHIVE_URL =
  'https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.zip';
const ARCHIVE_NAME = 'MOON_nomenclature_center_pts.zip';
const SOURCE_ID = 'usgs-gazetteer';
const GAZETTEER_FEATURE_URL = 'https://planetarynames.wr.usgs.gov/Feature/';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const DEFAULT_OUT = join(REPO_ROOT, 'src', 'data', 'lunar-features.json');

// Gazetteer 2-letter type codes observed in the 2026-11-13 download.
// Verified 1:1 with the descriptive `type` strings (see the run summary);
// this table is documentation, the build keys off the `type` string.
const CODE_TO_TYPE = {
  AA: 'Crater, craters',
  AL: 'Albedo Feature',
  CA: 'Catena, catenae',
  DO: 'Dorsum, dorsa',
  LC: 'Lacus, lacūs',
  LF: 'Astronaut-named features',
  ME: 'Mare, maria',
  MO: 'Mons, montes',
  OC: 'Oceanus, oceani',
  PA: 'Palus, paludes',
  PL: 'Planitia, planitiae',
  PR: 'Promontorium, promontoria',
  RI: 'Rima, rimae',
  RU: 'Rupes, rupēs',
  SF: 'Satellite Feature',
  SI: 'Sinus, sinūs',
  ST: 'Statio',
  VA: 'Vallis, valles',
};

// Singular Latin term (text before the comma in the raw `type` string)
// -> our grouped category. Terms present in the 2026-11-13 download are
// marked with their record counts; Fossa and Planum are in the project
// spec's mapping but did NOT occur in this download — they are listed so
// a future download containing them maps correctly instead of silently
// falling into "Other". Anything not listed here -> "Other".
const CATEGORY_BY_TERM = {
  // Craters
  Crater: 'Crater', // 1615 records
  Catena: 'Crater', // 20 records
  // Maria and "lakes"
  Mare: 'Maria', // 22 records
  Lacus: 'Maria', // 21 records
  Palus: 'Maria', // 3 records
  Sinus: 'Maria', // 12 records
  Oceanus: 'Maria', // 1 record
  // Mountains and highlands
  Mons: 'Mountain', // 58 records
  Promontorium: 'Mountain', // 9 records
  Dorsum: 'Mountain', // 39 records (ridge)
  Rupes: 'Mountain', // 8 records (scarp)
  // Valleys and rilles
  Vallis: 'Valley', // 14 records
  Rima: 'Valley', // 112 records
  Fossa: 'Valley', // 0 records in this download (spec mapping, kept)
  // Plains
  Planitia: 'Plain', // 1 record
  Planum: 'Plain', // 0 records in this download (spec mapping, kept)
};

function parseArgs(argv) {
  const args = { input: null, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.input || !args.out) throw new Error('Missing --input/--out value.');
  return args;
}

// Minimal ZIP reader (local file headers only): supports stored (method 0)
// and deflate (method 8) entries. Returns { name, method, dosDate, data }.
function readZipEntries(buffer) {
  const entries = [];
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // not a local file header -> done
    const method = buffer.readUInt16LE(offset + 8);
    const dosTime = buffer.readUInt16LE(offset + 10);
    const dosDate = buffer.readUInt16LE(offset + 12);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .subarray(offset + 30, offset + 30 + nameLen)
      .toString('utf-8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`Unsupported ZIP method ${method} for entry ${name}.`);
    entries.push({ name, method, dosTime, dosDate, data });
    offset = dataStart + compressedSize;
  }
  if (entries.length === 0) throw new Error('No entries found in ZIP archive.');
  return entries;
}

function dosDateToIso(dosDate, dosTime) {
  const year = ((dosDate >> 9) & 0x7f) + 1980;
  const month = (dosDate >> 5) & 0x0f;
  const day = dosDate & 0x1f;
  const hour = (dosTime >> 11) & 0x1f;
  const minute = (dosTime >> 5) & 0x3f;
  const second = ((dosTime & 0x1f) * 2);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ` +
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

// Minimal dBase III (.dbf) reader: header + field descriptors + fixed
// records. Character fields are UTF-8 (the archive's .cpg says UTF-8);
// numeric fields are ASCII. Returns an array of plain objects.
function readDbf(buffer) {
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = [];
  let pos = 32;
  for (;;) {
    if (buffer[pos] === 0x0d) break;
    if (pos + 32 > buffer.length) throw new Error('Truncated .dbf field descriptor.');
    const rawName = buffer.subarray(pos, pos + 11).toString('ascii');
    const name = rawName.replace(/\0.*$/, '').trim().toLowerCase();
    const type = String.fromCharCode(buffer[pos + 11]);
    const length = buffer[pos + 16];
    fields.push({ name, type, length });
    pos += 32;
  }
  const records = [];
  let recPos = headerLength;
  for (let i = 0; i < recordCount; i += 1) {
    const record = buffer.subarray(recPos, recPos + recordLength);
    if (record.length < recordLength) throw new Error(`Truncated .dbf record ${i}.`);
    if (record[0] === 0x2a) {
      // Deleted record flag ('*'): skip, do not count as data.
      recPos += recordLength;
      continue;
    }
    const row = {};
    let fieldPos = 1; // first byte is the deletion flag
    for (const field of fields) {
      const raw = record.subarray(fieldPos, fieldPos + field.length);
      fieldPos += field.length;
      if (field.type === 'N') {
        const text = raw.toString('ascii').trim();
        row[field.name] = text === '' ? null : Number(text);
      } else {
        row[field.name] = raw.toString('utf-8').replace(/\0/g, '').trim();
      }
    }
    records.push(row);
    recPos += recordLength;
  }
  return records;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Gazetteer longitude is 0..360 east; our data uses -180..180 east-positive.
function toSignedLon(lon360) {
  const lon = lon360 > 180 ? lon360 - 360 : lon360;
  return round(lon, 4);
}

function toRecord(row, lastVerified) {
  const link = row.link ?? '';
  const idMatch = /\/Feature\/(\d+)\s*$/.exec(link);
  if (!idMatch) throw new Error(`Record "${row.name}" has no Gazetteer id in link: ${link}`);
  const id = Number(idMatch[1]);

  const typeName = row.type ?? '';
  const singularTerm = typeName.split(',')[0].trim();
  let category = CATEGORY_BY_TERM[singularTerm] ?? 'Other';
  // Satellite Features are lettered satellite craters, so they belong in
  // "Crater": the IAU/WGPSN Lunar Task Group lists "lettered craters
  // (so-called 'satellite features')" among the lunar crater categories
  // (Shevchenko et al., 40th LPSC, 2009), and "Satellite feature" is a
  // listed synonym of "Satellite crater". The download carries no finer
  // distinction — every SF record has typeName "Satellite Feature" — so
  // this maps all of them. Raw featureType ("SF") and typeName stay
  // unchanged and visible on the record; only the grouped category moves.
  if (typeName === 'Satellite Feature') category = 'Crater';

  if (typeof row.center_lat !== 'number' || typeof row.center_lon !== 'number') {
    throw new Error(`Record "${row.name}" (id ${id}) is missing centre coordinates.`);
  }

  const approvalMatch = /^(\d{4})/.exec(row.approvaldt ?? '');
  const diameter =
    typeof row.diameter === 'number' && row.diameter > 0
      ? round(row.diameter, 3)
      : null; // 0 / missing means "not published", never a real 0 km

  return {
    id,
    name: row.name ?? '',
    featureType: row.code ?? '',
    typeName,
    category,
    lat: round(row.center_lat, 4),
    lon: toSignedLon(row.center_lon),
    diameterKm: diameter,
    originOfName: row.origin && row.origin.length > 0 ? row.origin : null,
    approvalYear: approvalMatch ? Number(approvalMatch[1]) : null,
    gazetteerUrl: `${GAZETTEER_FEATURE_URL}${id}`,
    sources: [SOURCE_ID],
    lastVerified,
  };
}

async function downloadArchive(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status} for ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lastVerified = new Date().toISOString().slice(0, 10);

  let archive;
  let archiveNote;
  if (args.input) {
    archive = readFileSync(resolve(args.input));
    archiveNote = `local file ${resolve(args.input)}`;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Downloading ${ARCHIVE_NAME} ...`);
    archive = await downloadArchive(ARCHIVE_URL);
    const cached = join(tmpdir(), ARCHIVE_NAME);
    writeFileSync(cached, archive);
    archiveNote = `${ARCHIVE_URL} (cached copy: ${cached})`;
  }
  // eslint-disable-next-line no-console
  console.log(`Archive: ${archiveNote} (${archive.length} bytes)`);

  const entries = readZipEntries(archive);
  const dbfEntry = entries.find((e) => e.name.toLowerCase().endsWith('.dbf'));
  if (!dbfEntry) throw new Error('Archive contains no .dbf file.');
  // eslint-disable-next-line no-console
  console.log(
    `Using .dbf entry ${dbfEntry.name} (last modified in archive: ${dosDateToIso(dbfEntry.dosDate, dbfEntry.dosTime)})`,
  );

  const rows = readDbf(dbfEntry.data);
  const records = rows.map((row) => toRecord(row, lastVerified));
  records.sort((a, b) => a.id - b.id);

  // Summary (also the audit trail for types actually present).
  const byCategory = {};
  const byType = {};
  const unmappedTerms = new Set();
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    byType[r.typeName] = (byType[r.typeName] ?? 0) + 1;
    // "Satellite Feature" is mapped to "Crater" in toRecord (lettered
    // satellite crater per the IAU), so it is not unmapped either.
    if (
      !(r.typeName.split(',')[0].trim() in CATEGORY_BY_TERM) &&
      r.typeName !== 'Satellite Feature'
    ) {
      unmappedTerms.add(r.typeName);
    }
  }
  // Cross-check the documented code table against what was actually read.
  const codeMismatches = records.filter(
    (r) => CODE_TO_TYPE[r.featureType] !== undefined && CODE_TO_TYPE[r.featureType] !== r.typeName,
  );
  if (codeMismatches.length > 0) {
    throw new Error(
      `CODE_TO_TYPE table is stale: ${codeMismatches.length} record(s) disagree, e.g. ` +
        `code ${codeMismatches[0].featureType} read as "${codeMismatches[0].typeName}".`,
    );
  }
  const unknownCodes = [...new Set(records.map((r) => r.featureType))].filter(
    (c) => !(c in CODE_TO_TYPE),
  );

  mkdirSync(dirname(resolve(args.out)), { recursive: true });
  const json = `[\n${records.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`;
  writeFileSync(resolve(args.out), json, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`\nWrote ${records.length} records to ${resolve(args.out)} (${Buffer.byteLength(json, 'utf-8')} bytes)`);
  // eslint-disable-next-line no-console
  console.log('Counts per category:', JSON.stringify(byCategory));
  // eslint-disable-next-line no-console
  console.log('Counts per raw type:', JSON.stringify(byType, null, 2));
  if (unmappedTerms.size > 0) {
    // eslint-disable-next-line no-console
    console.log(`Unmapped types -> "Other": ${[...unmappedTerms].join('; ')}`);
  }
  if (unknownCodes.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`Codes not in CODE_TO_TYPE (update the table): ${unknownCodes.join(', ')}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Source listing: ${GIS_PAGE_URL}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`build-features failed: ${error.message}`);
  process.exit(1);
});
