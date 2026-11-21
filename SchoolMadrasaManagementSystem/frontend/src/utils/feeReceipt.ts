import { API_ORIGIN } from '../api/client'
import { buildBrandedHeader, printHtml } from './printHtml'
import type { Fee } from '../types/fee'

const currency = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
const money = (value: number) => currency.format(value)

// Escape text before putting it into printable HTML
function esc(value: string | number | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function fmtDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
}

// Only an approved discount reduces the amount
export function approvedDiscount(fee: Fee): number {
    return fee.discountAmount > 0 && fee.discountApprovalStatus === 'Approved' ? fee.discountAmount : 0
}

export function netAmount(fee: Fee): number {
    return Math.max(0, fee.amount - approvedDiscount(fee))
}

// ---- Amount in words (Pakistani style: thousand, lakh, crore) ----
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n: number): string {
    if (n < 20) return ONES[n]
    return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`
}

function belowThousand(n: number): string {
    const h = Math.floor(n / 100)
    const r = n % 100
    return [h ? `${ONES[h]} Hundred` : '', r ? belowHundred(r) : ''].filter(Boolean).join(' ')
}

export function amountInWords(amount: number): string {
    let n = Math.round(amount)
    if (n === 0) return 'Zero Rupees Only'
    const parts: string[] = []
    const crore = Math.floor(n / 10000000); n %= 10000000
    const lakh = Math.floor(n / 100000); n %= 100000
    const thousand = Math.floor(n / 1000); n %= 1000
    if (crore) parts.push(`${belowThousand(crore)} Crore`)
    if (lakh) parts.push(`${belowHundred(lakh)} Lakh`)
    if (thousand) parts.push(`${belowHundred(thousand)} Thousand`)
    if (n) parts.push(belowThousand(n))
    return `${parts.join(' ')} Rupees Only`
}

const RECEIPT_STYLE = `
<style>
  .rc-copy { border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px 18px; margin-bottom: 14px; page-break-inside: avoid; }
  .rc-tag { float: right; font-size: 11px; font-weight: 700; letter-spacing: .08em; color: #047857; border: 1px solid #a7f3d0; background: #ecfdf5; padding: 2px 8px; border-radius: 99px; }
  .rc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 12.5px; margin: 8px 0 10px; }
  .rc-grid b { color: #0f172a; }
  .rc-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-top: 8px; }
  .rc-words { font-size: 11.5px; color: #475569; margin-top: 2px; }
  .rc-sign { display: flex; justify-content: space-between; margin-top: 26px; font-size: 11.5px; color: #475569; }
  .rc-sign span { border-top: 1px solid #94a3b8; padding-top: 3px; min-width: 150px; text-align: center; }
  .rc-cut { border-top: 1px dashed #94a3b8; margin: 10px 0 14px; text-align: center; font-size: 10px; color: #94a3b8; }
  .rc-due { color: #b91c1c; }
</style>`

interface PrintOptions {
    institutionName?: string
    logoPath?: string | null
    receivedBy?: string
}

function studentBlock(fee: Fee, numberLabel: string, numberValue: string, dateLabel: string, dateValue: string): string {
    return `
      <div class="rc-grid">
        <div>${esc(numberLabel)}: <b>${esc(numberValue)}</b></div>
        <div>${esc(dateLabel)}: <b>${esc(dateValue)}</b></div>
        <div>Student: <b>${esc(fee.student?.name ?? '')}</b></div>
        <div>GR No: <b>${esc(fee.student?.grNumber ?? '')}</b></div>
        <div>Class: <b>${esc(fee.student?.class ?? '')}</b></div>
        <div>Branch: <b>${esc(fee.branch?.name ?? '')}</b></div>
      </div>`
}

function feeRows(fees: Fee[]): string {
    return fees
        .map((f) => {
            const discount = approvedDiscount(f)
            return `<tr>
                <td>${esc(f.category)}</td>
                <td>${esc(f.feePeriod)}</td>
                <td>${money(f.amount)}</td>
                <td>${discount > 0 ? money(discount) : '-'}</td>
                <td>${money(netAmount(f))}</td>
            </tr>`
        })
        .join('')
}

/**
 * Cash receipt for one or more PAID fees of the same student.
 * Prints two copies on one page: Student copy and Office copy.
 */
export function printFeeReceipt(fees: Fee[], options: PrintOptions = {}) {
    const paid = fees.filter((f) => f.status === 'Paid')
    if (paid.length === 0) return

    const first = paid[0]
    const total = paid.reduce((s, f) => s + netAmount(f), 0)
    // One fee: its serial number. Several fees paid together: GR + date (one receipt for all)
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const receiptNo = paid.length === 1 ? first.serialNumber : `RCPT-${first.student?.grNumber ?? first.studentId}-${stamp}`
    const paidDate = fmtDate(paid.map((f) => f.paidDate).filter(Boolean).sort().pop() ?? null)

    const copy = (label: string) => `
      <div class="rc-copy">
        <span class="rc-tag">${esc(label)}</span>
        ${buildBrandedHeader('Fee Receipt', options.institutionName, options.logoPath, API_ORIGIN)}
        ${studentBlock(first, 'Receipt No', receiptNo, 'Date', paidDate)}
        <table>
          <thead><tr><th>Fee</th><th>Period</th><th>Amount</th><th>Discount</th><th>Received</th></tr></thead>
          <tbody>${feeRows(paid)}</tbody>
        </table>
        <div class="rc-total"><span>Total received in Cash</span><span>${money(total)}</span></div>
        <div class="rc-words">${esc(amountInWords(total))}</div>
        <div class="rc-sign">
          <span>Received by${options.receivedBy ? ': ' + esc(options.receivedBy) : ''}</span>
          <span>Stamp / Signature</span>
        </div>
      </div>`

    const html = `${RECEIPT_STYLE}${copy('STUDENT COPY')}<div class="rc-cut">✂ - - - - - - - - - - - - - - - - - - - - - - - -</div>${copy('OFFICE COPY')}`
    printHtml(`Fee Receipt ${first.serialNumber}`, html)
}

/**
 * Fee slip: all UNPAID fees of a student with the total due.
 * Prints two copies: Student copy and Office copy.
 */
export function printFeeSlip(fees: Fee[], options: PrintOptions = {}) {
    const due = fees.filter((f) => f.status !== 'Paid')
    if (due.length === 0) return

    const first = due[0]
    const total = due.reduce((s, f) => s + netAmount(f), 0)
    const today = fmtDate(null)
    const pendingDiscount = due.some((f) => f.discountAmount > 0 && f.discountApprovalStatus !== 'Approved')

    const copy = (label: string) => `
      <div class="rc-copy">
        <span class="rc-tag">${esc(label)}</span>
        ${buildBrandedHeader('Fee Due Slip', options.institutionName, options.logoPath, API_ORIGIN)}
        ${studentBlock(first, 'GR No', first.student?.grNumber ?? '', 'Issue date', today)}
        <table>
          <thead><tr><th>Fee</th><th>Period</th><th>Amount</th><th>Discount</th><th>Payable</th></tr></thead>
          <tbody>${feeRows(due)}</tbody>
        </table>
        <div class="rc-total rc-due"><span>Total due</span><span>${money(total)}</span></div>
        <div class="rc-words">${esc(amountInWords(total))}</div>
        ${pendingDiscount ? '<div class="rc-words">* A discount is waiting for Head Office approval and is not deducted yet.</div>' : ''}
        <div class="rc-sign">
          <span>Accounts Office</span>
          <span>Parent / Guardian</span>
        </div>
      </div>`

    const html = `${RECEIPT_STYLE}${copy('STUDENT COPY')}<div class="rc-cut">✂ - - - - - - - - - - - - - - - - - - - - - - - -</div>${copy('OFFICE COPY')}`
    printHtml(`Fee Due Slip ${first.student?.grNumber ?? ''}`, html)
}