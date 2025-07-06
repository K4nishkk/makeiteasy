import { NextResponse } from "next/server";

import main from ".";

export async function GET() {
  try {
    const data = await main();
    return NextResponse.json({ message: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}