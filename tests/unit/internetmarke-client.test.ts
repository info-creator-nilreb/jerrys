import { describe, expect, it } from "vitest";
import { InternetmarkeClient, InternetmarkeHttpError } from "@/features/fulfillment";
import type { InternetmarkeEnvConfig } from "@/features/fulfillment";

const config: InternetmarkeEnvConfig = {
  clientId: "ApiKey123",
  clientSecret: "secret",
  username: "shop@example.com",
  password: "pw",
  productCode: 1,
  productPriceCents: 95,
  pageFormatId: 1,
  voucherLayout: "ADDRESS_ZONE",
};

describe("InternetmarkeClient.getAccessToken", () => {
  it("sendet dhl-api-key und form-urlencoded Credentials an POST /user", async () => {
    let captured: { url: string; init?: RequestInit } | null = null;
    const fetchImpl: typeof fetch = async (input, init) => {
      captured = { url: String(input), init };
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new InternetmarkeClient(config, fetchImpl);
    await expect(client.getAccessToken()).resolves.toBe("tok");

    expect(captured?.url).toMatch(/\/user$/);
    const headers = captured?.init?.headers as Record<string, string>;
    expect(headers["dhl-api-key"]).toBe("ApiKey123");
    expect(headers["Content-Type"]).toMatch(/x-www-form-urlencoded/i);
    const body = String(captured?.init?.body);
    expect(body).toContain("grant_type=client_credentials");
    expect(body).toContain("client_id=ApiKey123");
    expect(body).toContain("username=shop%40example.com");
  });

  it("wirft InternetmarkeHttpError mit Portokasse-Hinweis bei genericUserAuthenticationError", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          status: 401,
          title: "genericUserAuthenticationError",
          detail: "The user account is not valid, is locked, the provided authorization token is not valid",
        }),
        { status: 401 },
      );

    const client = new InternetmarkeClient(config, fetchImpl);
    await expect(client.getAccessToken()).rejects.toMatchObject({
      name: "InternetmarkeHttpError",
      status: 401,
      operation: "authorize",
    });
    try {
      await client.getAccessToken();
    } catch (e) {
      expect(e).toBeInstanceOf(InternetmarkeHttpError);
      if (e instanceof InternetmarkeHttpError) {
        expect(e.message).toMatch(/Developer-Portal „Approved“ reicht nicht/i);
        expect(e.responseBody).toMatch(/genericUserAuthenticationError/);
      }
    }
  });
});
