import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import MovieDetailPage from './pages/MovieDetailPage'
import PopularPage from './pages/PopularPage'
import SearchPage from './pages/SearchPage'
import SignInPage from './pages/SignInPage'
import WishlistPage from './pages/WishlistPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="popular" element={<PopularPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="movie/:id" element={<MovieDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
