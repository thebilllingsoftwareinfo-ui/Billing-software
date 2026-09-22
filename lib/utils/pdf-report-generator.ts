/**
 * Formats a clean HTML string designed for browser printing / PDF saving of business reports.
 */
export function generatePDFReportHTML(
  title: string,
  organizationName: string,
  dateRangeStr: string,
  headers: { key: string; label: string; align?: 'left' | 'right' | 'center' }[],
  rows: Record<string, any>[],
  summaryCards?: { title: string; value: string }[]
): string {
  const summaryHtml = summaryCards
    ? `
    <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
      ${summaryCards
        .map(
          (card) => `
        <div style="flex: 1; min-width: 160px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div style="font-size: 12px; color: #64748b; font-weight: 500;">${card.title}</div>
          <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px;">${card.value}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `
    : '';

  const tableHeaderHtml = headers
    .map(
      (h) => `
      <th style="padding: 10px 12px; text-align: ${h.align || 'left'}; border-bottom: 2px solid #cbd5e1; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600;">
        ${h.label}
      </th>
    `
    )
    .join('');

  const tableRowsHtml = rows
    .map(
      (row, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${headers
          .map(
            (h) => `
          <td style="padding: 10px 12px; text-align: ${h.align || 'left'}; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;">
            ${row[h.key] ?? '-'}
          </td>
        `
          )
          .join('')}
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${title} - ${organizationName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
          .org-name { font-size: 22px; font-weight: 800; color: #0f172a; }
          .report-title { font-size: 16px; font-weight: 600; color: #2563eb; margin-top: 4px; }
          .meta { text-align: right; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="org-name">${organizationName}</div>
            <div class="report-title">${title}</div>
          </div>
          <div class="meta">
            <div><strong>Period:</strong> ${dateRangeStr}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        ${summaryHtml}

        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by Wevly BusinessOS • Page 1 of 1
        </div>
      </body>
    </html>
  `;
}
