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
        setError('Add your TMDB API key on the sign-in page to load popular titles.')
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
            throw new Error('TMDB rejected the provided API key. Double-check it and try again.')
          }
          throw new Error('Unable to load popular movies from TMDB. Please try again shortly.')
        }

        const payload = (await response.json()) as {
          results?: Movie[]
          page?: number
          total_pages?: number
        }

        const normalized = (payload.results ?? []).map((movie) => ({
          ...movie,
          title: movie.title || movie.name || 'Untitled',
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
            : 'Something went wrong while loading popular movies.',
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
      setError('Add your TMDB key via the sign-in page to unlock the popular catalog.')
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
    viewMode === 'table'
      ? 'Cards stay locked inside this grid. Use pagination to load the next TMDB page.'
      : 'Scroll down and the next TMDB page will load automatically with a smooth append.'

  const wishlistStatus =
    wishlist.length === 0
      ? 'Wishlist is empty. Use the star on any movie card to save it for later.'
      : `${wishlist.length} saved in wishlist - synced with LocalStorage`

  const showEmptyState = hasLoadedOnce && !loading && !error && movies.length === 0
  const showStageOverlay = loading && (viewMode === 'table' || movies.length === 0)

  return (
    <div className="page popular-page">
      <section className="page-hero">
        <p className="eyebrow">Popular Collections</p>
        <h1>Explore the TMDB popular feed with paginated and infinite experiences.</h1>
        <p>
          Each mode shares the same dataset and wishlist-aware cards. Table view demonstrates locked
          grids with pagination, whereas infinite scrolling streams more pages as you reach the end.
        </p>
      </section>

      <section className="popular-toolbar">
        <div className="popular-view-toggle" role="group" aria-label="Select view mode">
          <button
            type="button"
            className={viewMode === 'table' ? 'is-active' : ''}
            onClick={() => handleModeChange('table')}
          >
            Table View
          </button>
          <button
            type="button"
            className={viewMode === 'infinite' ? 'is-active' : ''}
            onClick={() => handleModeChange('infinite')}
          >
            Infinite Scroll
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
            <span>Loading TMDB data...</span>
          </div>
        )}

        {showEmptyState && (
          <p className="popular-feedback popular-feedback--empty">
            No movies available yet. Make sure your TMDB key is linked and try again.
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
              Retry
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
            Previous
          </button>
          <span className="popular-pagination__page">Page {page}</span>
          <button type="button" onClick={() => handlePaginate('next')} disabled={!hasMore || loading}>
            Next
          </button>
          {loading && (
            <span className="popular-pagination__loading">
              <span className="loading-spinner" aria-hidden="true" />
              Loading page...
            </span>
          )}
        </div>
      )}

      {viewMode === 'infinite' && (
        <div className="popular-infinite-footer" aria-live="polite">
          {loading && (
            <>
              <span className="loading-spinner" aria-hidden="true" />
              <span>Loading more titles...</span>
            </>
          )}
          {!loading && hasMore && <span>Scroll for more TMDB titles - Page {page}</span>}
          {!loading && !hasMore && movies.length > 0 && (
            <span>You have reached the end of TMDB&apos;s popular feed.</span>
          )}
        </div>
      )}

      <button
        type="button"
        className={`back-to-top ${showTopButton ? 'is-visible' : ''}`}
        onClick={handleBackToTop}
        aria-hidden={!showTopButton}
      >
        Back to Top
      </button>
    </div>
  )
}

export default PopularPage
