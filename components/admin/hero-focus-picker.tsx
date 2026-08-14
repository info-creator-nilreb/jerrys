"use client";

import { Crosshair } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  DEFAULT_HERO_FOCUS_X,
  DEFAULT_HERO_FOCUS_Y,
  heroFocusFromClientPoint,
  heroFocusMarkerOffset,
} from "@/lib/content/blocks/hero";

type Props = {
  imageUrl: string;
  focusX: number;
  focusY: number;
  onChange: (focusX: number, focusY: number) => void;
};

type ImageSize = { width: number; height: number };

export function HeroFocusPicker({ imageUrl, focusX, focusY, onChange }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [imageSize, setImageSize] = useState<ImageSize>({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState<ImageSize>({ width: 0, height: 0 });

  const measureFrame = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    setFrameSize((prev) =>
      prev.width === rect.width && prev.height === rect.height
        ? prev
        : { width: rect.width, height: rect.height },
    );
  }, []);

  useEffect(() => {
    setImageSize({ width: 0, height: 0 });
  }, [imageUrl]);

  useEffect(() => {
    measureFrame();
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measureFrame());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [measureFrame, imageUrl]);

  const applyPoint = useCallback(
    (clientX: number, clientY: number) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const next = heroFocusFromClientPoint(clientX, clientY, rect, imageSize);
      onChange(next.focusX, next.focusY);
    },
    [imageSize, onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPoint(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    applyPoint(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const marker = heroFocusMarkerOffset(focusX, focusY, frameSize, imageSize);
  const isDefault =
    focusX === DEFAULT_HERO_FOCUS_X && focusY === DEFAULT_HERO_FOCUS_Y;

  return (
    <div className="mt-3 space-y-2">
      <div>
        <p className="text-sm font-medium text-[#374151]">Bildschwerpunkt</p>
        <p className="mt-0.5 text-xs text-[#6b7280]">
          Klicke auf den wichtigsten Bereich. Übergroße Bilder werden um diesen
          Punkt beschnitten.
        </p>
      </div>

      <div
        ref={frameRef}
        tabIndex={0}
        aria-label="Bildschwerpunkt auf dem Motiv setzen. Pfeiltasten verschieben den Punkt."
        className="relative aspect-[16/10] max-w-md cursor-crosshair overflow-hidden rounded-md border border-[#e3e4e8] bg-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 5 : 1;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(Math.max(0, Math.round((focusX - step) * 10) / 10), focusY);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onChange(Math.min(100, Math.round((focusX + step) * 10) / 10), focusY);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onChange(focusX, Math.max(0, Math.round((focusY - step) * 10) / 10));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onChange(focusX, Math.min(100, Math.round((focusY + step) * 10) / 10));
          }
        }}
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          className="pointer-events-none object-contain"
          sizes="448px"
          unoptimized={imageUrl.startsWith("https://") || imageUrl.endsWith(".svg")}
          onLoad={(e) => {
            const img = e.currentTarget;
            setImageSize({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }}
        />
        <span
          className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: marker.left, top: marker.top }}
          aria-hidden
        >
          <Crosshair
            className="absolute inset-0 m-auto size-3.5 text-white"
            strokeWidth={2.25}
          />
        </span>
      </div>

      {!isDefault ? (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => onChange(DEFAULT_HERO_FOCUS_X, DEFAULT_HERO_FOCUS_Y)}
        >
          Schwerpunkt zurücksetzen
        </button>
      ) : null}
    </div>
  );
}
