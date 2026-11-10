"use client";

import { useEffect } from "react";
import { CONFETTI_STORAGE_KEY, detectSeason, SEASONAL_STORAGE_KEY } from "@/lib/seasons";

/**
 * Allinea la pagina alle impostazioni dello studio (temi delle feste e
 * coriandoli) e le ricorda nel browser, così lo script nel <head> le applica
 * già al prossimo caricamento, senza "lampi" di colore.
 */
export function PreferencesSync({ seasonalThemes, confetti }: { seasonalThemes: boolean; confetti: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    try {
      localStorage.setItem(SEASONAL_STORAGE_KEY, seasonalThemes ? "on" : "off");
      localStorage.setItem(CONFETTI_STORAGE_KEY, confetti ? "on" : "off");
    } catch {
      // localStorage non disponibile (es. navigazione privata): pazienza.
    }

    if (confetti) root.removeAttribute("data-confetti");
    else root.setAttribute("data-confetti", "off");

    // Un tema forzato da ?festa=… (anteprima) resta com'è.
    if (new URLSearchParams(location.search).has("festa")) return;
    const now = new Date();
    const season = seasonalThemes ? detectSeason(now.getFullYear(), now.getMonth() + 1, now.getDate()) : null;
    if (season) root.setAttribute("data-season", season);
    else root.removeAttribute("data-season");
  }, [seasonalThemes, confetti]);

  return null;
}
