import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recordTrade } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, action, shares, price, note } = body;

    if (!ticker || !action || !shares || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (action !== "buy" && action !== "sell") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (Number(shares) <= 0 || Number(price) <= 0) {
      return NextResponse.json({ error: "Shares and price must be positive" }, { status: 400 });
    }

    const result = await recordTrade({
      ticker: String(ticker).toUpperCase(),
      action,
      shares: Number(shares),
      price: Number(price),
      note: note ? String(note) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Invalidate the dashboard so it reflects new holdings
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("trade route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
