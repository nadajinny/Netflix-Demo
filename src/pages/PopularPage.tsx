const demoTitles = [
  { title: 'The Demo Heist', mood: 'Action', tag: 'Route protected' },
  { title: 'Learning Reactively', mood: 'Documentary', tag: 'Client only' },
  { title: 'Guardians of LocalStorage', mood: 'Adventure', tag: 'SPA' },
  { title: 'Remember Me', mood: 'Drama', tag: 'Remember email' },
]

const PopularPage = () => {
  return (
    <div className="page">
      <section className="page-hero">
        <p className="eyebrow">Popular Collections</p>
        <h1>Every catalog item is now reachable with your TMDB credentials.</h1>
        <p>
          Replace these mock cards with actual TMDB data by reusing the fetch helper from the home
          page. All requests inherit the TMDB key from LocalStorage to keep the browsing experience
          seamless.
        </p>
      </section>

      <div className="popular-grid">
        {demoTitles.map((item) => (
          <article key={item.title} className="media-card">
            <div className="media-card__meta">
              <span className="badge">{item.tag}</span>
              <span className="pill">{item.mood}</span>
            </div>
            <h3>{item.title}</h3>
            <p>
              This placeholder proves the route guard is functioning. Swap me with TMDB data fetched
              using the stored API key.
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}

export default PopularPage
