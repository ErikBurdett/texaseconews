import { useEffect, useRef, useState } from "react";
import { countySearchText, normalizeCountySearch, texasCounties, type TexasCounty } from "../data/counties";
import { countyPlaces } from "../data/county-places";

const suggestedSlugs = ["harris", "dallas", "tarrant", "travis", "bexar", "el-paso"];

export function CountyCombobox({ selected, canAdd, onSelect }: {
  selected: readonly string[];
  canAdd: boolean;
  onSelect: (county: TexasCounty) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const term = normalizeCountySearch(query).trim();
  const candidates = texasCounties.filter((county) => !selected.includes(county.slug));
  const matches = term
    ? candidates.filter((county) => normalizeCountySearch(countySearchText(county)).includes(term)).sort((a, b) => {
      const score = (county: TexasCounty) => normalizeCountySearch(county.name) === term ? 0 : normalizeCountySearch(county.name).startsWith(term) ? 1 : 2;
      return score(a) - score(b) || a.name.localeCompare(b.name);
    })
    : suggestedSlugs.flatMap((slug) => candidates.filter((county) => county.slug === slug));
  const results = matches.slice(0, 8);
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    if (open) list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function choose(county: TexasCounty) {
    if (!onSelect(county)) return;
    setQuery("");
    setOpen(false);
    setActive(0);
    input.current?.focus();
  }

  return <div className="county-combobox" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label className="county-search-label" htmlFor="county-search">Choose counties <span>Up to 4</span></label>
    <div className={`county-search-field${open ? " is-open" : ""}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      <input id="county-search" ref={input} role="combobox" autoComplete="off" aria-autocomplete="list"
        aria-expanded={open} aria-controls="county-results" aria-describedby={open ? "county-search-help county-search-status" : "county-search-help"}
        aria-activedescendant={open && results.length ? `county-option-${results[activeIndex].slug}` : undefined}
        placeholder="Search a county or city…" value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setOpen(true);
            setActive(open ? (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + results.length) % Math.max(1, results.length) : 0);
          }
          if (event.key === "Enter" && open) { event.preventDefault(); if (results[activeIndex]) choose(results[activeIndex]); }
        }} />
      {query ? <button type="button" aria-label="Clear county search" onClick={() => { setQuery(""); setActive(0); input.current?.focus(); }}>×</button>
        : <span className="search-chevron" aria-hidden="true">⌄</span>}
    {open ? <div className="county-results-panel">
      <div className="results-caption">{term ? "Matching counties" : "Popular counties"}<span>{selected.length}/4 selected</span></div>
      <ul id="county-results" ref={list} role="listbox" aria-label="County search results">
        {results.map((county, index) => {
          const towns = countyPlaces[county.fips] ?? [];
          const matchingTown = term ? towns.find((town) => normalizeCountySearch(town).includes(term)) : undefined;
          return <li key={county.slug} id={`county-option-${county.slug}`} role="option" aria-selected={false} aria-disabled={!canAdd}
            className={index === activeIndex ? "active" : ""} onMouseEnter={() => setActive(index)}
            onMouseDown={(event) => event.preventDefault()} onClick={() => choose(county)}>
            <span><strong>{county.displayName}</strong><small>{matchingTown ? `${matchingTown} · ` : ""}{county.metro || towns.slice(0, 2).join(" · ") || "Texas"}</small></span>
            <span aria-hidden="true" className="option-add">+</span>
          </li>;
        })}
      </ul>
      {!results.length ? <p className="county-empty">No available counties match “{query}”. Try a county or city name, or check your selected counties.</p> : null}
      <p id="county-search-status" role="status" className="results-footer">{!canAdd ? "Selection limit reached. Remove a county or another filter to add more." : term ? `${matches.length} matching ${matches.length === 1 ? "county" : "counties"}${matches.length > 8 ? "; showing the first 8. Keep typing to narrow results." : ". Select one to add it to your feed."}` : "Search all 254 counties by county or city name."}</p>
    </div> : null}
    </div>
    <p id="county-search-help" className="search-hint">Search by county or city. Add more than one to follow a region.</p>
  </div>;
}
