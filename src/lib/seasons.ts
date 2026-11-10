// Temi delle feste: quale festa (se c'è) cade in un certo giorno.
// Modulo puro. `detectSeason` è autosufficiente (niente variabili esterne)
// perché il suo codice viene copiato così com'è nello script che imposta il
// tema prima che la pagina venga disegnata.

export type Season =
  | "capodanno"
  | "natale"
  | "san-valentino"
  | "carnevale"
  | "pasqua"
  | "festa-repubblica"
  | "halloween";

export const SEASONS: Season[] = [
  "capodanno",
  "natale",
  "san-valentino",
  "carnevale",
  "pasqua",
  "festa-repubblica",
  "halloween",
];

/** month: 1-12. Restituisce la festa del giorno o null. */
export function detectSeason(year: number, month: number, day: number): Season | null {
  // Pasqua (calendario gregoriano, algoritmo anonimo "Meeus/Jones/Butcher").
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
  const DAY = 86400000;
  const today = Date.UTC(year, month - 1, day);
  const easter = Date.UTC(year, easterMonth - 1, easterDay);
  const fromEaster = Math.round((today - easter) / DAY);

  if ((month === 12 && day === 31) || (month === 1 && day === 1)) return "capodanno";
  if ((month === 12 && day >= 8) || (month === 1 && day <= 6)) return "natale";
  if (month === 2 && day === 14) return "san-valentino";
  // Da giovedì grasso a martedì grasso.
  if (fromEaster >= -52 && fromEaster <= -47) return "carnevale";
  // Dal Venerdì santo a Pasquetta.
  if (fromEaster >= -2 && fromEaster <= 1) return "pasqua";
  if (month === 6 && day === 2) return "festa-repubblica";
  if ((month === 10 && day >= 25) || (month === 11 && day === 1)) return "halloween";
  return null;
}

export const SEASONAL_STORAGE_KEY = "vivamed-seasonal";
export const CONFETTI_STORAGE_KEY = "vivamed-confetti";

/**
 * Script eseguito nel <head> prima del primo disegno: imposta `data-season`
 * (e `data-confetti="off"`) su <html>. Le preferenze arrivano da localStorage,
 * dove le salva PreferencesSync. `?festa=natale` forza un tema (anteprima).
 */
export const themeScript = `(function(){try{var r=document.documentElement;
if(localStorage.getItem("${CONFETTI_STORAGE_KEY}")==="off")r.setAttribute("data-confetti","off");
var forced=new URLSearchParams(location.search).get("festa");
if(forced){if(forced!=="nessuna")r.setAttribute("data-season",forced);return}
if(localStorage.getItem("${SEASONAL_STORAGE_KEY}")==="off")return;
var n=new Date();var s=(${detectSeason.toString()})(n.getFullYear(),n.getMonth()+1,n.getDate());
if(s)r.setAttribute("data-season",s)}catch(e){}})()`;
