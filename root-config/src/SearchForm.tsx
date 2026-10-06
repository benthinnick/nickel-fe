import { FormEvent, useEffect, useState } from "react"
import { navigateToUrl } from "single-spa"
import { suggestNames } from "@shekel/api"

export function SearchForm(props: { initialQuery: string }) {
  const [draft, setDraft] = useState(props.initialQuery)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    setDraft(props.initialQuery)
  }, [props.initialQuery])

  useEffect(() => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const handle = window.setTimeout(() => {
      void suggestNames(trimmed)
        .then((result) => {
          if (!cancelled) setSuggestions(result.queries.filter((name) => name !== trimmed))
        })
        .catch(() => {
          if (!cancelled) setSuggestions([])
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [draft])

  function go(query: string) {
    const trimmed = query.trim()
    navigateToUrl(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search")
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    go(draft)
  }

  return (
    <form className="search" onSubmit={onSubmit} role="search">
      <div className="search-row">
        <input
          aria-label="Search products"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search by name"
        />
        <button className="button" type="submit">
          Search
        </button>
      </div>
      {suggestions.length > 0 ? (
        <ul className="suggestions">
          {suggestions.map((name) => (
            <li key={name}>
              <button type="button" onClick={() => go(name)}>
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}
