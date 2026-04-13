"use client";

import { CircleQuestionMark, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { centsToPriceInputString, parseEuroInputToCents } from "@/lib/catalog/format";
import { grossCentsFromNet, netCentsFromGross } from "@/lib/catalog/pricing";

function LockIcon({ className }: { className?: string }) {
  return <Lock className={className} width={16} height={16} aria-hidden strokeWidth={2} />;
}

function HelpIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-flex text-primary" aria-label={title}>
      <CircleQuestionMark width={16} height={16} aria-hidden strokeWidth={2} />
    </span>
  );
}

type Props = {
  taxPercent: number;
  grossName: string;
  netName: string;
  grossDefaultCents: number | null;
  netDefaultCents: number | null;
  grossLabel: React.ReactNode;
  netLabel: React.ReactNode;
  required?: boolean;
  grossPlaceholder?: string;
  netPlaceholder?: string;
  helpOnGross?: string;
  grossError?: string;
  netError?: string;
};

export function LinkedPriceRow({
  taxPercent,
  grossName,
  netName,
  grossDefaultCents,
  netDefaultCents,
  grossLabel,
  netLabel,
  required,
  grossPlaceholder = "",
  netPlaceholder = "",
  helpOnGross,
  grossError,
  netError,
}: Props) {
  const [grossStr, setGrossStr] = useState(() =>
    grossDefaultCents != null ? centsToPriceInputString(grossDefaultCents) : "",
  );
  const [netStr, setNetStr] = useState(() =>
    netDefaultCents != null ? centsToPriceInputString(netDefaultCents) : "",
  );

  useEffect(() => {
    if (grossDefaultCents != null) setGrossStr(centsToPriceInputString(grossDefaultCents));
    if (netDefaultCents != null) setNetStr(centsToPriceInputString(netDefaultCents));
  }, [grossDefaultCents, netDefaultCents]);

  const syncNetFromGross = useCallback(
    (gross: string) => {
      const g = parseEuroInputToCents(gross);
      if (g === null) {
        setNetStr("");
        return;
      }
      setNetStr(centsToPriceInputString(netCentsFromGross(g, taxPercent)));
    },
    [taxPercent],
  );

  const syncGrossFromNet = useCallback(
    (net: string) => {
      const n = parseEuroInputToCents(net);
      if (n === null) {
        setGrossStr("");
        return;
      }
      setGrossStr(centsToPriceInputString(grossCentsFromNet(n, taxPercent)));
    },
    [taxPercent],
  );

  const onGrossChange = (v: string) => {
    setGrossStr(v);
    syncNetFromGross(v);
  };

  const onNetChange = (v: string) => {
    setNetStr(v);
    syncGrossFromNet(v);
  };

  useEffect(() => {
    const g = parseEuroInputToCents(grossStr);
    if (g !== null) {
      setNetStr(centsToPriceInputString(netCentsFromGross(g, taxPercent)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Nur bei Steuersatz aus Brutto neu berechnen
  }, [taxPercent]);

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <label className="text-xs font-medium text-[#6b7280]">{grossLabel}</label>
          {helpOnGross ? <HelpIcon title={helpOnGross} /> : null}
        </div>
        <EuroInput
          name={grossName}
          value={grossStr}
          onChange={onGrossChange}
          required={required}
          placeholder={grossPlaceholder}
          error={!!grossError}
        />
        {grossError ? <p className="text-sm text-red-600">{grossError}</p> : null}
      </div>
      <div className="hidden justify-center pb-2 text-primary sm:flex" title="Brutto und Netto sind verknüpft">
        <LockIcon />
      </div>
      <div className="flex flex-col gap-1 sm:col-start-3">
        <label className="text-xs font-medium text-[#6b7280]">{netLabel}</label>
        <EuroInput
          name={netName}
          value={netStr}
          onChange={onNetChange}
          required={required}
          placeholder={netPlaceholder}
          error={!!netError}
        />
        {netError ? <p className="text-sm text-red-600">{netError}</p> : null}
      </div>
    </div>
  );
}

function EuroInput({
  name,
  value,
  onChange,
  required,
  placeholder,
  error,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <div
      className={`flex overflow-hidden rounded-md border bg-white text-sm ${
        error ? "border-red-400" : "border-[#e5e7eb]"
      }`}
    >
      <input
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 border-0 px-3 py-2 outline-none"
        inputMode="decimal"
        autoComplete="off"
      />
      <span className="flex items-center border-l border-[#e5e7eb] bg-[#f3f4f6] px-2.5 text-[#6b7280]">€</span>
    </div>
  );
}
