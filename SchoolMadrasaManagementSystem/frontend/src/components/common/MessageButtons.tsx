import { MessageCircle, MessageSquareText } from 'lucide-react'
import { smsLink, whatsAppLink } from '../../utils/parentMessage'

interface Props {
    phone: string | null | undefined
    text: string
    compact?: boolean
}

// Two buttons: WhatsApp + SMS. Disabled with a hint when the student has no phone saved.
export function MessageButtons({ phone, text, compact }: Props) {
    const wa = whatsAppLink(phone, text)
    const sms = smsLink(phone, text)
    const base = compact
        ? 'inline-flex items-center rounded-lg p-1.5 text-sm'
        : 'inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium'

    if (!wa && !sms) {
        return <span className="text-xs text-slate-400">No parent phone saved</span>
    }

    return (
        <span className="inline-flex gap-2">
            {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className={`${base} ${compact ? 'text-green-700 hover:bg-green-50' : 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'}`} title="Send on WhatsApp">
                    <MessageCircle className={compact ? 'h-4 w-4' : 'mr-1.5 h-4 w-4'} />
                    {!compact && 'WhatsApp'}
                </a>
            )}
            {sms && (
                <a href={sms} className={`${base} ${compact ? 'text-sky-700 hover:bg-sky-50' : 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100'}`} title="Send SMS">
                    <MessageSquareText className={compact ? 'h-4 w-4' : 'mr-1.5 h-4 w-4'} />
                    {!compact && 'SMS'}
                </a>
            )}
        </span>
    )
}
