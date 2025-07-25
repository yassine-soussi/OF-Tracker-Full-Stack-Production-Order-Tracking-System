// utils/excel.ts
import * as XLSX from 'xlsx';

export function parseExcelDate(raw: any): string {
  if (typeof raw === 'number') {
    const jsDate = XLSX.SSF.parse_date_code(raw);
    if (!jsDate) return '';
    const day = String(jsDate.d).padStart(2, '0');
    const month = String(jsDate.m).padStart(2, '0');
    const year = jsDate.y;
    const hours = String(jsDate.H).padStart(2, '0');
    const minutes = String(jsDate.M).padStart(2, '0');
    const seconds = String(jsDate.S).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
  if (typeof raw === 'string') return raw;
  return '';
}

export async function readExcelFile(file: File): Promise<{ data: any[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const workbook = XLSX.read((ev.target as FileReader).result as string, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const headersRaw = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
        const headers = Array.isArray(headersRaw) ? headersRaw.map(cell => String(cell)) : [];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        resolve({ data, headers });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
}
