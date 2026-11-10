"use client";

import { useRef, useState } from "react";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { t } from "@/lib/messages";
import {
  DEFAULT_REMINDER_TEMPLATE,
  REMINDER_PLACEHOLDERS,
  renderReminder,
  SAMPLE_REMINDER_VALUES,
} from "@/lib/reminder-message";
import { saveSettings } from "@/server/actions/settings";

type Settings = { reminderTemplate: string; seasonalThemes: boolean; confetti: boolean };

export function SettingsForm({ settings }: { settings: Settings }) {
  const [template, setTemplate] = useState(settings.reminderTemplate);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const { state, onSubmit, pending, errors } = useFormAction(saveSettings, { successMessage: t.settings.saved });

  /** Inserisce il segnaposto dove si trova il cursore. */
  function insert(key: string) {
    const area = textRef.current;
    const token = `{${key}}`;
    if (!area) return setTemplate((value) => value + token);
    const { selectionStart, selectionEnd } = area;
    const next = template.slice(0, selectionStart) + token + template.slice(selectionEnd);
    setTemplate(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(selectionStart + token.length, selectionStart + token.length);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle>{t.settings.reminderTitle}</CardTitle>
          <CardDescription>{t.settings.reminderHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(REMINDER_PLACEHOLDERS).map(([key, description]) => (
              <button
                key={key}
                type="button"
                title={description}
                onClick={() => insert(key)}
                className="rounded-full border bg-primary/5 px-2.5 py-0.5 font-mono text-xs text-primary transition-transform hover:-translate-y-0.5 hover:bg-primary/10"
              >
                {`{${key}}`}
              </button>
            ))}
          </div>
          <Field label={t.settings.template} htmlFor="reminderTemplate" errors={errors.reminderTemplate}>
            <Textarea
              ref={textRef}
              id="reminderTemplate"
              name="reminderTemplate"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              rows={6}
              required
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t.settings.preview}</span>
            {/* Anteprima in stile fumetto di chat. */}
            <p className="max-w-md self-start rounded-2xl rounded-tl-sm bg-[#dcf8c6] px-3 py-2 text-sm whitespace-pre-wrap text-[#111b21] shadow-sm">
              {renderReminder(template, SAMPLE_REMINDER_VALUES)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setTemplate(DEFAULT_REMINDER_TEMPLATE)}
          >
            <RotateCcwIcon /> {t.settings.reset}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.lookTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Switch name="seasonalThemes" label={t.settings.seasonal} hint={t.settings.seasonalHint} defaultChecked={settings.seasonalThemes} />
          <Switch name="confetti" label={t.settings.confetti} hint={t.settings.confettiHint} defaultChecked={settings.confetti} />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 self-start">
        {state.ok ? null : <FormError message={state.error} />}
        <SubmitButton pending={pending} className="self-start" size="lg">
          {t.common.save}
        </SubmitButton>
      </div>
    </form>
  );
}

/** Interruttore on/off accessibile, basato su una checkbox vera. */
function Switch({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-300 peer-checked:after:translate-x-5"
      />
    </label>
  );
}
