import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStoredTmdbKey } from '../utils/auth'
import { useWishlist } from '../hooks/useWishlist'

type Genre = {
  id: number
  name: string
}

type MovieDetail = {
  id: number
  title: string
  name?: string
  overview?: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  vote_average?: number
  genres?: Genre[]
  runtime?: number
  status?: string
  tagline?: string
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original'
const FALLBACK_POSTER = '/poster-fallback.svg'

const formatReleaseDate = (value?: string) => {
  if (!value) return '개봉일 정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '개봉일 정보 없음'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatRuntime = (value?: number) => {
  if (!value || value <= 0) return null
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  }
  return `${minutes}분`
}

const MovieDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tmdbKey: contextKey } = useAuth()
  const resolvedKey = useMemo(() => (contextKey || getStoredTmdbKey()).trim(), [contextKey])
  const { toggleWishlist, isInWishlist } = useWishlist()

  const [movie, setMovie] = useState<MovieDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchMovie = useCallback(async () => {
    if (!id) {
      setError('URL에 영화 ID가 없습니다.')
      setMovie(null)
      setLoading(false)
      return
    }

    if (!resolvedKey) {
      setError('상세 정보를 불러오려면 로그인 페이지에서 TMDB API 키를 등록해주세요.')
      setMovie(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const useBearer = resolvedKey.startsWith('eyJ')
      const url = new URL(`${TMDB_BASE_URL}/movie/${id}`)

      if (!useBearer) {
        url.searchParams.set('api_key', resolvedKey)
      }

      const headers: HeadersInit = {
        Accept: 'application/json',
      }

      if (useBearer) {
        headers.Authorization = `Bearer ${resolvedKey}`
      }

      const response = await fetch(url.toString(), {
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('TMDB에서 제공된 API 키를 거부했습니다. 키를 다시 확인한 뒤 시도해주세요.')
        }
        if (response.status === 404) {
          throw new Error('해당 TMDB ID로 영화 정보를 찾을 수 없습니다.')
        }
        throw new Error('지금은 이 영화를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
      }

      const payload = (await response.json()) as MovieDetail
      const normalized: MovieDetail = {
        ...payload,
        title: payload.title || payload.name || '제목 미정',
      }

      setMovie(normalized)
    } catch (fetchError) {
      if (controller.signal.aborted) return

      setMovie(null)
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : '이 TMDB 작품을 불러오는 중 문제가 발생했습니다.',
      )
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [id, resolvedKey])

  useEffect(() => {
    fetchMovie()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchMovie])

  useEffect(() => {
    if (!movie) {
      setIsWishlisted(false)
      return
    }
    setIsWishlisted(isInWishlist(movie.id))
  }, [isInWishlist, movie])

  const posterUrl = movie?.poster_path
    ? `${TMDB_POSTER_BASE}${movie.poster_path}`
    : FALLBACK_POSTER
  const backdropStyle = movie?.backdrop_path
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(10, 10, 10, 0.95), rgba(10, 10, 10, 0.7)), url(${TMDB_BACKDROP_BASE}${movie.backdrop_path})`,
      }
    : undefined
  const formattedRelease = formatReleaseDate(movie?.release_date)
  const runtimeLabel = formatRuntime(movie?.runtime)
  const overviewText = movie?.overview?.trim() || '설명이 준비되어 있지 않습니다.'
  const ratingLabel =
    typeof movie?.vote_average === 'number' ? movie.vote_average.toFixed(1) : 'NR'

  const handleWishlistToggle = () => {
    if (!movie) return

    toggleWishlist({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path ?? null,
    })
    setIsWishlisted((current) => !current)
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="page movie-detail-page">
      <div className="movie-detail" style={backdropStyle}>
        <div className="movie-detail__panel">
          <button type="button" className="detail-back-btn" onClick={handleBack}>
            ← 뒤로가기
          </button>
          {loading ? (
            <div className="movie-detail__status" role="status">
              <span className="loading-spinner" aria-hidden="true" />
              <p>상세 정보를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="movie-detail__status movie-detail__status--error" role="alert">
              <p>{error}</p>
              <div className="movie-detail__status-actions">
                <button type="button" onClick={fetchMovie}>
                  다시 시도
                </button>
              </div>
            </div>
          ) : movie ? (
            <div className="movie-detail__content" aria-live="polite">
              <div className="movie-detail__hero">
                <div className="movie-detail__poster">
                  <img src={posterUrl} alt={`${movie.title} 포스터`} />
                </div>
                <div className="movie-detail__info">
                  <p className="movie-detail__eyebrow">지금 감상 중</p>
                  <h1>{movie.title}</h1>
                  {movie.tagline && (
                    <p className="movie-detail__tagline">&ldquo;{movie.tagline}&rdquo;</p>
                  )}
                  <div className="movie-detail__meta">
                    <div>
                      <span>평균 평점</span>
                      <strong>{ratingLabel}</strong>
                    </div>
                    <div>
                      <span>개봉일</span>
                      <strong>{formattedRelease}</strong>
                    </div>
                    {runtimeLabel && (
                      <div>
                        <span>상영 시간</span>
                        <strong>{runtimeLabel}</strong>
                      </div>
                    )}
                  </div>
                  <div className="movie-detail__genres" aria-label="장르">
                    {(movie.genres ?? []).length > 0 ? (
                      (movie.genres ?? []).map((genre) => (
                        <span key={genre.id} className="movie-detail__genre">
                          {genre.name}
                        </span>
                      ))
                    ) : (
                      <span className="movie-detail__genre movie-detail__genre--placeholder">
                        등록된 장르가 없습니다
                      </span>
                    )}
                  </div>
                  <p className="movie-detail__overview">{overviewText}</p>
                  <div className="movie-detail__actions">
                    <button
                      type="button"
                      className={`detail-wishlist ${isWishlisted ? 'is-active' : ''}`}
                      onClick={handleWishlistToggle}
                    >
                      {isWishlisted ? '위시리스트에서 제거' : '위시리스트에 추가'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default MovieDetailPage
