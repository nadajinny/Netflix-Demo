import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import MovieCard from '../components/MovieCard'
import type { Movie } from '../hooks/useMovies'
import { useAuth } from '../context/AuthContext'
import { getStoredTmdbKey } from '../utils/auth'
import { useWishlist } from '../hooks/useWishlist'

type SortOptionValue =
  | 'popularity.desc'
  | 'popularity.asc'
  | 'vote_average.desc'
  | 'release_date.desc'
  | 'release_date.asc'

type Filters = {
  query: string
  genre: string
  rating: number
  year: string
  sort: SortOptionValue
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

const SORT_OPTIONS: { label: string; value: SortOptionValue }[] = [
  { label: 'Popularity (High -> Low)', value: 'popularity.desc' },
  { label: 'Popularity (Low -> High)', value: 'popularity.asc' },
  { label: 'Rating (High -> Low)', value: 'vote_average.desc' },
  { label: 'Release Date (Newest)', value: 'release_date.desc' },
  { label: 'Release Date (Oldest)', value: 'release_date.asc' },
]

const GENRE_OPTIONS = [
  { label: 'All Genres', value: '' },
  { label: 'Action', value: '28' },
  { label: 'Adventure', value: '12' },
  { label: 'Animation', value: '16' },
  { label: 'Comedy', value: '35' },
  { label: 'Crime', value: '80' },
  { label: 'Documentary', value: '99' },
  { label: 'Drama', value: '18' },
  { label: 'Family', value: '10751' },
  { label: 'Fantasy', value: '14' },
  { label: 'History', value: '36' },
  { label: 'Horror', value: '27' },
  { label: 'Music', value: '10402' },
  { label: 'Mystery', value: '9648' },
  { label: 'Romance', value: '10749' },
  { label: 'Science Fiction', value: '878' },
  { label: 'Thriller', value: '53' },
  { label: 'War', value: '10752' },
  { label: 'Western', value: '37' },
]

const YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let year = currentYear; year >= 1980; year -= 1) {
    years.push(String(year))
  }
  return years
})()

const createDefaultFilters = (): Filters => ({
  query: '',
  genre: '',
  rating: 0,
  year: '',
  sort: 'popularity.desc',
})

const valueOrZero = (value?: number) => (typeof value === 'number' ? value : 0)
const releaseDateValue = (value?: string) => {
  if (!value) return 0
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const comparators: Record<SortOptionValue, (a: Movie, b: Movie) => number> = {
  'popularity.desc': (a, b) => valueOrZero(b.popularity) - valueOrZero(a.popularity),
  'popularity.asc': (a, b) => valueOrZero(a.popularity) - valueOrZero(b.popularity),
  'vote_average.desc': (a, b) => valueOrZero(b.vote_average) - valueOrZero(a.vote_average),
  'release_date.desc': (a, b) => releaseDateValue(b.release_date) - releaseDateValue(a.release_date),
  'release_date.asc': (a, b) => releaseDateValue(a.release_date) - releaseDateValue(b.release_date),
}

const applyFilterPipeline = (source: Movie[], filters: Filters) => {
  let filtered = source
  if (filters.genre) {
    const genreId = Number(filters.genre)
    filtered = filtered.filter((movie) => (movie.genre_ids ?? []).includes(genreId))
  }
  if (filters.rating > 0) {
    filtered = filtered.filter((movie) => (movie.vote_average ?? 0) >= filters.rating)
  }
  if (filters.year) {
    filtered = filtered.filter((movie) => (movie.release_date ?? '').startsWith(filters.year))
  }
  const sorter = comparators[filters.sort]
  return filtered.slice().sort(sorter)
}

const isV4Token = (key: string) => key.trim().startsWith('eyJ')

/**
 * The Search page allows users to filter and sort movie data dynamically using TMDB API parameters
 * and client-side data processing. This demonstrates interactive data handling and state-driven UI
 * updates in a SPA.
 */
const SearchPage = () => {
  const { tmdbKey: contextKey } = useAuth()
  const resolvedKey = useMemo(() => (contextKey || getStoredTmdbKey()).trim(), [contextKey])
  const { wishlist, toggleWishlist, isInWishlist } = useWishlist()
  const [filters, setFilters] = useState<Filters>(() => createDefaultFilters())
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const requestController = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)
  const firstLoadRef = useRef(true)

  const appliedFilterCount = useMemo(() => {
    let count = 0
    if (filters.query.trim()) count += 1
    if (filters.genre) count += 1
    if (filters.rating > 0) count += 1
    if (filters.year) count += 1
    if (filters.sort !== 'popularity.desc') count += 1
    return count
  }, [filters])

  const yearOptions = useMemo(() => YEAR_OPTIONS, [])

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setFilters((current) => ({ ...current, query: value }))
  }

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const field = event.target.name as 'genre' | 'sort' | 'year'
    setFilters((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleRatingChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilters((current) => ({ ...current, rating: Number(event.target.value) }))
  }

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

  const handleResetFilters = () => {
    setFilters(createDefaultFilters())
    setHasFetched(false)
  }

  const fetchMovies = useCallback(
    async (targetFilters: Filters) => {
      if (!resolvedKey) {
        setMovies([])
        setError('Add your TMDB API key on the sign-in page to unlock the search catalog.')
        setLoading(false)
        return
      }

      const controller = new AbortController()
      requestController.current?.abort()
      requestController.current = controller
      setLoading(true)
      setError(null)

      try {
        const useSearchEndpoint = !!targetFilters.query.trim()
        const endpoint = useSearchEndpoint ? '/search/movie' : '/discover/movie'
        const useBearer = isV4Token(resolvedKey)
        const url = new URL(`${TMDB_BASE_URL}${endpoint}`)

        url.searchParams.set('language', 'en-US')
        url.searchParams.set('include_adult', 'false')
        url.searchParams.set('page', '1')

        if (!useBearer) {
          url.searchParams.set('api_key', resolvedKey)
        }

        if (useSearchEndpoint) {
          url.searchParams.set('query', targetFilters.query.trim())
          if (targetFilters.year) {
            url.searchParams.set('primary_release_year', targetFilters.year)
          }
        } else {
          url.searchParams.set('sort_by', targetFilters.sort)
          if (targetFilters.genre) {
            url.searchParams.set('with_genres', targetFilters.genre)
          }
          if (targetFilters.year) {
            url.searchParams.set('primary_release_year', targetFilters.year)
          }
          if (targetFilters.rating > 0) {
            url.searchParams.set('vote_average.gte', String(targetFilters.rating))
            url.searchParams.set('vote_count.gte', '50')
          }
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
          throw new Error('Unable to load TMDB search results right now. Please try again shortly.')
        }

        const payload = (await response.json()) as { results?: Movie[] }
        const normalized = (payload.results ?? []).map((movie) => ({
          ...movie,
          title: movie.title || movie.name || 'Untitled',
        }))
        const filtered = applyFilterPipeline(normalized, targetFilters)
        setMovies(filtered)
        setHasFetched(true)
      } catch (fetchError) {
        if (controller.signal.aborted) return

        setMovies([])
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Something went wrong while searching TMDB.',
        )
      } finally {
        if (requestController.current === controller) {
          requestController.current = null
          setLoading(false)
        }
      }
    },
    [resolvedKey],
  )

  useEffect(() => {
    if (!resolvedKey) {
      setMovies([])
      setError('Add your TMDB key via the sign-in page to start searching TMDB.')
      setLoading(false)
      firstLoadRef.current = true
      return
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (firstLoadRef.current) {
      firstLoadRef.current = false
      fetchMovies(filters)
      return
    }

    debounceRef.current = window.setTimeout(() => {
      fetchMovies(filters)
    }, 350)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [fetchMovies, filters, resolvedKey])

  useEffect(() => () => requestController.current?.abort(), [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    fetchMovies(filters)
  }

  const handleToggleFilters = () => {
    setFiltersExpanded((current) => !current)
  }

  const wishlistStatus = wishlist.length === 0 ? 'Wishlist: empty' : `Wishlist: ${wishlist.length}`

  const showEmptyState = hasFetched && !loading && !error && movies.length === 0

  return (
    <div className="page search-page">
      <section className="page-hero">
        <p className="eyebrow">Search TMDB</p>
        <h1>Filter, sort, and wishlist TMDB titles without leaving the browser.</h1>
        <p>Type a keyword or use filters to refine the feed in real time.</p>
      </section>

      <form className="search-panel" onSubmit={handleSubmit}>
        <div className="search-panel__query">
          <label htmlFor="search-query">Keyword</label>
          <div className="search-panel__query-input">
            <input
              id="search-query"
              name="query"
              type="search"
              placeholder='Try "Spider-Man", "Oppenheimer", ...'
              value={filters.query}
              onChange={handleQueryChange}
              autoComplete="off"
            />
            <button type="submit">Search</button>
          </div>
        </div>

        <div className="search-panel__toggle-row">
          <span className="search-panel__hint">Filters update automatically.</span>
          <button type="button" className="search-panel__toggle" onClick={handleToggleFilters}>
            {filtersExpanded ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        <div
          className={`search-panel__filters ${filtersExpanded ? 'is-open' : 'is-collapsed'}`}
          aria-hidden={!filtersExpanded}
        >
          <div className="filter-group">
            <label htmlFor="genre-filter">Genre</label>
            <select
              id="genre-filter"
              name="genre"
              value={filters.genre}
              onChange={handleSelectChange}
            >
              {GENRE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter">Sorting</label>
            <select
              id="sort-filter"
              name="sort"
              value={filters.sort}
              onChange={handleSelectChange}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group filter-group--slider">
            <label htmlFor="rating-filter">Minimum rating</label>
            <div className="filter-group__slider">
              <input
                id="rating-filter"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.rating}
                onChange={handleRatingChange}
              />
              <span className="filter-group__value">
                {filters.rating > 0 ? `${filters.rating.toFixed(1)}+` : 'Any rating'}
              </span>
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="year-filter">Release year</label>
            <select
              id="year-filter"
              name="year"
              value={filters.year}
              onChange={handleSelectChange}
            >
              <option value="">Any year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="search-panel__actions">
            <button type="button" className="ghost-btn" onClick={handleResetFilters}>
              Reset filters
            </button>
            <button type="button" className="search-panel__refresh" onClick={() => fetchMovies(filters)}>
              Refresh results
            </button>
          </div>
        </div>
      </form>

      <section className="search-status" aria-live="polite">
        <span className={`status-pill ${appliedFilterCount > 0 ? 'is-active' : ''}`}>
          Filters: {appliedFilterCount}
        </span>
        <span className="status-pill">
          {loading ? 'Loading...' : `Results: ${movies.length}`}
        </span>
        <span className="status-pill">{wishlistStatus}</span>
      </section>

      <div className="search-results" aria-live="polite">
        <div className="search-grid">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              wished={isInWishlist(movie.id)}
              onToggleWishlist={handleToggleWishlist}
            />
          ))}
        </div>

        {loading && (
          <div className="search-results__overlay" aria-label="Loading TMDB search results">
            <span className="loading-spinner" aria-hidden="true" />
            <span>Loading TMDB data...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="search-feedback search-feedback--error" role="alert">
          {error}
          <button type="button" onClick={() => fetchMovies(filters)}>
            Retry
          </button>
        </div>
      )}

      {showEmptyState && (
        <p className="search-feedback search-feedback--empty">No movies match right now.</p>
      )}
    </div>
  )
}

export default SearchPage
