import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
}

export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = {
        hasError: false,
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return {
            hasError: true,
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Frontend error:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({
            hasError: false,
        })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>

                        <h1 className="mt-4 text-lg font-semibold text-slate-900">
                            Something went wrong
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            An unexpected frontend error occurred. Please try again.
                        </p>

                        <Button
                            type="button"
                            variant="secondary"
                            className="mt-5"
                            onClick={this.handleReset}
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}