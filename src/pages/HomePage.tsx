import type { Movie } from '../hooks/useMovies'
import MovieSection from '../components/MovieSection'
import { useAuth } from '../context/AuthContext'
import { useMovies } from '../hooks/useMovies'
import { useWishlist } from '../hooks/useWishlist'

/**
 * The Home page dynamically fetches multiple movie categories from the TMDB API and renders them as
 * independent sections. User interactions such as hover animations and wishlist toggling are
 * implemented using client-side state and LocalStorage synchronization.
 */

const SECTION_CONFIG = [
  {
    id: 'popular',
    title: 'Popular Movies',
    endpoint: '/movie/popular?language=en-US&page=1',
  },
  {
    id: 'now-playing',
    title: 'Now Playing',
    endpoint: '/movie/now_playing?language=en-US&page=1',
  },
  {
    id: 'top-rated',
    title: 'Top Rated',
    endpoint: '/movie/top_rated?language=en-US&page=1',
  },
  {
    id: 'upcoming',
    title: 'Upcoming Movies',
    endpoint: '/movie/upcoming?language=en-US&page=1',
  },
] as const

const HomePage = () => {
  const { tmdbKey } = useAuth()
  const { wishlist, toggleWishlist, isInWishlist } = useWishlist()

  const popularState = useMovies(SECTION_CONFIG[0].endpoint, { tmdbKey })
  const nowPlayingState = useMovies(SECTION_CONFIG[1].endpoint, { tmdbKey })
  const topRatedState = useMovies(SECTION_CONFIG[2].endpoint, { tmdbKey })
  const upcomingState = useMovies(SECTION_CONFIG[3].endpoint, { tmdbKey })

  const sections = [
    { ...SECTION_CONFIG[0], ...popularState },
    { ...SECTION_CONFIG[1], ...nowPlayingState },
    { ...SECTION_CONFIG[2], ...topRatedState },
    { ...SECTION_CONFIG[3], ...upcomingState },
  ]

  const handleToggleWishlist = (movie: Movie) => {
    toggleWishlist({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path ?? null,
    })
  }

  const tmdbStatus = tmdbKey
    ? 'Requests use your TMDB key straight from LocalStorage.'
    : 'Link your TMDB key on the sign-in page to start fetching data.'

  return (
    <div className="page home-page">
      <section className="page-hero home-hero">
        <p className="eyebrow">Your curated hub</p>
        <h1>Browse multiple TMDB collections without leaving this page.</h1>
        <p>
          Each section below issues its own TMDB request, renders a dedicated carousel, and keeps
          wishlist interactions synced with LocalStorage for instant visual feedback.
        </p>

        <div className="home-status">
          <article>
            <header>Authentication</header>
            <strong>{tmdbKey ? 'Key linked' : 'Key missing'}</strong>
            <p>{tmdbStatus}</p>
          </article>
          <article>
            <header>Wishlist</header>
            <strong>{wishlist.length} saved</strong>
            <p>Tap any title to toggle its wishlist state in-place.</p>
          </article>
        </div>
      </section>

      {sections.map((section) => (
        <MovieSection
          key={section.id}
          title={section.title}
          movies={section.movies}
          loading={section.loading}
          error={section.error}
          onToggleWishlist={handleToggleWishlist}
          isInWishlist={isInWishlist}
        />
      ))}
    </div>
  )
}

export default HomePage
