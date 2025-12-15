import { useAuth } from '../context/AuthContext'

const sampleEndpoint = `https://api.themoviedb.org/3/movie/popular?language=en-US&page=1`

const HomePage = () => {
  const { tmdbKey } = useAuth()
  const header = tmdbKey ? `Bearer ${tmdbKey}` : 'Bearer <TMDB API KEY>'

  return (
    <div className="page home-page">
      <section className="page-hero">
        <p className="eyebrow">Authenticated</p>
        <h1>Welcome back! Your TMDB key is ready for API calls.</h1>
        <p>
          The application keeps you signed in via LocalStorage so that every SPA route can grab
          your TMDB credentials and build authorized requests. Use the snippets below to wire the
          key into your own fetch logic.
        </p>
      </section>

      <section className="card-grid">
        <article className="info-card">
          <h3>LocalStorage schema</h3>
          <ul>
            <li>
              <strong>users</strong> – persisted email + TMDB key pairs
            </li>
            <li>
              <strong>TMDb-Key</strong> – cached key for live API calls
            </li>
            <li>
              <strong>isLogin</strong> – route guard flag
            </li>
            <li>
              <strong>rememberId</strong> – optional saved email
            </li>
          </ul>
        </article>

        <article className="info-card">
          <h3>Security note</h3>
          <p>
            In production your API key should never live inside a browser. This classroom demo keeps
            everything client-side so you can focus on UI development without wiring a backend
            service.
          </p>
        </article>
      </section>

      <section className="code-card">
        <header>
          <h3>Sample TMDB request</h3>
          <span className="badge">Uses TMDb-Key from LocalStorage</span>
        </header>
        <pre>
          <code>{`fetch('${sampleEndpoint}', {
  headers: {
    Authorization: '${header}',
    Accept: 'application/json',
  },
});`}</code>
        </pre>
      </section>
    </div>
  )
}

export default HomePage
