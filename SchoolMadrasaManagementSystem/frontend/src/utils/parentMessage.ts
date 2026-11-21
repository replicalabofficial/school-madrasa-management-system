// WhatsApp / SMS messages to parents (opens the phone's app with the text ready — user presses Send)

const amount = (v: number) => `Rs ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(v)}`

// 03001234567 -> 923001234567 (WhatsApp needs the country code, no + or 0)
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
    const digits = (phone ?? '').replace(/\D/g, '')
    if (!digits) return null
    if (digits.startsWith('92') && digits.length === 12) return digits
    if (digits.startsWith('0') && digits.length === 11) return '92' + digits.slice(1)
    if (digits.length === 10 && digits.startsWith('3')) return '92' + digits
    return digits.length >= 10 ? digits : null
}

export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
    const n = toWhatsAppNumber(phone)
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null
}

// sms: link works on Android (opens Messages with the text filled)
export function smsLink(phone: string | null | undefined, text: string): string | null {
    const digits = (phone ?? '').replace(/\D/g, '')
    if (!digits) return null
    const local = digits.startsWith('92') && digits.length === 12 ? '0' + digits.slice(2) : digits
    return `sms:${local}?body=${encodeURIComponent(text)}`
}

interface StudentInfo {
    name: string
    grNumber: string
}

export function receiptMessage(student: StudentInfo, items: string[], total: number, receiptNo: string, institution?: string | null): string {
    return [
        'Assalam o Alaikum.',
        `${student.name} (GR ${student.grNumber}) ki fee ${amount(total)} wusool ho gayi hai${items.length ? ` (${items.join(', ')})` : ''}.`,
        `Receipt # ${receiptNo}`,
        `Shukriya${institution ? ` — ${institution}` : ''}`,
    ].join('\n')
}

export function duesMessage(student: StudentInfo, due: number, periods: string[], institution?: string | null): string {
    const list = periods.length > 4 ? `${periods.slice(0, 4).join(', ')} +${periods.length - 4}` : periods.join(', ')
    return [
        'Assalam o Alaikum.',
        `${student.name} (GR ${student.grNumber}) ki fee ${amount(due)} baqaya hai${list ? ` (${list})` : ''}.`,
        'Barah-e-karam jald jama karwa dein.',
        institution ? `— ${institution}` : '',
    ]
        .filter(Boolean)
        .join('\n')
}

export function familyDuesMessage(fatherName: string | null, total: number, children: { name: string; due: number }[], institution?: string | null): string {
    return [
        `Assalam o Alaikum${fatherName ? ` ${fatherName} sahab` : ''}.`,
        `Aap ke bachon ki kul baqaya fee ${amount(total)} hai:`,
        ...children.filter((c) => c.due > 0).map((c) => `• ${c.name}: ${amount(c.due)}`),
        'Barah-e-karam jald jama karwa dein.',
        institution ? `— ${institution}` : '',
    ]
        .filter(Boolean)
        .join('\n')
}
