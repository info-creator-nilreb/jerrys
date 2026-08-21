import { describe, expect, it } from "vitest";
import {
  explainInternetmarkeCheckoutFailure,
  explainInternetmarkeRetoureFailure,
  formatInternetmarkeHttpErrorMessage,
} from "@/features/fulfillment/infrastructure/internetmarke-provider-error";

const walletBalanceError = JSON.stringify({
  statusCode: "400",
  title: "walletBalanceNotEnough",
  description: "A005904E65",
  instance: "PCF-A1031",
});

describe("explainInternetmarkeCheckoutFailure", () => {
  it("erklärt unzureichendes Portokasse-Guthaben ohne internen Code", () => {
    const msg = explainInternetmarkeCheckoutFailure(400, walletBalanceError);
    expect(msg).toMatch(/Portokasse-Guthaben nicht ausreichend/i);
    expect(msg).toMatch(/portokasse\.deutschepost\.de/i);
    expect(msg).not.toMatch(/A005904E65/);
    expect(msg).not.toMatch(/walletBalanceNotEnough/);
    expect(msg).not.toMatch(/PCF-A1031/);
  });

  it("bleibt bei unbekannten Fehlern ohne JSON-Rohdaten verständlich", () => {
    const msg = explainInternetmarkeCheckoutFailure(
      400,
      JSON.stringify({ title: "SomethingElse", description: "secret-code" }),
    );
    expect(msg).toMatch(/Label-Kauf fehlgeschlagen \(400\)/i);
    expect(msg).not.toMatch(/secret-code/);
  });
});

describe("explainInternetmarkeRetoureFailure", () => {
  it("erklärt Guthabenfehler bei Retoure", () => {
    const msg = explainInternetmarkeRetoureFailure(400, walletBalanceError);
    expect(msg).toMatch(/Portokasse-Guthaben/i);
    expect(msg).not.toMatch(/A005904E65/);
  });
});

describe("formatInternetmarkeHttpErrorMessage", () => {
  it("gibt die bereits aufbereitete Meldung zurück", () => {
    const msg = formatInternetmarkeHttpErrorMessage({
      operation: "checkout_pdf",
      status: 400,
      responseBody: walletBalanceError,
      message: explainInternetmarkeCheckoutFailure(400, walletBalanceError),
    });
    expect(msg).toMatch(/Portokasse-Guthaben nicht ausreichend/i);
    expect(msg).not.toMatch(/\{/);
  });
});
