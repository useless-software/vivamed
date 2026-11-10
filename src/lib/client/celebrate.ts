import confetti, { type Shape } from "canvas-confetti";

// Coriandoli a ogni salvataggio. I colori arrivano dal tema attivo (variabili
// CSS --confetti-1…5, che cambiano nelle feste); nelle feste ci sono anche
// piccole emoji a tema. Niente coriandoli se l'utente ha chiesto meno
// animazioni al sistema operativo o se sono disattivati nelle impostazioni.

const SEASON_EMOJI: Record<string, string[]> = {
  natale: ["🎄", "⭐", "❄️"],
  capodanno: ["🥂", "✨"],
  halloween: ["🎃", "🦇", "👻"],
  "san-valentino": ["❤️", "💕"],
  carnevale: ["🎭", "🎉"],
  pasqua: ["🐣", "🌷", "🥚"],
  "festa-repubblica": ["🇮🇹"],
};

const shapeCache = new Map<string, Shape[]>();

function seasonShapes(season: string | undefined): Shape[] | undefined {
  if (!season || !(season in SEASON_EMOJI)) return undefined;
  if (!shapeCache.has(season)) {
    try {
      shapeCache.set(
        season,
        SEASON_EMOJI[season].map((text) => confetti.shapeFromText({ text, scalar: 2 })),
      );
    } catch {
      shapeCache.set(season, []);
    }
  }
  const shapes = shapeCache.get(season);
  return shapes && shapes.length > 0 ? shapes : undefined;
}

function colors(): string[] {
  const style = getComputedStyle(document.documentElement);
  const list = [1, 2, 3, 4, 5]
    .map((i) => style.getPropertyValue(`--confetti-${i}`).trim())
    .filter(Boolean);
  return list.length > 0 ? list : ["#3b82f6", "#60a5fa", "#22c55e", "#f59e0b", "#ec4899"];
}

export function confettiEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return document.documentElement.dataset.confetti !== "off";
}

/** "big" per i salvataggi importanti, "small" per le piccole conferme. */
export function celebrate(size: "big" | "small" = "big"): void {
  if (!confettiEnabled()) return;
  const season = document.documentElement.dataset.season;
  const base = { colors: colors(), disableForReducedMotion: true, zIndex: 9999 };
  const emoji = seasonShapes(season);

  if (size === "small") {
    void confetti({ ...base, particleCount: 40, spread: 60, startVelocity: 30, origin: { y: 0.7 }, scalar: 0.8 });
    return;
  }

  // Due "cannoni" dai lati, più qualche emoji a tema se è festa.
  void confetti({ ...base, particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.75 } });
  void confetti({ ...base, particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.75 } });
  if (emoji) {
    void confetti({
      ...base,
      shapes: emoji,
      particleCount: 18,
      spread: 100,
      startVelocity: 35,
      scalar: 2,
      flat: true,
      origin: { y: 0.6 },
    });
  }
}
