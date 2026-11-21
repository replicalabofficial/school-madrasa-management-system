export interface SystemSetting {
    id: number
    institutionName: string
    address: string | null
    phone: string | null
    email: string | null
    currency: string
    dateFormat: string
    academicSession: string
    logoPath: string | null
    isActive: boolean
}

export interface UpdateSystemSettingPayload {
    institutionName: string
    address?: string | null
    phone?: string | null
    email?: string | null
    currency: string
    dateFormat: string
    academicSession: string
    logoPath?: string | null
    isActive: boolean
}