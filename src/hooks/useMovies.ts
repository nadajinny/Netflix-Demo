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
      setError('Add your TMDB key on the sign-in screen to load movies.')
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
            throw new Error('TMDB rejected the provided API key. Double-check it and try again.')
          }
          throw new Error('TMDB responded with an error. Please try again later.')
        }

        const payload = (await response.json()) as { results?: Movie[] }
        const normalized = (payload.results ?? []).map((movie) => ({
          ...movie,
          title: movie.title || movie.name || 'Untitled',
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
            : 'Something went wrong while loading movies.',
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
