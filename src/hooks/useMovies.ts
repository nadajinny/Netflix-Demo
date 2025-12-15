import { useEffect, useState } from 'react'
import { getStoredTmdbKey } from '../utils/auth'

export type Movie = {
  id: number
  title: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path?: string | null
  release_date?: string
  vote_average?: number
  genre_ids?: number[]
  popularity?: number
  vote_count?: number
}

type UseMoviesResult = {
  movies: Movie[]
  loading: boolean
  error: string | null
}

type UseMoviesOptions = {
  tmdbKey?: string
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const movieCache = new Map<string, Movie[]>()

const canAbort = (error: unknown) =>
  error instanceof DOMException && (error.name === 'AbortError' || error.code === 20)

const isV4Token = (key: string) => key.trim().startsWith('eyJ')

export const useMovies = (endpoint: string, options?: UseMoviesOptions): UseMoviesResult => {
  const [movies, setMovies] = useState<Movie[]>(() => movieCache.get(endpoint) ?? [])
  const [loading, setLoading] = useState(() => !movieCache.has(endpoint))
  const [error, setError] = useState<string | null>(null)
  const resolvedKey = options?.tmdbKey?.trim() ?? null

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()
    const fallbackKey = getStoredTmdbKey()
    const tmdbKey = (resolvedKey ?? fallbackKey).trim()

    if (!tmdbKey) {
      setMovies([])
      setLoading(false)
      setError('영화를 불러오려면 로그인 화면에서 TMDB 키를 등록해주세요.')
      return () => {
        controller.abort()
      }
    }

    const fetchMovies = async () => {
      setLoading(true)
      setError(null)

      try {
        const useBearer = isV4Token(tmdbKey)
        const url = new URL(`${TMDB_BASE_URL}${endpoint}`)
        if (!useBearer) {
          url.searchParams.set('api_key', tmdbKey)
        }

        const headers: HeadersInit = {
          Accept: 'application/json',
        }

        if (useBearer) {
          headers.Authorization = `Bearer ${tmdbKey}`
        }

        const response = await fetch(url.toString(), {
          headers,
          signal: controller.signal,
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('TMDB에서 제공된 API 키를 거부했습니다. 키를 다시 확인한 뒤 시도해주세요.')
          }
          throw new Error('영화 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
        }

        const payload = (await response.json()) as { results?: Movie[] }
        const normalized = (payload.results ?? []).map((movie) => ({
          ...movie,
          title: movie.title || movie.name || '제목 미정',
        }))

        if (!ignore) {
          setMovies(normalized)
          movieCache.set(endpoint, normalized)
        }
      } catch (fetchError) {
        if (canAbort(fetchError) || ignore) return

        setMovies([])
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : '영화를 불러오는 중 문제가 발생했습니다.',
        )
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchMovies()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [endpoint, resolvedKey])

  return { movies, loading, error }
}

export default useMovies
