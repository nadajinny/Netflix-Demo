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
  { label: '인기도 (높은 순)', value: 'popularity.desc' },
  { label: '인기도 (낮은 순)', value: 'popularity.asc' },
  { label: '평점 (높은 순)', value: 'vote_average.desc' },
  { label: '개봉일 (최신순)', value: 'release_date.desc' },
  { label: '개봉일 (오래된순)', value: 'release_date.asc' },
]

const GENRE_OPTIONS = [
  { label: '전체 장르', value: '' },
  { label: '액션', value: '28' },
  { label: '어드벤처', value: '12' },
  { label: '애니메이션', value: '16' },
  { label: '코미디', value: '35' },
  { label: '범죄', value: '80' },
  { label: '다큐멘터리', value: '99' },
  { label: '드라마', value: '18' },
  { label: '가족', value: '10751' },
  { label: '판타지', value: '14' },
  { label: '역사', value: '36' },
  { label: '공포', value: '27' },
  { label: '음악', value: '10402' },
  { label: '미스터리', value: '9648' },
  { label: '로맨스', value: '10749' },
  { label: 'SF', value: '878' },
  { label: '스릴러', value: '53' },
  { label: '전쟁', value: '10752' },
  { label: '서부', value: '37' },
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
 * The Search page allows users to filter and sort movie data dynamically using API parameters and
 * client-side data processing. This demonstrates interactive data handling and state-driven UI
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
        setError('검색 기능을 사용하려면 로그인 페이지에서 TMDB API 키를 등록해주세요.')
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

        url.searchParams.set('language', 'ko-KR')
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
            throw new Error('TMDB에서 제공된 API 키를 거부했습니다. 키를 다시 확인한 뒤 시도해주세요.')
          }
          throw new Error('지금은 검색 결과를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
        }

        const payload = (await response.json()) as { results?: Movie[] }
        const normalized = (payload.results ?? []).map((movie) => ({
          ...movie,
          title: movie.title || movie.name || '제목 미정',
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
            : '영화를 검색하는 중 문제가 발생했습니다.',
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
      setError('검색 기능을 사용하려면 로그인 페이지에서 TMDB 키를 연동해주세요.')
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

  const wishlistStatus =
    wishlist.length === 0 ? '위시리스트: 비어 있음' : `위시리스트: ${wishlist.length}개`

  const showEmptyState = hasFetched && !loading && !error && movies.length === 0

  return (
    <div className="page search-page">
      <section className="page-hero">
        <p className="eyebrow">콘텐츠 검색</p>
        <h1>브라우저에서 바로 작품을 검색하고 정렬해 보세요.</h1>
        <p>키워드를 입력하거나 필터를 사용해 실시간으로 결과를 좁혀보세요.</p>
      </section>

      <form className="search-panel" onSubmit={handleSubmit}>
        <div className="search-panel__query">
          <label htmlFor="search-query">키워드</label>
          <div className="search-panel__query-input">
            <input
              id="search-query"
              name="query"
              type="search"
              placeholder='예: "스파이더맨", "오펜하이머"...'
              value={filters.query}
              onChange={handleQueryChange}
              autoComplete="off"
            />
            <button type="submit">검색</button>
          </div>
        </div>

        <div className="search-panel__toggle-row">
          <span className="search-panel__hint">필터는 자동으로 적용됩니다.</span>
          <button type="button" className="search-panel__toggle" onClick={handleToggleFilters}>
            {filtersExpanded ? '필터 숨기기' : '필터 보기'}
          </button>
        </div>

        <div
          className={`search-panel__filters ${filtersExpanded ? 'is-open' : 'is-collapsed'}`}
          aria-hidden={!filtersExpanded}
        >
          <div className="filter-group">
            <label htmlFor="genre-filter">장르</label>
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
            <label htmlFor="sort-filter">정렬</label>
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
            <label htmlFor="rating-filter">최소 평점</label>
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
                {filters.rating > 0 ? `${filters.rating.toFixed(1)}+` : '모든 평점'}
              </span>
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="year-filter">개봉 연도</label>
            <select
              id="year-filter"
              name="year"
              value={filters.year}
              onChange={handleSelectChange}
            >
              <option value="">전체 연도</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="search-panel__actions">
            <button type="button" className="ghost-btn" onClick={handleResetFilters}>
              필터 초기화
            </button>
            <button type="button" className="search-panel__refresh" onClick={() => fetchMovies(filters)}>
              결과 새로고침
            </button>
          </div>
        </div>
      </form>

      <section className="search-status" aria-live="polite">
        <span className={`status-pill ${appliedFilterCount > 0 ? 'is-active' : ''}`}>
          필터: {appliedFilterCount}
        </span>
        <span className="status-pill">
          {loading ? '불러오는 중...' : `결과: ${movies.length}건`}
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
          <div className="search-results__overlay" aria-label="검색 결과 불러오는 중">
            <span className="loading-spinner" aria-hidden="true" />
            <span>데이터를 불러오는 중...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="search-feedback search-feedback--error" role="alert">
          {error}
          <button type="button" onClick={() => fetchMovies(filters)}>
            다시 시도
          </button>
        </div>
      )}

      {showEmptyState && (
        <p className="search-feedback search-feedback--empty">조건에 맞는 영화가 없습니다.</p>
      )}
    </div>
  )
}

export default SearchPage
