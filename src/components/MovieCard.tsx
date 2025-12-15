import type { Movie } from '../hooks/useMovies'

type MovieCardProps = {
  movie: Movie
  wished: boolean
  onToggleWishlist: (movie: Movie) => void
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'
const FALLBACK_POSTER = '/poster-fallback.svg'

const getOverviewSnippet = (overview?: string) => {
  if (!overview || !overview.trim()) {
    return 'TMDB has not provided an overview for this title yet.'
  }
  const trimmed = overview.trim()
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed
}

const MovieCard = ({ movie, wished, onToggleWishlist }: MovieCardProps) => {
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : FALLBACK_POSTER

  return (
    <button
      type="button"
      className={`movie-card ${wished ? 'is-wished' : ''}`}
      onClick={() => onToggleWishlist(movie)}
      aria-pressed={wished}
      aria-label={`${wished ? 'Remove' : 'Add'} ${movie.title} ${wished ? 'from' : 'to'} wishlist`}
    >
      <div className="movie-card__poster">
        <img src={posterUrl} alt={`${movie.title} poster`} loading="lazy" />
      </div>
      <div className="movie-card__body">
        <div className="movie-card__title-row">
          <h3>{movie.title}</h3>
          <span className="wishlist-indicator" aria-hidden="true">
            {wished ? '★' : '☆'}
          </span>
        </div>
        <p>{getOverviewSnippet(movie.overview)}</p>
      </div>
    </button>
  )
}

export default MovieCard
