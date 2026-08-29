import { NextResponse, type NextRequest } from "next/server";
import { addToCartFromFormData } from "@/lib/cart/add-to-cart-from-form-data";

/** Karussell Quick-Add ohne Server Action — vermeidet RSC-Refresh (Suspense-Flash). */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = await addToCartFromFormData(formData);

  if (result?.error) {
    return NextResponse.json(result, {
      status: 400,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
