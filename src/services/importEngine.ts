import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { RawImportRow, ImportRow, ParsedMember } from '@/types';
import { normalizeDate } from '@/utils/dateUtils';

// ============================================================
// Column name mapping (Sinhala + English)
// ============================================================
const COLUMN_MAP: Record<string, keyof ParsedMember | 'ignore'> = {
  // Sinhala
  'සාමාජික අංකය': 'member_no',
  'නම': 'name',
  'ලිපිනය': 'address',
  'සාමාජික වූ දිනය': 'joined_date',
  'ජා.හැ.ප. අංකය': 'nic',
  'කොටස් මුදල': 'share_amount',
  'අනු අංකය': 'ignore',
  // English (normalized lowercase)
  'member_no': 'member_no',
  'member no': 'member_no',
  'memberno': 'member_no',
  'member number': 'member_no',
  'no': 'member_no',
  'name': 'name',
  'full name': 'name',
  'member name': 'name',
  'address': 'address',
  'joined_date': 'joined_date',
  'joined date': 'joined_date',
  'date': 'joined_date',
  'join date': 'joined_date',
  'registration date': 'joined_date',
  'nic': 'nic',
  'nic number': 'nic',
  'national id': 'nic',
  'id number': 'nic',
  'share_amount': 'share_amount',
  'share amount': 'share_amount',
  'shares': 'share_amount',
  'amount': 'share_amount',
  'capital': 'share_amount',
  'share capital': 'share_amount',
};

const REQUIRED_FIELDS: (keyof ParsedMember)[] = ['member_no', 'name'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapColumn(header: string): keyof ParsedMember | 'ignore' | null {
  // Direct Sinhala match
  if (COLUMN_MAP[header.trim()]) return COLUMN_MAP[header.trim()];
  // Normalized English match
  const norm = normalizeHeader(header);
  if (COLUMN_MAP[norm]) return COLUMN_MAP[norm];
  return null;
}

function buildHeaderMap(headers: string[]): Record<string, keyof ParsedMember | 'ignore' | null> {
  const map: Record<string, keyof ParsedMember | 'ignore' | null> = {};
  for (const h of headers) {
    map[h] = mapColumn(h);
  }
  return map;
}

function isHeaderRow(row: (string | number)[]): boolean {
  // A row is a header if at least 2 cells match known column names
  let matches = 0;
  for (const cell of row) {
    const val = String(cell ?? '').trim();
    if (val && (COLUMN_MAP[val] !== undefined || COLUMN_MAP[normalizeHeader(val)] !== undefined)) {
      matches++;
    }
  }
  return matches >= 2;
}

function parseRawRow(
  raw: RawImportRow,
  headerMap: Record<string, keyof ParsedMember | 'ignore' | null>,
  divisionId: string,
  categoryId: string,
  rowIndex: number
): ImportRow {
  const errors: string[] = [];
  const parsed: Partial<ParsedMember> = {
    electoral_division_id: divisionId,
    category_id: categoryId,
  };

  for (const [header, value] of Object.entries(raw)) {
    const field = headerMap[header];
    if (!field || field === 'ignore') continue;

    const strVal = String(value ?? '').trim();

    switch (field) {
      case 'member_no':
        parsed.member_no = strVal;
        break;
      case 'name':
        parsed.name = strVal;
        break;
      case 'address':
        parsed.address = strVal || '';
        break;
      case 'nic':
        parsed.nic = strVal || '';
        break;
      case 'joined_date':
        parsed.joined_date = normalizeDate(strVal) || new Date().toISOString().split('T')[0];
        break;
      case 'share_amount': {
        const num = parseFloat(String(strVal).replace(/,/g, ''));
        parsed.share_amount = isNaN(num) ? 0 : num;
        break;
      }
    }
  }

  // Fill defaults for optional fields
  if (!parsed.address) parsed.address = '';
  if (!parsed.nic) parsed.nic = '';
  if (!parsed.joined_date) parsed.joined_date = new Date().toISOString().split('T')[0];
  if (!parsed.share_amount) parsed.share_amount = 0;

  // Validate required fields
  for (const f of REQUIRED_FIELDS) {
    if (!parsed[f]) errors.push(`${f} is required`);
  }

  const status = errors.length > 0 ? 'invalid' : 'valid';

  return {
    rowIndex,
    raw,
    parsed: errors.length === 0 ? (parsed as ParsedMember) : undefined,
    status,
    errors,
  };
}

// ============================================================
// CSV Parser
// ============================================================
export async function parseCSV(
  file: File,
  divisionId: string,
  categoryId: string
): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const headerMap = buildHeaderMap(headers);

        const rows: ImportRow[] = (results.data as RawImportRow[])
          .filter((row) => {
            const vals = Object.values(row);
            return vals.some((v) => v !== null && v !== undefined && String(v).trim() !== '');
          })
          .map((row, i) => parseRawRow(row, headerMap, divisionId, categoryId, i + 1));

        resolve(rows);
      },
      error: reject,
    });
  });
}

// ============================================================
// Excel Parser — Auto-detects header row (works with ANY Excel file)
// ============================================================
export async function parseExcel(
  file: File,
  divisionId: string,
  categoryId: string
): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
          header: 1,
          defval: '',
          raw: false,
        });

        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        // Auto-detect header row: scan first 10 rows to find the header
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          if (isHeaderRow(jsonData[i] as (string | number)[])) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = (jsonData[headerRowIndex] as (string | number)[]).map((h) =>
          String(h ?? '').trim()
        );
        const headerMap = buildHeaderMap(headerRow);

        const rows: ImportRow[] = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const rowArr = jsonData[i] as (string | number)[];
          // Skip empty rows
          if (rowArr.every((v) => v === '' || v === null || v === undefined)) continue;

          const raw: RawImportRow = {};
          headerRow.forEach((h, idx) => {
            raw[h] = rowArr[idx] ?? '';
          });

          rows.push(parseRawRow(raw, headerMap, divisionId, categoryId, i + 1));
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================
// Main entry point
// ============================================================
export async function parseFile(
  file: File,
  divisionId: string,
  categoryId: string
): Promise<ImportRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCSV(file, divisionId, categoryId);
  } else if (ext === 'xls' || ext === 'xlsx') {
    return parseExcel(file, divisionId, categoryId);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please use CSV, XLS or XLSX`);
  }
}

// ============================================================
// Duplicate detection
// ============================================================
export function applyDuplicateDetection(
  rows: ImportRow[],
  existingMemberNos: Set<string>
): ImportRow[] {
  const seenInBatch = new Set<string>();

  return rows.map((row) => {
    if (row.status === 'invalid') return row;

    const memberNo = row.parsed?.member_no;
    if (!memberNo) return row;

    if (existingMemberNos.has(memberNo) || seenInBatch.has(memberNo)) {
      return { ...row, status: 'duplicate' as const, errors: ['Duplicate member number'] };
    }

    seenInBatch.add(memberNo);
    return row;
  });
}

// ============================================================
// Template generator
// ============================================================
export function downloadImportTemplate(): void {
  const templateData = [
    ['member_no', 'name', 'address', 'nic', 'joined_date', 'share_amount'],
    ['M001', 'Kamal Perera', 'No 10, Colombo', '199012345678', '2024-01-15', '5000'],
    ['M002', 'Nimal Silva', 'No 20, Kandy', '198512345678', '2024-02-01', '3000'],
    ['M003', 'Sunil Fernando', 'No 30, Galle', '200012345678', '2024-03-10', '7500'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Style the header row
  ws['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
    { wch: 15 }, { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Members Import Template');
  XLSX.writeFile(wb, 'members_import_template.xlsx');
}
