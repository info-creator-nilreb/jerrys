import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

const HTTPS_URL = /https:\/\/[^\s]+/g;

function linkLabel(url: string): string {
  if (url.includes("portokasse.deutschepost.de")) {
    return "Portokasse öffnen";
  }
  return url;
}

type Props = {
  text: string;
  linkClassName?: string;
};

/** Rendert https://-URLs in Fließtext als externe Links (z. B. Portokasse-Hinweise). */
export function TextWithExternalLinks({
  text,
  linkClassName = "inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline",
}: Props) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(HTTPS_URL)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    const isPortokasse = url.includes("portokasse.deutschepost.de");
    nodes.push(
      <a
        key={`${index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        {linkLabel(url)}
        {isPortokasse ? <ExternalLink className="size-3.5" aria-hidden /> : null}
      </a>,
    );
    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}
