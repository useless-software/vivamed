import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_REMINDER_TEMPLATE } from "@/lib/reminder-message";

// Impostazioni dello studio, salvate nella tabella Setting (chiave/valore).

export type Settings = {
  reminderTemplate: string;
  /** Colori a tema nelle feste (Natale, Halloween…). */
  seasonalThemes: boolean;
  /** Pioggia di coriandoli a ogni salvataggio. */
  confetti: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
  seasonalThemes: true,
  confetti: true,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    reminderTemplate: stored.reminderTemplate || DEFAULT_SETTINGS.reminderTemplate,
    seasonalThemes: stored.seasonalThemes ? stored.seasonalThemes === "true" : DEFAULT_SETTINGS.seasonalThemes,
    confetti: stored.confetti ? stored.confetti === "true" : DEFAULT_SETTINGS.confetti,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const entries: [string, string][] = [
    ["reminderTemplate", settings.reminderTemplate],
    ["seasonalThemes", String(settings.seasonalThemes)],
    ["confetti", String(settings.confetti)],
  ];
  await db.$transaction(
    entries.map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
}
