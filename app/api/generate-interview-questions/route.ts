import { NextRequest, NextResponse } from "next/server";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "your_public_api_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "your_private_api_key",
  urlEndpoint:
    process.env.IMAGEKIT_URL_ENDPOINT ||
    "https://ik.imagekit.io/your_imagekit_id/",
});

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  try {
    // Case 1: resume upload via multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { success: false, message: "No resume file provided" },
          { status: 400 },
        );
      }

      // TODO: upload the file to ImageKit and generate questions.
      // For now we just return a mocked interview id.
      return NextResponse.json({
        success: true,
        source: "resume",
        interviewId: Date.now().toString(),
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

    // TODO: generate interview questions from description.
    return NextResponse.json({
      success: true,
      source: "job",
      interviewId: Date.now().toString(),
    });
  } catch (error) {
    console.error("Error in generate-interview-questions:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 },
    );
  }
}
