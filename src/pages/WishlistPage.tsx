import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import type { Movie } from '../hooks/useMovies'
import { useWishlist } from '../hooks/useWishlist'

const createMovieFromWishlist = (entry: { id: number; title: string; poster_path: string | null }): Movie => ({
  id: entry.id,
  title: entry.title,
  overview: 'Saved locally from TMDB browsing sessions.',
  poster_path: entry.poster_path,
})

/**
 * The Wishlist page retrieves all movie data exclusively from LocalStorage and does not perform any
 * API calls. This demonstrates end-to-end client-side state management and persistence.
 */
const WishlistPage = () => {
  const { wishlist, toggleWishlist } = useWishlist()
  const wishlistMovies = useMemo(() => wishlist.map((entry) => createMovieFromWishlist(entry)), [wishlist])

  const handleRemove = useCallback(
    (movie: Movie) => {
      toggleWishlist({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path ?? null,
      })
    },
    [toggleWishlist],
  )

  const wishlistCount = wishlistMovies.length
  const isEmpty = wishlistCount === 0

  return (
    <div className="page wishlist-page">
      <section className="page-hero">
        <p className="eyebrow">Wishlist</p>
        <h1>All of your saved TMDB titles live here.</h1>
        <p>
          Every card below is sourced straight from <code>LocalStorage</code> without calling TMDB
          again. Tap the star on a card to remove it and the change instantly syncs everywhere in the
          app.
        </p>
      </section>

      <section className="wishlist-summary">
        <article>
          <header>Saved titles</header>
          <strong>{wishlistCount}</strong>
          <p>{isEmpty ? 'Your wishlist is empty.' : 'Use the star to remove any title instantly.'}</p>
        </article>
        <article>
          <header>Storage</header>
          <strong>LocalStorage</strong>
          <p>Synced to the <code>movieWishlist</code> key and shared with every page.</p>
        </article>
      </section>

      {isEmpty ? (
        <div className="wishlist-empty">
          <p>You have no movies in your wishlist yet.</p>
          <p>Add favorites from any MovieCard or jump back into discovery below.</p>
          <div className="wishlist-empty__actions">
            <Link className="wishlist-action" to="/">
              Browse Home
            </Link>
            <Link className="wishlist-action ghost" to="/popular">
              Explore Popular
            </Link>
          </div>
        </div>
      ) : (
        <div className="wishlist-grid" aria-live="polite">
          {wishlistMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} wished onToggleWishlist={handleRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

export default WishlistPage
