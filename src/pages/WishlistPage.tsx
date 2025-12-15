import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import type { Movie } from '../hooks/useMovies'
import { useWishlist } from '../hooks/useWishlist'

const createMovieFromWishlist = (entry: { id: number; title: string; poster_path: string | null }): Movie => ({
  id: entry.id,
  title: entry.title,
  overview: '탐색 중 저장된 항목입니다.',
  poster_path: entry.poster_path,
})

/**
 * The Wishlist page retrieves all movie data exclusively from LocalStorage and does not perform any
 * API calls. This demonstrates end-to-end client-side state management and persistence.
 */
const WishlistPage = () => {
  const { wishlist, toggleWishlist } = useWishlist()
  const wishlistMovies = useMemo(() => wishlist.map((entry) => createMovieFromWishlist(entry)), [wishlist])

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

  const wishlistCount = wishlistMovies.length
  const isEmpty = wishlistCount === 0

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
        <div className="wishlist-grid" aria-live="polite">
          {wishlistMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} wished onToggleWishlist={handleRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

export default WishlistPage
