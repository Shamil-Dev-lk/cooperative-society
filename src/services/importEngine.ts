import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { RawImportRow, ImportRow, ParsedMember } from '@/types';
import { normalizeDate } from '@/utils/dateUtils';

// ============================================================
// Sinhala column name mapping
// ============================================================
const SINHALA_COLUMN_MAP: Record<string, keyof ParsedMember | 'ignore'> = {
  'සාමාජික අංකය': 'member_no',
  'නම': 'name',
  'ලිපිනය': 'address',
  'සාමාජික වූ දිනය': 'joined_date',
  'ජා.හැ.ප. අංකය': 'nic',
  'කොටස් මුදල': 'share_amount',
  'අනු අංකය': 'ignore',
  // English equivalents
  'member_no': 'member_no',
  'member no': 'member_no',
  'memberno': 'member_no',
  'name': 'name',
  'address': 'address',
  'joined_date': 'joined_date',
  'joined date': 'joined_date',
  'date': 'joined_date',
  'nic': 'nic',
  'share_amount': 'share_amount',
  'share amount': 'share_amount',
  'shares': 'share_amount',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapColumn(header: string): keyof ParsedMember | 'ignore' | null {
  const normalized = normalizeHeader(header);
  // Direct sinhala match
  if (SINHALA_COLUMN_MAP[header.trim()]) return SINHALA_COLUMN_MAP[header.trim()];
  // Normalized english match
  if (SINHALA_COLUMN_MAP[normalized]) return SINHALA_COLUMN_MAP[normalized];
  return null;
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
        parsed.address = strVal;
        break;
      case 'nic':
        parsed.nic = strVal;
        break;
      case 'joined_date':
        parsed.joined_date = normalizeDate(strVal);
        break;
      case 'share_amount': {
        const num = parseFloat(strVal.replace(/,/g, ''));
        parsed.share_amount = isNaN(num) ? 0 : num;
        break;
      }
    }
  }

  // Validate required fields
  if (!parsed.member_no) errors.push('Member number missing');
  if (!parsed.name) errors.push('Name missing');

  const status = errors.length > 0 ? 'invalid' : 'valid';

  return {
    rowIndex,
    raw,
    parsed: errors.length === 0 ? (parsed as ParsedMember) : undefined,
    status,
    errors,
  };
}

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
        const headerMap: Record<string, keyof ParsedMember | 'ignore' | null> = {};
        for (const h of headers) {
          headerMap[h] = mapColumn(h);
        }

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

        // Row 6 is the header row (0-indexed = row 5)
        // Data starts from row 7 (0-indexed = row 6)
        const jsonData = XLSX.utils.sheet_to_json<RawImportRow>(sheet, {
          header: 1,
          defval: '',
          raw: false,
        });

        // Row index 5 (0-indexed) = Row 6 = headers
        if (jsonData.length < 6) {
          resolve([]);
          return;
        }

        const headerRow = (jsonData[5] as unknown as string[]).map((h) => String(h ?? '').trim());
        const headerMap: Record<string, keyof ParsedMember | 'ignore' | null> = {};
        for (const h of headerRow) {
          headerMap[h] = mapColumn(h);
        }

        const rows: ImportRow[] = [];
        for (let i = 6; i < jsonData.length; i++) {
          const rowArr = jsonData[i] as unknown as (string | number)[];
          // Skip entirely empty rows
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
    throw new Error(`Unsupported file type: .${ext}`);
  }
}

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
