import type { Movie } from '../hooks/useMovies'
import MovieSection from '../components/MovieSection'
import { useAuth } from '../context/AuthContext'
import { useMovies } from '../hooks/useMovies'
import { useWishlist } from '../hooks/useWishlist'

/**
 * The Home page dynamically fetches multiple movie categories from the movie API and renders them
 * as independent sections. User interactions such as hover animations and wishlist toggling are
 * implemented using client-side state and LocalStorage synchronization.
 */

const SECTION_CONFIG = [
  {
    id: 'popular',
    title: '인기 영화',
    endpoint: '/movie/popular?language=ko-KR&page=1',
  },
  {
    id: 'now-playing',
    title: '상영 중',
    endpoint: '/movie/now_playing?language=ko-KR&page=1',
  },
  {
    id: 'top-rated',
    title: '최고 평점',
    endpoint: '/movie/top_rated?language=ko-KR&page=1',
  },
  {
    id: 'upcoming',
    title: '개봉 예정',
    endpoint: '/movie/upcoming?language=ko-KR&page=1',
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
    ? '저장된 TMDB 키를 사용 중입니다.'
    : '데이터를 불러오려면 TMDB 키를 연동해주세요.'

  return (
    <div className="page home-page">
      <section className="page-hero home-hero">
        <p className="eyebrow">당신만을 위한 허브</p>
        <h1>이 페이지에서 여러 영화 컬렉션을 한 번에 둘러보세요.</h1>
        <p>각 캐러셀은 실시간 데이터를 불러오고 위시리스트와 자동으로 동기화됩니다.</p>

        <div className="home-status">
          <article>
            <header>인증 상태</header>
            <strong>{tmdbKey ? 'TMDB 키 연동됨' : 'TMDB 키 없음'}</strong>
            <p>{tmdbStatus}</p>
          </article>
          <article>
            <header>위시리스트</header>
            <strong>{wishlist.length}개 저장됨</strong>
            <p>어떤 카드에서든 ☆ 를 눌러 추가하거나 해제하세요.</p>
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
