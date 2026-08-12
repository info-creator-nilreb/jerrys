"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  resetEmailTemplateAction,
  saveEmailTemplateAction,
  type EmailTemplateFormState,
} from "@/app/admin/(dashboard)/emails/actions";
import type { EmailTemplateVariableDef } from "@/lib/email/templates/catalog";
import { renderEmailBodies, type TemplateVars } from "@/lib/email/templates/render";

type Props = {
  templateKey: string;
  name: string;
  initialSubject: string;
  initialHtmlBody: string;
  initialTextBody: string;
  initialEnabled: boolean;
  variables: EmailTemplateVariableDef[];
  sampleVars: TemplateVars;
  initialPreviewHtml: string;
  initialPreviewSubject: string;
};

export function EmailTemplateEditor({
  templateKey,
  name,
  initialSubject,
  initialHtmlBody,
  initialTextBody,
  initialEnabled,
  variables,
  sampleVars,
  initialPreviewHtml,
  initialPreviewSubject,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody);
  const [textBody, setTextBody] = useState(initialTextBody);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [tab, setTab] = useState<"html" | "text" | "preview">("html");

  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const insertTarget = useRef<"subject" | "html" | "text">("html");

  const [state, formAction, pending] = useActionState<EmailTemplateFormState, FormData>(
    saveEmailTemplateAction,
    null,
  );

  const preview = useMemo(() => {
    try {
      return renderEmailBodies({ subject, htmlBody, textBody }, sampleVars);
    } catch {
      return {
        subject: initialPreviewSubject,
        html: initialPreviewHtml,
        text: textBody,
      };
    }
  }, [subject, htmlBody, textBody, sampleVars, initialPreviewHtml, initialPreviewSubject]);

  function insertVariable(v: EmailTemplateVariableDef) {
    const token = v.html ? `{{{${v.path}}}}` : `{{${v.path}}}`;
    const target = insertTarget.current;

    if (target === "subject") {
      const el = subjectRef.current;
      if (!el) {
        setSubject((s) => s + token);
        return;
      }
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? start;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }

    if (target === "text") {
      const el = textRef.current;
      if (!el) {
        setTextBody((s) => s + token);
        return;
      }
      const start = el.selectionStart ?? textBody.length;
      const end = el.selectionEnd ?? start;
      const next = textBody.slice(0, start) + token + textBody.slice(end);
      setTextBody(next);
      setTab("text");
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }

    const el = htmlRef.current;
    if (!el) {
      setHtmlBody((s) => s + token);
      return;
    }
    const start = el.selectionStart ?? htmlBody.length;
    const end = el.selectionEnd ?? start;
    const next = htmlBody.slice(0, start) + token + htmlBody.slice(end);
    setHtmlBody(next);
    setTab("html");
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <input type="hidden" name="key" value={templateKey} />
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name="htmlBody" value={htmlBody} />
      <input type="hidden" name="textBody" value={textBody} />
      <input type="hidden" name="enabled" value={enabled ? "true" : "false"} />

      <div className="space-y-4">
        <div className="rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
              />
              Vorlage aktiv (wird beim Versand genutzt)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {state?.ok ? (
                <span className="text-sm font-medium text-primary" role="status">
                  Gespeichert
                </span>
              ) : null}
              {state?.error ? (
                <span className="text-sm text-red-600" role="alert">
                  {state.error}
                </span>
              ) : null}
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-(--primary-hover) disabled:opacity-60"
              >
                {pending ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="email-subject" className="block text-sm font-medium text-[#374151]">
              Betreff
              {state?.fieldErrors?.subject ? (
                <span className="ml-2 font-normal text-red-600">{state.fieldErrors.subject}</span>
              ) : null}
            </label>
            <input
              ref={subjectRef}
              id="email-subject"
              type="text"
              value={subject}
              onFocus={() => {
                insertTarget.current = "subject";
              }}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="mt-4 flex gap-1 border-b border-[#e8eaed]" role="tablist">
            {(
              [
                ["html", "HTML"],
                ["text", "Text"],
                ["preview", "Vorschau"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`min-h-10 px-3 text-sm font-medium transition-colors ${
                  tab === id
                    ? "border-b-2 border-primary text-primary"
                    : "text-[#6b7280] hover:text-[#1f2937]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "html" ? (
              <div>
                <label htmlFor="email-html" className="sr-only">
                  HTML-Inhalt
                </label>
                {state?.fieldErrors?.htmlBody ? (
                  <p className="mb-2 text-sm text-red-600">{state.fieldErrors.htmlBody}</p>
                ) : null}
                <textarea
                  ref={htmlRef}
                  id="email-html"
                  value={htmlBody}
                  onFocus={() => {
                    insertTarget.current = "html";
                  }}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  spellCheck={false}
                  rows={22}
                  className="w-full rounded-lg border border-[#d1d5db] bg-[#fafbfc] px-3 py-2 font-mono text-xs leading-relaxed text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ) : null}

            {tab === "text" ? (
              <div>
                <label htmlFor="email-text" className="sr-only">
                  Text-Inhalt
                </label>
                {state?.fieldErrors?.textBody ? (
                  <p className="mb-2 text-sm text-red-600">{state.fieldErrors.textBody}</p>
                ) : null}
                <textarea
                  ref={textRef}
                  id="email-text"
                  value={textBody}
                  onFocus={() => {
                    insertTarget.current = "text";
                  }}
                  onChange={(e) => setTextBody(e.target.value)}
                  rows={22}
                  className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 font-mono text-sm leading-relaxed text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ) : null}

            {tab === "preview" ? (
              <div className="space-y-3">
                <p className="rounded-lg border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-sm text-[#374151]">
                  <span className="font-medium text-[#6b7280]">Betreff: </span>
                  {preview.subject}
                </p>
                <div className="overflow-hidden rounded-lg border border-[#e8eaed] bg-[#eceef1]">
                  <iframe
                    title={`Vorschau ${name}`}
                    srcDoc={preview.html}
                    className="h-[min(70vh,720px)] w-full bg-[#eceef1]"
                    sandbox=""
                  />
                </div>
                <details className="rounded-lg border border-[#e8eaed] bg-white p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-[#374151]">
                    Text-Version
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-[#4b5563]">
                    {preview.text}
                  </pre>
                </details>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8eaed] bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-[#6b7280]">
            Speichern übernimmt die Vorlage für den Live-Versand. „Zurücksetzen“ stellt den
            Code-Standard wieder her.
          </p>
          <button
            type="submit"
            formAction={resetEmailTemplateAction}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            onClick={(e) => {
              if (
                !window.confirm(
                  "Vorlage auf den Standard zurücksetzen? Deine Anpassungen gehen verloren.",
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            Auf Standard zurücksetzen
          </button>
        </div>
      </div>

      <aside className="rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
        <h2 className="text-sm font-semibold text-[#1f2937]">Variablen</h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Klicken zum Einfügen an der Cursor-Position. HTML-Fragmente nutzen{" "}
          <code className="rounded bg-[#f3f4f6] px-1">{"{{{…}}}"}</code>.
        </p>
        <ul className="mt-3 max-h-[min(70vh,640px)] space-y-1.5 overflow-y-auto">
          {variables.map((v) => (
            <li key={v.path}>
              <button
                type="button"
                onClick={() => insertVariable(v)}
                className="w-full rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-[#e5e7eb] hover:bg-[#f7f8fa]"
                title={v.example}
              >
                <span className="block font-mono text-xs text-primary">
                  {v.html ? `{{{${v.path}}}}` : `{{${v.path}}}`}
                </span>
                <span className="mt-0.5 block text-xs text-[#6b7280]">{v.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </form>
  );
}
