import { NextResponse } from "next/server";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST() {
    try {
        if (!HEYGEN_API_KEY) {
            throw new Error("HEYGEN_API_KEY is missing from .env.local");
        }

        const baseApiUrl =
            process.env.NEXT_PUBLIC_BASE_API_URL || "https://api.heygen.com";

        const res = await fetch(`${baseApiUrl}/v1/streaming.create_token`, {
            method: "POST",
            headers: {
                "x-api-key": HEYGEN_API_KEY,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(
                `HeyGen token request failed (${res.status}): ${errorText}`
            );
        }

        const data = await res.json();

        return new NextResponse(data.data.token, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
        });
    } catch (error) {
        console.error("Error retrieving HeyGen access token:", error);
        return new NextResponse("Failed to retrieve access token", {
            status: 500,
        });
    }
}
