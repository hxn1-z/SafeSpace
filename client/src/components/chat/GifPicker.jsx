import React, { useEffect, useMemo, useRef } from "react";
import { gifKey } from "../../utils/gifHelpers";

export default function GifPicker({
  isOpen,
  onClose,
  query,
  setQuery,
  tab,
  setTab,
  results,
  favorites,
  favoriteKeys,
  onToggleFavorite,
  onSelectGif,
  isLoading,
  error,
  sendingKey,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const items = useMemo(() => {
    if (tab === "favorites") return Array.isArray(favorites) ? favorites : [];
    return Array.isArray(results) ? results : [];
  }, [favorites, results, tab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close GIF picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl glass-panel overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("search")}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                tab === "search"
                  ? "bg-white/10 border border-white/10 text-white"
                  : "text-slate-300 hover:text-white",
              ].join(" ")}
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setTab("favorites")}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                tab === "favorites"
                  ? "bg-white/10 border border-white/10 text-white"
                  : "text-slate-300 hover:text-white",
              ].join(" ")}
            >
              Favorites
              {Array.isArray(favorites) && favorites.length > 0 && (
                <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {tab === "search" && (
          <div className="px-5 py-4 border-b border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Giphy or Tenor"
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[rgb(var(--ss-accent-rgb)/0.40)]"
              />
              <button
                type="button"
                onClick={() => onClose()}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/16 border border-white/10 text-sm text-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {error && (
            <div className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 px-3 py-2 rounded-xl">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-300 mb-4">
              <div className="animate-spin h-4 w-4 border-2 border-[rgb(var(--ss-accent-rgb))] border-t-transparent rounded-full"></div>
              Loading GIFs...
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-10">
              {tab === "favorites" ? "No favorites yet." : "No GIFs found."}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((gif) => {
              const key = gifKey(gif);
              const isFavorited = key && favoriteKeys?.has(key);
              const preview = gif.previewUrl || gif.url;
              return (
                <button
                  key={key || gif.url}
                  type="button"
                  onClick={() => onSelectGif(gif)}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ss-accent-rgb)/0.5)]"
                >
                  <img
                    src={preview}
                    alt={gif.title || "GIF"}
                    className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-2 left-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-black/60 text-white">
                    {gif.provider}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (onToggleFavorite) onToggleFavorite(gif);
                    }}
                    className={[
                      "absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center border transition-colors",
                      isFavorited
                        ? "bg-[rgb(var(--ss-accent-rgb)/0.35)] border-[rgb(var(--ss-accent-rgb)/0.55)] text-[rgb(var(--ss-accent-rgb))]"
                        : "bg-black/50 border-white/10 text-white/80 hover:text-white",
                    ].join(" ")}
                    title={isFavorited ? "Unfavorite GIF" : "Favorite GIF"}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill={isFavorited ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15 8.5 22 9.3 17 14 18.3 21 12 17.8 5.7 21 7 14 2 9.3 9 8.5 12 2"></polygon>
                    </svg>
                  </button>
                  {sendingKey && key && sendingKey === key && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white">
                      Sending...
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            {tab === "search" ? "Powered by Giphy & Tenor" : "Favorites sync to your account"}
          </span>
        </div>
      </div>
    </div>
  );
}
