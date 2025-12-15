import { useState } from 'react'
import type { FormEvent } from 'react'

const WishlistPage = () => {
  const [wishlist, setWishlist] = useState<string[]>([])
  const [title, setTitle] = useState('')

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    setWishlist((prev) => [title.trim(), ...prev])
    setTitle('')
  }

  return (
    <div className="page">
      <section className="page-hero">
        <p className="eyebrow">Wishlist</p>
        <h1>Track movies you want to stream once they hit TMDB.</h1>
        <p>
          Because LocalStorage is already hydrated with your profile, any personalized feature can
          live entirely on the client. Expand this list by syncing with your own endpoints.
        </p>
      </section>

      <form className="wishlist-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Add a movie or TV title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit">Save</button>
      </form>

      <ul className="wishlist-list">
        {wishlist.length === 0 && <li className="empty">Your wishlist is empty.</li>}
        {wishlist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default WishlistPage
