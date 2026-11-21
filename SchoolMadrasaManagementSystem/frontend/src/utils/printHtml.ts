export function printHtml(title: string, bodyHtml: string) {
    const printWindow = window.open('', '_blank', 'width=900,height=1200')

    if (!printWindow) {
        alert('Please allow popups to print.')
        return
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 24px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
                th { background: #f0fdf4; color: #065f46; }
                h2, h3 { margin: 0 0 4px; }
                .text-right { text-align: right; }
                .text-xs { font-size: 11px; color: #64748b; margin: 2px 0; }
                .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; text-align: center; font-size: 11px; color: #64748b; }
                .signatures div { border-top: 1px solid #94a3b8; padding-top: 4px; }
            </style>
        </head>
        <body>${bodyHtml}</body>
        </html>
    `)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
        printWindow.print()
    }, 250)
}

export function buildBrandedHeader(
    reportTitle: string,
    institutionName?: string | null,
    logoPath?: string | null,
    apiOrigin?: string,
): string {
    const logoHtml =
        logoPath && apiOrigin
            ? `<img src="${apiOrigin}${logoPath}" style="height:56px;width:56px;object-fit:contain;border-radius:8px;" />`
            : ''

    return `
        <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #047857;padding-bottom:16px;margin-bottom:20px;">
            ${logoHtml}
            <div>
                <h2 style="margin:0;color:#065f46;">${institutionName ?? 'School & Madrasa Management System'}</h2>
                <p style="margin:2px 0;color:#64748b;font-size:12px;">${reportTitle}</p>
            </div>
        </div>
    `
}

export function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = String(value)

    // ISO datetime strings (e.g. "2026-10-07T00:00:00") -> plain date only
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
        return new Date(str).toLocaleDateString()
    }

    return str
}