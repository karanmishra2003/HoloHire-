import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { questions, answers } = await req.json();

        if (!questions || !answers) {
            return NextResponse.json(
                { error: "Missing questions or answers" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key not configured" },
                { status: 500 }
            );
        }

        const prompt = `
      You are an expert strict interview evaluator.
      
      Evaluation Rules:
      1. Analyze each Question and Answer pair.
      2. If the answer is "I don't know", "I can't answer", "skip", "pass", or similar variations indicating they did not answer, give a score of 1 out of 10.
      3. If the answer is empty or "No answer provided", give a score of 0 out of 10.
      4. For valid answers, score from 1-10 based on relevance, depth, and clarity.
      5. Provide constructive feedback (2-3 sentences max) for each answer.
      
      Input Data:
      Questions: ${JSON.stringify(questions)}
      Answers: ${JSON.stringify(answers)}
      
      Output Format (JSON Array only):
      [
        {
          "questionIndex": 0,
          "score": 7,
          "feedback": "Good explanation but missed..."
        },
        ...
      ]
    `;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        response_mime_type: "application/json",
                    },
                }),
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error("No response from AI");
        }

        const feedback = JSON.parse(text);

        return NextResponse.json({ feedback });

    } catch (error: any) {
        console.error("Feedback generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate feedback" },
            { status: 500 }
        );
    }
}
