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
        {movies.length > 0 && (
          <span className="movie-section__count">{movies.length}편의 작품</span>
        )}
      </div>

      {loading && (
        <div className="section-feedback section-feedback--loading" role="status">
          <span className="loading-spinner" aria-hidden="true" /> {title} 불러오는 중...
        </div>
      )}

      {!loading && error && (
        <div className="section-feedback section-feedback--error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && movies.length === 0 && (
        <div className="section-feedback section-feedback--empty">
          지금은 표시할 작품이 없습니다. 잠시 후 다시 확인해주세요.
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
