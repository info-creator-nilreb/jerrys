"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  resetEmailTemplateAction,
  saveEmailTemplateAction,
  sendEmailTemplateTestAction,
  type EmailTemplateFormState,
  type EmailTemplateTestSendState,
} from "@/app/admin/(dashboard)/emails/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { EmailTemplateVariableDef } from "@/lib/email/templates/catalog";
import { prepareEmailPreviewHtml } from "@/lib/email/templates/preview-html";
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
  /** Origin der Admin-UI (Preview-Deploy), für Branding-Assets. */
  previewAssetOrigin: string;
  defaultTestRecipient: string;
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
  previewAssetOrigin,
  defaultTestRecipient,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody);
  const [textBody, setTextBody] = useState(initialTextBody);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [tab, setTab] = useState<"html" | "text" | "preview">("html");
  const [testTo, setTestTo] = useState(defaultTestRecipient);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const resetFormRef = useRef<HTMLFormElement>(null);

  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const insertTarget = useRef<"subject" | "html" | "text">("html");

  const [state, formAction, pending] = useActionState<EmailTemplateFormState, FormData>(
    saveEmailTemplateAction,
    null,
  );
  const [testState, testAction, testPending] = useActionState<
    EmailTemplateTestSendState,
    FormData
  >(sendEmailTemplateTestAction, null);

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

  const previewHtml = useMemo(
    () => prepareEmailPreviewHtml(preview.html, previewAssetOrigin),
    [preview.html, previewAssetOrigin],
  );

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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <form action={formAction} className="min-w-0 space-y-4">
        <input type="hidden" name="key" value={templateKey} />
        <input type="hidden" name="subject" value={subject} />
        <input type="hidden" name="htmlBody" value={htmlBody} />
        <input type="hidden" name="textBody" value={textBody} />
        <input type="hidden" name="enabled" value={enabled ? "true" : "false"} />

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
                    srcDoc={previewHtml}
                    className="h-[min(70vh,720px)] w-full bg-[#eceef1]"
                    /* allow-same-origin: Bilder vom geschützten Preview-Deploy laden */
                    sandbox="allow-same-origin allow-popups"
                  />
                </div>
                <details className="rounded-lg border border-[#e8eaed] bg-white p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-[#374151]">
                    Text-Version
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-[#4b5563]">
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
            type="button"
            className="inline-flex min-h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            onClick={() => setResetConfirmOpen(true)}
          >
            Auf Standard zurücksetzen
          </button>
        </div>
      </form>

      <form ref={resetFormRef} action={resetEmailTemplateAction} className="hidden" aria-hidden>
        <input type="hidden" name="key" value={templateKey} />
      </form>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Vorlage zurücksetzen?"
        description="Vorlage auf den Standard zurücksetzen? Deine Anpassungen gehen verloren."
        confirmLabel="Auf Standard zurücksetzen"
        variant="danger"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setResetConfirmOpen(false);
          resetFormRef.current?.requestSubmit();
        }}
      />

      <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
        <aside className="overflow-hidden rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1f2937]">Variablen</h2>
          <p className="mt-1 text-xs text-[#6b7280]">
            Klicken zum Einfügen an der Cursor-Position. HTML-Fragmente nutzen{" "}
            <code className="rounded bg-[#f3f4f6] px-1">{"{{{…}}}"}</code>.
          </p>
          <ul className="mt-3 max-h-[min(50vh,480px)] space-y-1.5 overflow-x-hidden overflow-y-auto">
            {variables.map((v) => (
              <li key={v.path} className="min-w-0">
                <button
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="w-full min-w-0 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-[#e5e7eb] hover:bg-[#f7f8fa]"
                  title={v.example}
                >
                  <span className="block break-all font-mono text-xs text-primary">
                    {v.html ? `{{{${v.path}}}}` : `{{${v.path}}}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#6b7280]">{v.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <form
          action={testAction}
          className="overflow-hidden rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-[#1f2937]">Testversand</h2>
          <p className="mt-1 text-xs text-[#6b7280]">
            Sendet die aktuelle Vorlage (auch ungespeichert) mit Beispieldaten.
          </p>
          <input type="hidden" name="key" value={templateKey} />
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="htmlBody" value={htmlBody} />
          <input type="hidden" name="textBody" value={textBody} />
          <label htmlFor="email-test-to" className="mt-3 block text-xs font-medium text-[#374151]">
            Empfänger
          </label>
          <input
            id="email-test-to"
            name="to"
            type="email"
            required
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="name@example.com"
            className="mt-1 w-full min-w-0 rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {testState?.fieldErrors?.to ? (
            <p className="mt-1 text-xs text-red-600">{testState.fieldErrors.to}</p>
          ) : null}
          {testState?.error ? (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {testState.error}
            </p>
          ) : null}
          {testState?.ok && testState.message ? (
            <p className="mt-2 text-xs font-medium text-primary" role="status">
              {testState.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={testPending || !testTo.trim()}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
          >
            {testPending ? "Senden…" : "Testmail senden"}
          </button>
        </form>
      </div>
    </div>
  );
}
