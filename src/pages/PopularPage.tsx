import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MovieCard from '../components/MovieCard'
import type { Movie } from '../hooks/useMovies'
import { useAuth } from '../context/AuthContext'
import { getStoredTmdbKey } from '../utils/auth'
import { useWishlist } from '../hooks/useWishlist'

type ViewMode = 'table' | 'infinite'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

const isV4Token = (key: string) => key.trim().startsWith('eyJ')

/**
 * The Popular page supports both table-based pagination and infinite scrolling to demonstrate
 * different strategies for handling large datasets in a client-side SPA. Movie cards are
 * interactive and synchronized with a LocalStorage-based wishlist system.
 */
const PopularPage = () => {
  const { tmdbKey: contextKey } = useAuth()
  const resolvedKey = useMemo(() => (contextKey || getStoredTmdbKey()).trim(), [contextKey])
  const { wishlist, toggleWishlist, isInWishlist } = useWishlist()

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [movies, setMovies] = useState<Movie[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [showTopButton, setShowTopButton] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const requestController = useRef<AbortController | null>(null)
  const scrollDebounceRef = useRef<number | null>(null)
  const pendingPageRef = useRef<number | null>(null)

  const handleToggleWishlist = useCallback(
    (movie: Movie) => {
      toggleWishlist({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path ?? null,
      })
    },
    [toggleWishlist],
  )

  const fetchMovies = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!resolvedKey) {
        setMovies([])
        setHasMore(false)
        setError('인기 작품을 불러오려면 로그인 페이지에서 TMDB API 키를 등록해주세요.')
        setLoading(false)
        return
      }

      pendingPageRef.current = targetPage

      const controller = new AbortController()
      requestController.current?.abort()
      requestController.current = controller
      setLoading(true)
      setError(null)

      try {
        const useBearer = isV4Token(resolvedKey)
        const url = new URL(`${TMDB_BASE_URL}/movie/popular`)
        url.searchParams.set('page', String(targetPage))
        url.searchParams.set('language', 'ko-KR')

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
          throw new Error('인기 영화를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
        }

        const payload = (await response.json()) as {
          results?: Movie[]
          page?: number
          total_pages?: number
        }

        const normalized = (payload.results ?? []).map((movie) => ({
          ...movie,
          title: movie.title || movie.name || '제목 미정',
        }))

        setMovies((current) => {
          if (!append) {
            return normalized
          }
          const existingIds = new Set(current.map((item) => item.id))
          const deduped = normalized.filter((item) => !existingIds.has(item.id))
          return [...current, ...deduped]
        })
        setHasLoadedOnce(true)

        const newPage = payload.page ?? targetPage
        setPage(newPage)

        const moreAvailable = payload.total_pages
          ? newPage < payload.total_pages
          : normalized.length > 0

        setHasMore(moreAvailable)
        pendingPageRef.current = null
      } catch (fetchError) {
        if (controller.signal.aborted) return

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : '인기 영화를 불러오는 중 문제가 발생했습니다.',
        )
      } finally {
        if (requestController.current === controller) {
          requestController.current = null
        }
        setLoading(false)
      }
    },
    [resolvedKey],
  )

  useEffect(() => {
    return () => {
      requestController.current?.abort()
    }
  }, [])

  const resetAndLoadFirstPage = useCallback(() => {
    setMovies([])
    setPage(1)
    setHasMore(true)
    pendingPageRef.current = null
    setLoading(true)
    setHasLoadedOnce(false)

    if (!resolvedKey) {
      setError('인기 카탈로그를 이용하려면 로그인 페이지에서 TMDB 키를 연동해주세요.')
      setLoading(false)
      return
    }

    fetchMovies(1, false)
  }, [fetchMovies, resolvedKey])

  useEffect(() => {
    resetAndLoadFirstPage()
  }, [resetAndLoadFirstPage])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleScroll = () => {
      setShowTopButton(window.scrollY > 320)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (viewMode !== 'infinite' || typeof window === 'undefined') {
      return undefined
    }

    const handleScroll = () => {
      if (scrollDebounceRef.current) return

      scrollDebounceRef.current = window.setTimeout(() => {
        scrollDebounceRef.current = null

        const nearBottom =
          window.innerHeight + window.scrollY >= document.body.offsetHeight - 240

        if (nearBottom && hasMore && !loading) {
          const nextPage = page + 1
          fetchMovies(nextPage, true)
        }
      }, 120)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollDebounceRef.current) {
        window.clearTimeout(scrollDebounceRef.current)
        scrollDebounceRef.current = null
      }
    }
  }, [fetchMovies, hasMore, loading, page, viewMode])

  useEffect(() => {
    if (!isSwitching || typeof window === 'undefined') return undefined
    const timeout = window.setTimeout(() => setIsSwitching(false), 320)
    return () => window.clearTimeout(timeout)
  }, [isSwitching])

  const handleModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return
    setIsSwitching(true)
    setViewMode(mode)
    resetAndLoadFirstPage()
  }

  const handlePaginate = (direction: 'previous' | 'next') => {
    if (direction === 'previous' && page === 1) return
    if (direction === 'next' && !hasMore) return

    const targetPage = direction === 'previous' ? page - 1 : page + 1
    fetchMovies(targetPage, false)
  }

  const handleBackToTop = () => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const viewHint =
    viewMode === 'table' ? '페이지 이동 버튼을 사용하세요.' : '스크롤로 더 많은 작품을 불러오세요.'

  const wishlistStatus =
    wishlist.length === 0 ? '위시리스트: 비어 있음' : `위시리스트: ${wishlist.length}개 저장됨`

  const showEmptyState = hasLoadedOnce && !loading && !error && movies.length === 0
  const showStageOverlay = loading && (viewMode === 'table' || movies.length === 0)

  return (
    <div className="page popular-page">
      <section className="page-hero">
        <p className="eyebrow">인기 컬렉션</p>
        <h1>인기 피드를 페이지 매기기와 무한 스크롤로 탐색하세요.</h1>
        <p>원하는 방식으로 모드를 전환하며 둘러볼 수 있습니다.</p>
      </section>

      <section className="popular-toolbar">
        <div className="popular-view-toggle" role="group" aria-label="보기 모드 선택">
          <button
            type="button"
            className={viewMode === 'table' ? 'is-active' : ''}
            onClick={() => handleModeChange('table')}
          >
            표 형태
          </button>
          <button
            type="button"
            className={viewMode === 'infinite' ? 'is-active' : ''}
            onClick={() => handleModeChange('infinite')}
          >
            무한 스크롤
          </button>
        </div>
        <div className="popular-toolbar__status">
          <span>{viewHint}</span>
          <span>{wishlistStatus}</span>
        </div>
      </section>

      <div
        className={`popular-movie-stage ${
          viewMode === 'table' ? 'stage-table' : 'stage-infinite'
        } ${isSwitching ? 'is-switching' : ''}`}
      >
        <div className="popular-movie-grid">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              wished={isInWishlist(movie.id)}
              onToggleWishlist={handleToggleWishlist}
            />
          ))}
        </div>

        {showStageOverlay && (
          <div className="popular-overlay" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <span>데이터를 불러오는 중...</span>
          </div>
        )}

        {showEmptyState && (
          <p className="popular-feedback popular-feedback--empty">
            아직 표시할 영화가 없습니다. TMDB 키가 연동되어 있는지 확인한 뒤 다시 시도하세요.
          </p>
        )}

        {error && (
          <div className="popular-feedback popular-feedback--error" role="alert">
            {error}
            <button
              type="button"
              onClick={() => {
                const retryPage = pendingPageRef.current ?? Math.max(page, 1)
                const append = viewMode === 'infinite' && (movies.length > 0 || retryPage > 1)
                fetchMovies(retryPage, append)
              }}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {viewMode === 'table' && (
        <div className="popular-pagination" aria-live="polite">
          <button
            type="button"
            onClick={() => handlePaginate('previous')}
            disabled={page === 1 || loading}
          >
            이전
          </button>
          <span className="popular-pagination__page">페이지 {page}</span>
          <button type="button" onClick={() => handlePaginate('next')} disabled={!hasMore || loading}>
            다음
          </button>
          {loading && (
            <span className="popular-pagination__loading">
              <span className="loading-spinner" aria-hidden="true" />
              페이지 불러오는 중...
            </span>
          )}
        </div>
      )}

      {viewMode === 'infinite' && (
        <div className="popular-infinite-footer" aria-live="polite">
          {loading && (
            <>
              <span className="loading-spinner" aria-hidden="true" />
              <span>더 많은 작품을 불러오는 중...</span>
            </>
          )}
          {!loading && hasMore && <span>더 많은 작품을 보려면 스크롤하세요 - 페이지 {page}</span>}
          {!loading && !hasMore && movies.length > 0 && <span>이 피드의 끝까지 도달했습니다.</span>}
        </div>
      )}

      <button
        type="button"
        className={`back-to-top ${showTopButton ? 'is-visible' : ''}`}
        onClick={handleBackToTop}
        aria-hidden={!showTopButton}
      >
        맨 위로 이동
      </button>
    </div>
  )
}

export default PopularPage
