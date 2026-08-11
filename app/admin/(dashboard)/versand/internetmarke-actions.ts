"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  disconnectInternetmarkeConnection,
  fetchInternetmarkeCatalogProducts,
  getInternetmarkeConnectionPublic,
  getInternetmarkeConnectionSecrets,
  InternetmarkeClient,
  markInternetmarkeConnectionError,
  saveInternetmarkeConnection,
  updateInternetmarkeSelectedProduct,
} from "@/features/fulfillment";
import { getAdminSession } from "@/lib/auth/admin-session";
import { z } from "zod";

export type InternetmarkeAdminActionState =
  | {
      ok?: boolean;
      error?: string;
      message?: string;
      products?: Array<{
        productCode: number;
        name: string;
        priceCents: number;
        transport: string;
        maxWeightG: number | null;
      }>;
    }
  | null;

const credentialsSchema = z.object({
  clientId: z.string().trim().min(8, "API Key / Client ID zu kurz.").max(200),
  clientSecret: z.string().trim().max(200).optional(),
  username: z.string().trim().email("Portokasse-Benutzername muss eine E-Mail sein."),
  password: z.string().trim().max(22, "Portokasse-Passwort max. 22 Zeichen.").optional(),
});

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

/**
 * Speichert Credentials (verschlüsselt) und prüft Token via POST /user.
 */
export async function saveInternetmarkeCredentialsAction(
  _prev: InternetmarkeAdminActionState,
  formData: FormData,
): Promise<InternetmarkeAdminActionState> {
  await requireAdmin();

  const parsed = credentialsSchema.safeParse({
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret") || undefined,
    username: formData.get("username"),
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." };
  }

  const existing = await getInternetmarkeConnectionPublic();
  const clientSecret = parsed.data.clientSecret?.trim() ?? "";
  const password = parsed.data.password?.trim() ?? "";

  if (!existing.connected && (!clientSecret || !password)) {
    return { error: "API Secret und Portokasse-Passwort sind für die Ersteinrichtung Pflicht." };
  }

  try {
    await saveInternetmarkeConnection({
      clientId: parsed.data.clientId,
      clientSecret,
      username: parsed.data.username,
      password,
      keepExistingSecrets: existing.connected,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
    return { error: msg };
  }

  const secrets = await getInternetmarkeConnectionSecrets();
  if (!secrets) {
    return { error: "Credentials konnten nicht geladen werden." };
  }

  try {
    const client = new InternetmarkeClient({
      clientId: secrets.clientId,
      clientSecret: secrets.clientSecret,
      username: secrets.username,
      password: secrets.password,
      productCode: secrets.productCode ?? 1,
      productPriceCents: secrets.productPriceCents ?? 1,
      pageFormatId: secrets.pageFormatId,
      voucherLayout: secrets.voucherLayout,
    });
    await client.getAccessToken();
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Token-Test fehlgeschlagen. Portokasse: Geschäftsanwendung freigeben?";
    await markInternetmarkeConnectionError(msg);
    revalidatePath("/admin/versand");
    return {
      error: `${msg} Credentials wurden gespeichert — bitte Freigabe prüfen und erneut speichern.`,
    };
  }

  revalidatePath("/admin/versand");
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message:
      "Verbindung gespeichert und Token geprüft. Als Nächstes ein Porto-Produkt aus der Liste wählen.",
  };
}

export async function loadInternetmarkeProductsAction(
  _prev: InternetmarkeAdminActionState,
  _formData: FormData,
): Promise<InternetmarkeAdminActionState> {
  await requireAdmin();

  const secrets = await getInternetmarkeConnectionSecrets();
  if (!secrets) {
    return { error: "Zuerst Credentials speichern." };
  }

  const catalog = await fetchInternetmarkeCatalogProducts(secrets.clientId);
  if (!catalog.ok) {
    return { error: catalog.message };
  }

  return {
    ok: true,
    message: `${catalog.products.length} Produkte geladen (${catalog.fetchedAt}).`,
    products: catalog.products.map((p) => ({
      productCode: p.productCode,
      name: p.name,
      priceCents: p.priceCents,
      transport: p.transport,
      maxWeightG: p.maxWeightG,
    })),
  };
}

export async function selectInternetmarkeProductAction(
  _prev: InternetmarkeAdminActionState,
  formData: FormData,
): Promise<InternetmarkeAdminActionState> {
  await requireAdmin();

  const productCodeRaw = formData.get("productCode");
  const productCode =
    typeof productCodeRaw === "string" ? Number.parseInt(productCodeRaw, 10) : NaN;
  if (!Number.isFinite(productCode) || productCode <= 0) {
    return { error: "Bitte ein Produkt auswählen." };
  }

  const secrets = await getInternetmarkeConnectionSecrets();
  if (!secrets) {
    return { error: "Zuerst Credentials speichern." };
  }

  const catalog = await fetchInternetmarkeCatalogProducts(secrets.clientId);
  if (!catalog.ok) {
    return { error: catalog.message };
  }
  const product = catalog.products.find((p) => p.productCode === productCode);
  if (!product) {
    return { error: "Produkt nicht in der aktuellen Preisliste gefunden." };
  }

  await updateInternetmarkeSelectedProduct({
    productCode: product.productCode,
    productPriceCents: product.priceCents,
    productNameSnapshot: product.name,
  });

  revalidatePath("/admin/versand");
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message: `Produkt gespeichert: ${product.name} (${(product.priceCents / 100).toFixed(2)} €). Preis kommt aus der Products API.`,
  };
}

export async function disconnectInternetmarkeAction(
  _prev: InternetmarkeAdminActionState,
  _formData: FormData,
): Promise<InternetmarkeAdminActionState> {
  await requireAdmin();
  const ok = await disconnectInternetmarkeConnection();
  revalidatePath("/admin/versand");
  revalidatePath("/admin/orders");
  return ok
    ? { ok: true, message: "Internetmarke-Verbindung entfernt." }
    : { error: "Keine Verbindung vorhanden." };
}
