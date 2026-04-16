import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Order, OrderItem } from "@/app/generated/prisma/client";
import { formatPrice } from "@/lib/catalog/format";
import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";
import { htmlToInvoicePlainFooter } from "@/lib/invoice/legal-plain-text";
import { getInvoiceSellerDetails } from "@/lib/invoice/seller-details";

const PRIMARY = rgb(0.545, 0.745, 0.145); // #8bbe25
const TEXT = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.35, 0.38, 0.42);

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function drawLines(
  page: ReturnType<PDFDocument["getPages"]>[0],
  text: string,
  x: number,
  y: number,
  size: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  color = TEXT,
  maxWidthChars = 72,
  lineHeight = size * 1.25,
): number {
  let yy = y;
  for (const para of text.split("\n\n")) {
    for (const line of wrapLine(para.replace(/\n/g, " "), maxWidthChars)) {
      page.drawText(line, { x, y: yy, size, font, color });
      yy -= lineHeight;
    }
    yy -= lineHeight * 0.25;
  }
  return yy;
}

export async function buildInvoicePdfBuffer(order: Order & { items: OrderItem[] }): Promise<Buffer> {
  const invoiceNo = order.invoiceNumber ?? order.orderNumber;
  const issued = order.invoiceIssuedAt ?? new Date();

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595;
  const pageH = 842;
  const margin = 48;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const headerH = 56;
  page.drawRectangle({
    x: 0,
    y: y - headerH + 8,
    width: pageW,
    height: headerH,
    color: PRIMARY,
  });

  const logoPath = path.join(process.cwd(), "public", "branding", "jerrys-logo-white.png");
  if (fs.existsSync(logoPath)) {
    const pngBytes = fs.readFileSync(logoPath);
    const img = await pdf.embedPng(pngBytes);
    const targetH = 36;
    const scale = targetH / img.height;
    const w = img.width * scale;
    page.drawImage(img, {
      x: margin,
      y: y - targetH - 8,
      width: w,
      height: targetH,
    });
  }

  y -= headerH + 16;

  page.drawText("Rechnung", { x: margin, y, size: 18, font: fontBold, color: TEXT });
  y -= 28;

  const seller = getInvoiceSellerDetails();
  page.drawText("Aussteller", { x: margin, y, size: 9, font: fontBold, color: MUTED });
  y -= 12;
  for (const line of seller.lines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: TEXT });
    y -= 12;
  }
  if (seller.ustId) {
    page.drawText(`USt-IdNr.: ${seller.ustId}`, { x: margin, y, size: 9, font, color: TEXT });
    y -= 12;
  }
  if (seller.steuernummer) {
    page.drawText(`Steuernummer: ${seller.steuernummer}`, { x: margin, y, size: 9, font, color: TEXT });
    y -= 12;
  }
  y -= 10;

  const rightX = pageW - margin - 180;
  let ry = pageH - margin - headerH - 24;
  page.drawText(`Rechnungsnr. ${invoiceNo}`, { x: rightX, y: ry, size: 10, font: fontBold, color: TEXT });
  ry -= 14;
  page.drawText(
    `Rechnungsdatum: ${issued.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}`,
    { x: rightX, y: ry, size: 9, font, color: TEXT },
  );
  ry -= 14;
  page.drawText(`Bestellnr. ${order.orderNumber}`, { x: rightX, y: ry, size: 9, font, color: TEXT });
  y = Math.min(y, ry - 8);

  page.drawText("Rechnungsempfänger", { x: margin, y, size: 9, font: fontBold, color: MUTED });
  y -= 12;
  const billLines = [
    `${order.billingFirstName} ${order.billingLastName}`,
    order.billingCompany,
    order.billingLine1,
    order.billingLine2,
    `${order.billingZip} ${order.billingCity}`,
    order.billingCountry,
  ].filter(Boolean) as string[];
  for (const line of billLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: TEXT });
    y -= 12;
  }
  y -= 16;

  page.drawText("Positionen", { x: margin, y, size: 11, font: fontBold, color: TEXT });
  y -= 16;

  const vatApplies = order.vatApplies;
  page.drawText("Bezeichnung", { x: margin, y, size: 8, font: fontBold, color: MUTED });
  page.drawText("Menge", { x: margin + 240, y, size: 8, font: fontBold, color: MUTED });
  page.drawText("Einzel", { x: margin + 300, y, size: 8, font: fontBold, color: MUTED });
  page.drawText("MwSt", { x: margin + 380, y, size: 8, font: fontBold, color: MUTED });
  page.drawText("Gesamt", { x: margin + 440, y, size: 8, font: fontBold, color: MUTED });
  y -= 14;

  for (const item of order.items) {
    const rate = item.taxRatePercentSnapshot;
    const lineGross = item.lineTotalGrossCents;
    const unit = item.unitPriceGrossCents;

    const titleLines = wrapLine(item.productTitleSnapshot, 42);
    for (let i = 0; i < titleLines.length; i++) {
      page.drawText(titleLines[i]!, { x: margin, y, size: 9, font, color: TEXT });
      if (i === 0) {
        page.drawText(String(item.quantity), { x: margin + 240, y, size: 9, font, color: TEXT });
        page.drawText(formatPrice(unit, order.currency), { x: margin + 300, y, size: 9, font, color: TEXT });
        page.drawText(vatApplies && rate > 0 ? `${rate} %` : "—", { x: margin + 380, y, size: 9, font, color: TEXT });
        page.drawText(formatPrice(lineGross, order.currency), { x: margin + 440, y, size: 9, font, color: TEXT });
      }
      y -= 11;
    }
    if (y < 120) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  }

  y -= 8;
  page.drawText("Zwischensumme Waren", { x: margin + 300, y, size: 9, font, color: TEXT });
  page.drawText(formatPrice(order.subtotalGrossCents, order.currency), { x: margin + 440, y, size: 9, font, color: TEXT });
  y -= 12;
  page.drawText("Versand", { x: margin + 300, y, size: 9, font, color: TEXT });
  page.drawText(formatPrice(order.shippingCents, order.currency), { x: margin + 440, y, size: 9, font, color: TEXT });
  y -= 12;

  if (vatApplies && order.taxAmountCents > 0) {
    page.drawText("enthaltene Umsatzsteuer", { x: margin + 300, y, size: 9, font, color: TEXT });
    page.drawText(formatPrice(order.taxAmountCents, order.currency), { x: margin + 440, y, size: 9, font, color: TEXT });
    y -= 12;
  } else {
    page.drawText("Lieferung Drittland: keine ausgewiesene Umsatzsteuer (Nettorechnung).", {
      x: margin,
      y,
      size: 8,
      font,
      color: MUTED,
    });
    y -= 12;
  }

  y -= 6;
  page.drawText("Gesamtbetrag", { x: margin + 300, y, size: 11, font: fontBold, color: TEXT });
  page.drawText(formatPrice(order.totalGrossCents, order.currency), { x: margin + 440, y, size: 11, font: fontBold, color: TEXT });
  y -= 28;

  let footerPlain: string;
  try {
    footerPlain = htmlToInvoicePlainFooter(loadLegalHtmlRaw("impressum"));
  } catch {
    footerPlain = "";
  }
  if (footerPlain) {
    page.drawText("Anbieter / Impressum", { x: margin, y, size: 8, font: fontBold, color: MUTED });
    y -= 10;
    y = drawLines(page, footerPlain.slice(0, 2000), margin, y, 7, font, MUTED, 88, 9);
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
