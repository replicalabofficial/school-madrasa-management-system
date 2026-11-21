import axios, { type AxiosError } from 'axios'

// Dev: backend on localhost:7013. Production: same domain (Nginx forwards /api to the backend)
export const API_ORIGIN = import.meta.env.DEV ? 'https://localhost:7013' : ''
export const API_BASE_URL = `${API_ORIGIN}/api`

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
})

export interface ApiErrorPayload {
    message: string
    status?: number
}

function extractErrorMessage(error: AxiosError): string {
    const data = error.response?.data as { message?: string } | undefined

    if (data?.message) {
        return data.message
    }

    if (error.code === 'ERR_NETWORK') {
        return 'Unable to reach the server. Please check your connection.'
    }

    return 'Something went wrong. Please try again.'
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
    unauthorizedHandler = handler
}

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login')

        if (error.response?.status === 401 && !isLoginRequest) {
            unauthorizedHandler?.()
        }

        const apiError: ApiErrorPayload = {
            message: extractErrorMessage(error),
            status: error.response?.status,
        }

        return Promise.reject(apiError)
    },
)