"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline as UnderlineIcon,
} from "lucide-react";

const FONT_SIZES = [
  { label: "Klein", value: "0.875rem" },
  { label: "Normal", value: "" },
  { label: "Mittel", value: "1.125rem" },
  { label: "Groß", value: "1.25rem" },
  { label: "Sehr groß", value: "1.5rem" },
] as const;

type Props = {
  /** Kontrollierter HTML-Wert (CMS). */
  value?: string;
  /** Unkontrollierter Startwert (z. B. Produktformular). */
  defaultValue?: string;
  onChange?: (html: string) => void;
  /** Wenn gesetzt: Hidden-Input für FormData. */
  name?: string;
  placeholder?: string;
  error?: string;
  showCharCount?: boolean;
  className?: string;
};

export function AdminRichTextEditor({
  value,
  defaultValue = "",
  onChange,
  name,
  placeholder = "Text eingeben …",
  error,
  showCharCount = false,
  className = "",
}: Props) {
  const initial = value ?? defaultValue;
  const [html, setHtml] = useState(initial);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right"],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initial || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap-editor min-h-[160px] max-w-none px-3 py-2 text-sm text-[#1f2937] outline-none focus:outline-none [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const next = ed.getHTML();
      setHtml(next);
      onChange?.(next);
    },
  });

  // Externen Value-Sync nur bei kontrollierter Nutzung (kein Hidden-Input / kein html-State nötig).
  useEffect(() => {
    if (!editor || value === undefined) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={`min-h-[200px] animate-pulse rounded-md border border-[#e5e7eb] bg-[#f9fafb] ${className}`}
      />
    );
  }

  const textLen = editor.getText().length;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-md border border-[#e3e4e8] bg-white">
        <RichTextToolbar editor={editor} />
        <EditorContent editor={editor} />
        {showCharCount ? (
          <div className="flex justify-end border-t border-[#e5e7eb] bg-[#f3f4f6] px-3 py-1.5 text-xs text-[#6b7280]">
            {textLen} Zeichen
          </div>
        ) : null}
      </div>
      {name ? <input type="hidden" name={name} value={html} readOnly /> : null}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function RichTextToolbar({ editor }: { editor: Editor }) {
  const fontSizeId = useId();
  const currentSize =
    (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "";

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-[#e5e7eb] bg-[#f9fafb] px-1.5 py-1"
      role="toolbar"
      aria-label="Textformatierung"
    >
      <ToolbarIconBtn
        label="Fett"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" aria-hidden strokeWidth={2.25} />
      </ToolbarIconBtn>
      <ToolbarIconBtn
        label="Kursiv"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" aria-hidden strokeWidth={2.25} />
      </ToolbarIconBtn>
      <ToolbarIconBtn
        label="Unterstrichen"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-3.5" aria-hidden strokeWidth={2.25} />
      </ToolbarIconBtn>

      <ToolbarDivider />

      <ToolbarIconBtn
        label="Linksbündig"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-3.5" aria-hidden strokeWidth={2.25} />
      </ToolbarIconBtn>
      <ToolbarIconBtn
        label="Zentriert"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-3.5" aria-hidden strokeWidth={2.25} />
      </ToolbarIconBtn>
      <ToolbarIconBtn
        label="Rechtsbündig"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-3.5" aria-hidden strokeWidth={2.25} />
      </ToolbarIconBtn>

      <ToolbarDivider />

      <label className="sr-only" htmlFor={fontSizeId}>
        Schriftgröße
      </label>
      <select
        id={fontSizeId}
        className="h-7 max-w-[7.5rem] rounded border border-transparent bg-transparent px-1.5 text-xs text-[#374151] hover:bg-[#e5e7eb] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        value={currentSize}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) {
            editor.chain().focus().unsetFontSize().run();
            return;
          }
          editor.chain().focus().setFontSize(next).run();
        }}
        aria-label="Schriftgröße"
      >
        {FONT_SIZES.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-[#e5e7eb]" aria-hidden />;
}

function ToolbarIconBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex size-7 items-center justify-center rounded transition-colors ${
        active ? "bg-primary text-white" : "text-[#374151] hover:bg-[#e5e7eb]"
      }`}
    >
      {children}
    </button>
  );
}
