import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { valid: false, error: "Fingerprint features are disabled in this project. Please use PIN or password authentication.", enabled: false },
    { status: 400 }
  );
}
