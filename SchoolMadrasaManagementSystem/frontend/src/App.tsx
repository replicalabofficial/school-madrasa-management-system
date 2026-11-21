import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from './navigation/routes'
import { useAuthStore } from './stores/authStore'
import { LoadingScreen } from './components/feedback/LoadingScreen'

function App() {
    const isInitializing = useAuthStore((state) => state.isInitializing)
    const restoreSession = useAuthStore((state) => state.restoreSession)

    useEffect(() => {
        restoreSession()
    }, [restoreSession])

    const element = useRoutes(routes)

    if (isInitializing) {
        return <LoadingScreen message="Checking your session..." />
    }

    return element
}

export default App