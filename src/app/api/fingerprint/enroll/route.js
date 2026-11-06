import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Fingerprint enrollment is disabled in this project.", enabled: false },
    { status: 400 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Fingerprint enrollment is disabled in this project.", enabled: false },
    { status: 400 }
  );
}
