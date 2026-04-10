"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

type Props = {
  name: string;
  defaultHtml: string;
  error?: string;
};

export function ProductDescriptionEditor({ name, defaultHtml, error }: Props) {
  const [html, setHtml] = useState(defaultHtml || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder: "Produktbeschreibung …" }),
    ],
    content: defaultHtml || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap-editor min-h-[200px] max-w-none px-3 py-2 text-sm text-[#1f2937] outline-none focus:outline-none [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1",
      },
    },
    onUpdate: ({ editor: ed }) => {
      setHtml(ed.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[240px] animate-pulse rounded-md border border-[#e5e7eb] bg-[#f9fafb]" />
    );
  }

  const textLen = editor.getText().length;

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
        <div className="flex flex-wrap gap-0.5 border-b border-[#e5e7eb] bg-[#f9fafb] px-2 py-1.5">
          <ToolbarBtn
            label="Fett"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarBtn
            label="Kursiv"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarBtn
            label="Liste"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarBtn
            label="Num."
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        </div>
        <EditorContent editor={editor} />
        <div className="flex justify-end border-t border-[#e5e7eb] bg-[#f3f4f6] px-3 py-1.5 text-xs text-[#6b7280]">
          {textLen} Zeichen
        </div>
      </div>
      <input type="hidden" name={name} value={html} readOnly />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function ToolbarBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active ? "bg-primary text-white" : "text-[#374151] hover:bg-[#e5e7eb]"
      }`}
    >
      {label}
    </button>
  );
}
