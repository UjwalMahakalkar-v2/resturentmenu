/** Tiny dependency-free exporters for inventory reports: CSV download + print-to-PDF. */

export interface Column { key: string; label: string; }

function csvEscape(v: any): string {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Download rows as a CSV file (opens cleanly in Excel / Google Sheets). */
export function downloadCSV(filename: string, columns: Column[], rows: any[]) {
  const head = columns.map(c => csvEscape(c.label)).join(',');
  const body = rows.map(r => columns.map(c => csvEscape(r[c.key])).join(',')).join('\r\n');
  const csv = '﻿' + head + '\r\n' + body; // BOM so Excel reads UTF-8 (₹) correctly
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function htmlEscape(v: any): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Open a print-friendly window and trigger the browser print dialog (user can Save as PDF). */
export function printReport(title: string, subtitle: string, columns: Column[], rows: any[]) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  const thead = columns.map(c => `<th>${htmlEscape(c.label)}</th>`).join('');
  const tbody = rows.length
    ? rows.map(r => `<tr>${columns.map(c => `<td>${htmlEscape(r[c.key])}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:#9a938b;padding:24px">No data</td></tr>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title>
    <style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1a18;margin:28px}
      h1{font-size:20px;margin:0 0 2px} .sub{color:#9a938b;font-size:12px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;background:#f4f1ee;padding:8px 10px;border-bottom:2px solid #ddd;text-transform:uppercase;font-size:10px;letter-spacing:.4px;color:#6b645d}
      td{padding:7px 10px;border-bottom:1px solid #eee}
      tr:nth-child(even) td{background:#fbfaf8}
      @media print{ .noprint{display:none} }
    </style></head><body>
    <h1>${htmlEscape(title)}</h1><div class="sub">${htmlEscape(subtitle)} · ${rows.length} rows</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    <script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>
    </body></html>`);
  w.document.close();
}
