import QRCode from "qrcode";

export async function otpauthQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 192,
    errorCorrectionLevel: "M",
  });
}
