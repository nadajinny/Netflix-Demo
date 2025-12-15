import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isLoggedIn } from '../utils/auth'

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const allowed = isAuthenticated || isLoggedIn()

  if (!allowed) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
