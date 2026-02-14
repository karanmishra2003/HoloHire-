"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Star,
    Award,
} from "lucide-react";

export default function FeedbackPage() {
    const params = useParams();
    const router = useRouter();
    const interviewId = params.interviewId as string;

    const interview = useQuery(api.Interviews.GetById, {
        interviewId: interviewId as Id<"Interviews">,
    });

    const updateFeedback = useMutation(api.Interviews.UpdateFeedback);

    const [feedbackData, setFeedbackData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    useEffect(() => {
        if (interview) {
            if (interview.feedback && interview.feedback.length > 5) { // Check for valid JSON string
                try {
                    setFeedbackData(JSON.parse(interview.feedback));
                } catch (e) {
                    console.error("Failed to parse feedback", e);
                }
            } else if (!loading && interview.questions && interview.answers) {
                // No feedback yet, generate it
                generateFeedback();
            }
        }
    }, [interview]);

    const generateFeedback = async () => {
        setLoading(true);
        try {
            const answers = JSON.parse(interview!.answers!);
            const questions = JSON.parse(interview!.questions!);

            const res = await fetch("/api/generate-feedback", {
                method: "POST",
                body: JSON.stringify({
                    questions: questions.map((q: any) => q.question),
                    answers: answers.map((a: any) => a.userAnswer),
                }),
            });

            const data = await res.json();

            if (data.feedback) {
                setFeedbackData(data.feedback);

                // Save to convex
                await updateFeedback({
                    interviewId: interviewId as Id<"Interviews">,
                    feedback: JSON.stringify(data.feedback),
                    answers: interview!.answers!,
                    status: "completed",
                });
            }
        } catch (error) {
            console.error("Error generating feedback:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!interview) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
                <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    // Calculate Overall Score
    const totalScore = feedbackData.reduce((acc, item) => acc + item.score, 0);
    const maxScore = feedbackData.length * 10;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    let ratingLabel = "Analyzing...";
    let ratingColor = "text-gray-400";

    if (percentage >= 100) {
        ratingLabel = "Excellent Performance";
        ratingColor = "text-green-400";
    } else if (percentage >= 70) {
        ratingLabel = "Good Performance";
        ratingColor = "text-blue-400";
    } else if (percentage >= 50) {
        ratingLabel = "Average";
        ratingColor = "text-yellow-400";
    } else if (maxScore > 0) {
        ratingLabel = "Does Not Qualify";
        ratingColor = "text-red-400";
    }

    return (
        <div className="min-h-screen bg-[#0a0e17] text-white p-6 md:p-10 font-sans">
            <div className="mx-auto max-w-4xl space-y-8">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Interview Results</h1>
                    <p className="text-gray-400">Here is your AI-generated performance feedback.</p>
                </div>

                {/* Score Card */}
                <div className="rounded-2xl border border-white/10 bg-[#0f1629] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Award className="size-48 text-white" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16 justify-center">
                        {/* Circular Score */}
                        <div className="relative size-40 md:size-48 shrink-0">
                            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    strokeDasharray="283"
                                    strokeDashoffset={283 - (283 * percentage) / 100}
                                    className={`transition-all duration-1000 ease-out ${ratingColor.replace('text-', 'stroke-')}`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold">{percentage}%</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">Score</span>
                            </div>
                        </div>

                        {/* Text Rating */}
                        <div className="text-center md:text-left space-y-3">
                            <h2 className={`text-2xl md:text-3xl font-bold ${ratingColor}`}>{ratingLabel}</h2>
                            <p className="text-gray-400 max-w-sm leading-relaxed text-sm">
                                Based on your answers, our AI has evaluated your technical knowledge, communication skills, and problem-solving ability.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Loading State for Feedback Generation */}
                {loading && (
                    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                        <Loader2 className="size-8 animate-spin text-cyan-400 mb-4" />
                        <p className="text-gray-400 animate-pulse">Generating detailed feedback...</p>
                    </div>
                )}

                {/* Feedback List */}
                {!loading && feedbackData.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Star className="size-5 text-yellow-500 fill-yellow-500" />
                            Question Analysis
                        </h3>

                        {feedbackData.map((item, index) => (
                            <div
                                key={index}
                                className="group overflow-hidden rounded-xl border border-white/10 bg-[#111827] transition-all hover:border-cyan-500/30"
                            >
                                {/* Question Header */}
                                <div
                                    className="flex cursor-pointer items-start justify-between gap-4 p-5 bg-white/[0.02]"
                                    onClick={() => setOpenIndex(index === openIndex ? null : index)}
                                >
                                    <div className="flex-1 space-y-1">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Question {index + 1}</span>
                                        <h4 className="text-base font-semibold text-white">
                                            {interview.questions && JSON.parse(interview.questions)[index]?.question}
                                        </h4>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${item.score >= 7 ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                item.score >= 4 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                                    "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}>
                                            {item.score}/10
                                        </div>
                                        {openIndex === index ? (
                                            <ChevronUp className="size-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="size-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {openIndex === index && (
                                    <div className="border-t border-white/5 bg-black/20 p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        {/* User Answer */}
                                        <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                                            <h5 className="text-xs font-bold text-red-400 mb-1 uppercase">Your Answer:</h5>
                                            <p className="text-sm text-gray-300 italic">
                                                "{JSON.parse(interview.answers!)[index]?.userAnswer || "No answer provided"}"
                                            </p>
                                        </div>

                                        {/* AI Feedback */}
                                        <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3">
                                            <h5 className="text-xs font-bold text-green-400 mb-1 uppercase">AI Feedback:</h5>
                                            <p className="text-sm text-gray-300 leading-relaxed">
                                                {item.feedback}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-8 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
