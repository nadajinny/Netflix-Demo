import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const { tmdbKey } = useAuth()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // demo placeholder
  }

  return (
    <div className="page">
      <section className="page-hero">
        <p className="eyebrow">Search TMDB</p>
        <h1>Prototype a TMDB search experience without spinning up a backend.</h1>
        <p>
          This page highlights how you would capture a query, attach your TMDB key, and call the
          search endpoint. Add your own API wiring when you are ready.
        </p>
      </section>

      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Try 'Spider-Man', 'Top Gun', ..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Mock search</button>
      </form>

      <div className="code-card">
        <header>
          <h3>Fetch template</h3>
          <span className="badge subtle">Key pulled from LocalStorage</span>
        </header>
        <pre>
          <code>{`fetch('https://api.themoviedb.org/3/search/movie?query=${query || '<query>'}', {
  headers: {
    Authorization: 'Bearer ${tmdbKey || '<TMDB API KEY>'}',
  },
});`}</code>
        </pre>
      </div>
    </div>
  )
}

export default SearchPage
