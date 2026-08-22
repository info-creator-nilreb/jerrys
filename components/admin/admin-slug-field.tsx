"use client";

type Props = {
  id: string;
  name: string;
  label?: string;
  slug: string;
  onSlugChange: (value: string) => void;
  slugManuallyEdited: boolean;
  onRegenerateFromTitle: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  inputClassName?: string;
  reservedWarning?: string | null;
};

function RequiredStar() {
  return <span className="text-primary">*</span>;
}

/**
 * Slug-Eingabe mit Hinweis auf Auto-Generierung aus dem Titel und optionaler Neu-Übernahme.
 */
export function AdminSlugField({
  id,
  name,
  label = "URL-Slug",
  slug,
  onSlugChange,
  slugManuallyEdited,
  onRegenerateFromTitle,
  error,
  hint,
  placeholder = "z. B. design-katzenhoehle",
  required = true,
  disabled = false,
  inputClassName = "rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm",
  reservedWarning,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-[#6b7280]">
          {label} {required ? <RequiredStar /> : null}
        </label>
        {slugManuallyEdited && !disabled ? (
          <button
            type="button"
            onClick={onRegenerateFromTitle}
            className="text-xs font-medium text-primary hover:underline"
          >
            Aus Titel übernehmen
          </button>
        ) : null}
      </div>
      <input
        id={id}
        name={disabled ? undefined : name}
        type="text"
        required={required && !disabled}
        disabled={disabled}
        placeholder={placeholder}
        value={slug}
        onChange={(e) => onSlugChange(e.target.value)}
        className={inputClassName}
      />
      {!slugManuallyEdited && !disabled ? (
        <p className="text-xs text-[#6b7280]">
          Wird automatisch aus dem Titel erzeugt. Du kannst den Slug jederzeit anpassen.
        </p>
      ) : null}
      {hint ? <p className="text-xs text-[#9ca3af]">{hint}</p> : null}
      {reservedWarning ? <p className="text-xs text-amber-700">{reservedWarning}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {disabled ? <input type="hidden" name={name} value={slug} /> : null}
    </div>
  );
}
