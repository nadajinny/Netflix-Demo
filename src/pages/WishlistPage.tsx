import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import type { Movie } from '../hooks/useMovies'
import { useWishlist } from '../hooks/useWishlist'
import { useAuth } from '../context/AuthContext'
import { getStoredTmdbKey } from '../utils/auth'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

const isV4Token = (key: string) => key.trim().startsWith('eyJ')

/**
 * The Wishlist page retrieves all movie data exclusively from LocalStorage and does not perform any
 * API calls. This demonstrates end-to-end client-side state management and persistence.
 */
const WishlistPage = () => {
  const { wishlist, toggleWishlist } = useWishlist()
  const { tmdbKey: contextKey } = useAuth()
  const resolvedKey = useMemo(() => (contextKey || getStoredTmdbKey()).trim(), [contextKey])
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)

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

  const wishlistCount = wishlist.length
  const isEmpty = wishlistCount === 0

  useEffect(() => {
    requestRef.current?.abort()

    if (isEmpty) {
      setMovies([])
      setLoading(false)
      setError(null)
      return
    }

    if (!resolvedKey) {
      setMovies([])
      setLoading(false)
      setError('위시리스트를 불러오려면 로그인 페이지에서 TMDB 키를 등록해주세요.')
      return
    }

    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)

    const useBearer = isV4Token(resolvedKey)
    const headers: HeadersInit = useBearer
      ? {
          Accept: 'application/json',
          Authorization: `Bearer ${resolvedKey}`,
        }
      : {
          Accept: 'application/json',
        }

    const fetchWishlistDetails = async () => {
      try {
        const detailed = await Promise.all(
          wishlist.map(async (entry) => {
            try {
              const url = new URL(`${TMDB_BASE_URL}/movie/${entry.id}`)
              url.searchParams.set('language', 'ko-KR')
              if (!useBearer) {
                url.searchParams.set('api_key', resolvedKey)
              }

              const response = await fetch(url.toString(), {
                headers,
                signal: controller.signal,
              })

              if (!response.ok) {
                throw new Error('failed')
              }

              const payload = (await response.json()) as (Partial<Movie> & { id: number }) | null
              if (!payload) {
                throw new Error('missing payload')
              }

              const normalized: Movie = {
                id: payload.id,
                title: payload.title || payload.name || entry.title,
                overview: payload.overview?.trim() || '설명이 준비되어 있지 않습니다.',
                poster_path: payload.poster_path ?? entry.poster_path ?? null,
                backdrop_path: payload.backdrop_path ?? null,
                release_date: payload.release_date,
                vote_average: payload.vote_average,
                popularity: payload.popularity,
                vote_count: payload.vote_count,
              }

              return normalized
            } catch (itemError) {
              if (controller.signal.aborted) return null

              return {
                id: entry.id,
                title: entry.title,
                overview: '이 작품 정보를 불러오지 못했습니다.',
                poster_path: entry.poster_path ?? null,
              } as Movie
            }
          }),
        )

        if (!controller.signal.aborted) {
          setMovies(detailed.filter(Boolean) as Movie[])
        }
      } catch (listError) {
        if (controller.signal.aborted) return

        setError('위시리스트를 불러오는 중 문제가 발생했습니다.')
        setMovies(
          wishlist.map((entry) => ({
            id: entry.id,
            title: entry.title,
            overview: '이 작품 정보를 불러오지 못했습니다.',
            poster_path: entry.poster_path ?? null,
          })),
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchWishlistDetails()

    return () => controller.abort()
  }, [isEmpty, resolvedKey, wishlist])

  return (
    <div className="page wishlist-page">
      <section className="page-hero">
        <p className="eyebrow">위시리스트</p>
        <h1>저장해 둔 작품을 한곳에서 확인하세요.</h1>
        <p>마음에 든 타이틀을 모아두고 언제든 다시 이어서 감상하세요.</p>
      </section>

      <section className="wishlist-summary">
        <article>
          <header>저장된 작품</header>
          <strong>{wishlistCount}</strong>
          <p>{isEmpty ? '아직 저장된 항목이 없습니다.' : '별 표시를 눌러 언제든 제거하세요.'}</p>
        </article>
        <article>
          <header>보관 방식</header>
          <strong>이 기기</strong>
          <p>이 기기에 저장되어 언제든 확인할 수 있어요.</p>
        </article>
      </section>

      {isEmpty ? (
        <div className="wishlist-empty">
          <p>아직 저장된 영화가 없습니다.</p>
          <p>카드에서 바로 즐겨찾기를 추가하거나 아래 버튼으로 이동하세요.</p>
          <div className="wishlist-empty__actions">
            <Link className="wishlist-action" to="/">
              홈 둘러보기
            </Link>
            <Link className="wishlist-action ghost" to="/popular">
              인기작 보기
            </Link>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="section-feedback section-feedback--error" role="alert">
              {error}
            </div>
          )}

          {loading && (
            <div className="section-feedback section-feedback--loading" role="status">
              <span className="loading-spinner" aria-hidden="true" />
              <span>위시리스트를 불러오는 중...</span>
            </div>
          )}

          {!loading && movies.length === 0 && !error && (
            <div className="section-feedback section-feedback--empty" role="status">
              표시할 영화 정보를 찾을 수 없습니다.
            </div>
          )}

          {movies.length > 0 && (
            <div className="wishlist-grid" aria-live="polite">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} wished onToggleWishlist={handleRemove} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default WishlistPage
