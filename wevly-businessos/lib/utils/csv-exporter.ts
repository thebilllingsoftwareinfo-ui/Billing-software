/**
 * Converts JSON objects array to CSV string formatted for spreadsheet download.
 */
export function generateCSV(headers: { key: string; label: string }[], rows: Record<string, any>[]): string {
  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key];
        if (val === null || val === undefined) return '""';
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(',')
  );

  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a browser download of CSV string content.
 */
export function downloadCSVClient(filename: string, headers: { key: string; label: string }[], rows: Record<string, any>[]) {
  const csvContent = generateCSV(headers, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
