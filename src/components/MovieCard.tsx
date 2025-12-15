import { useId } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Movie } from '../hooks/useMovies'

type MovieCardProps = {
  movie: Movie
  wished: boolean
  onToggleWishlist: (movie: Movie) => void
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'
const FALLBACK_POSTER = '/poster-fallback.svg'

/**
 * Movie card interactions were redesigned to separate navigation and wishlist actions.
 * Card clicks open the detail route while the star button toggles wishlist state only.
 */
const getOverviewSnippet = (overview?: string) => {
  if (!overview || !overview.trim()) {
    return '아직 이 작품에 대한 소개가 제공되지 않았습니다.'
  }
  const trimmed = overview.trim()
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed
}

const MovieCard = ({ movie, wished, onToggleWishlist }: MovieCardProps) => {
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : FALLBACK_POSTER
  const titleId = useId()
  const navigate = useNavigate()

  const handleWishlistClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onToggleWishlist(movie)
  }

  const handleNavigate = () => {
    navigate(`/movie/${movie.id}`)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      handleNavigate()
    }
  }

  return (
    <article
      className={`movie-card ${wished ? 'is-wished' : ''}`}
      role="link"
      tabIndex={0}
      aria-labelledby={titleId}
      aria-label={`${movie.title} 상세 정보 보기`}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
    >
      <div className="movie-card__poster">
        <img src={posterUrl} alt={`${movie.title} 포스터`} loading="lazy" />
      </div>
      <div className="movie-card__body">
        <div className="movie-card__title-row">
          <h3 id={titleId}>{movie.title}</h3>
          <button
            type="button"
            className={`wishlist-toggle ${wished ? 'is-active' : ''}`}
            onClick={handleWishlistClick}
            aria-pressed={wished}
            aria-label={`${movie.title}를 위시리스트${wished ? '에서 제거' : '에 추가'}`}
          >
            <span className="wishlist-indicator" aria-hidden="true">
              {wished ? '★' : '☆'}
            </span>
          </button>
        </div>
        <p>{getOverviewSnippet(movie.overview)}</p>
      </div>
    </article>
  )
}

export default MovieCard
