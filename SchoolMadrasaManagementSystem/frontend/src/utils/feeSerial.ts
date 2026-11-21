import { FEE_CATEGORY_CODE } from '../types/fee'

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

// Same format as the Fees page: GR-CAT-MMMYYYY  (e.g. 1001-MF-OCT2026)
export function buildSerialNumber(grNumber: string, category: string, month: string, year: number): string {
    const monthAbbr = month.slice(0, 3).toUpperCase()
    const catCode = FEE_CATEGORY_CODE[category] ?? category.slice(0, 3).toUpperCase()
    return `${grNumber}-${catCode}-${monthAbbr}${year}`
}

export function buildYearOptions(): number[] {
    const currentYear = new Date().getFullYear()
    return [currentYear - 1, currentYear, currentYear + 1]
}