import MovieCard from './MovieCard'
import type { Movie } from '../hooks/useMovies'

type MovieSectionProps = {
  title: string
  movies: Movie[]
  loading: boolean
  error: string | null
  onToggleWishlist: (movie: Movie) => void
  isInWishlist: (id: number) => boolean
}

const MovieSection = ({
  title,
  movies,
  loading,
  error,
  onToggleWishlist,
  isInWishlist,
}: MovieSectionProps) => {
  const shouldRenderCards = !loading && !error && movies.length > 0

  return (
    <section className="movie-section" aria-label={title}>
      <div className="movie-section__header">
        <h2>{title}</h2>
        {movies.length > 0 && <span className="movie-section__count">{movies.length} titles</span>}
      </div>

      {loading && (
        <div className="section-feedback section-feedback--loading" role="status">
          <span className="loading-spinner" aria-hidden="true" /> Loading {title}...
        </div>
      )}

      {!loading && error && (
        <div className="section-feedback section-feedback--error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && movies.length === 0 && (
        <div className="section-feedback section-feedback--empty">
          No titles available right now. Please check back later.
        </div>
      )}

      {shouldRenderCards && (
        <div className="movie-carousel" role="list">
          {movies.map((movie) => (
            <div key={movie.id} role="listitem">
              <MovieCard
                movie={movie}
                wished={isInWishlist(movie.id)}
                onToggleWishlist={onToggleWishlist}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default MovieSection
