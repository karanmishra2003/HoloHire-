import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "http://localhost:5678/webhook/900fe8ae-166a-4346-a582-b76e32e16700";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  try {
    // Case 1: resume upload via multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const resumeUrl = formData.get("resumeUrl");

      if (!resumeUrl || typeof resumeUrl !== "string") {
        return NextResponse.json(
          { success: false, message: "No resume URL provided" },
          { status: 400 },
        );
      }

      // Call n8n webhook with the resume URL
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "resume",
          resumeUrl,
        }),
      });

      const n8nData = await n8nResponse.json();
      console.log("✅ n8n webhook response (resume):", n8nData);

      return NextResponse.json({
        success: true,
        source: "resume",
        data: n8nData,
      });
    }

    // Case 2: job description sent as JSON
    const body = await req.json().catch(() => null as any);
    const description = body?.description;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { success: false, message: "Job description is required" },
        { status: 400 },
      );
    }

    // Call n8n webhook with the job description
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "job",
        jobDescription: description,
      }),
    });

    const n8nData = await n8nResponse.json();
    console.log("✅ n8n webhook response (job):", n8nData);

    return NextResponse.json({
      success: true,
      source: "job",
      data: n8nData,
    });
  } catch (error) {
    console.error("Error in generate-interview-questions:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 },
    );
  }
}
