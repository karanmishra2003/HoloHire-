"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Award, ArrowRight, Calendar, Briefcase } from "lucide-react";

interface Interview {
    _id: string;
    jobDescription: string;
    status?: string;
    feedback?: string;
    createdAt: number;
}

interface Props {
    interviews: Interview[];
    userName: string;
}

function getScoreFromFeedback(feedbackStr: string): number {
    try {
        const feedback = JSON.parse(feedbackStr);
        if (!Array.isArray(feedback) || feedback.length === 0) return 0;
        const total = feedback.reduce((acc: number, item: any) => acc + (item.score || 0), 0);
        const max = feedback.length * 10;
        return max > 0 ? Math.round((total / max) * 100) : 0;
    } catch {
        return 0;
    }
}

function getPerformanceLabel(pct: number) {
    if (pct >= 100) return { label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", accent: "emerald" };
    if (pct >= 70) return { label: "Good", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", accent: "blue" };
    if (pct >= 50) return { label: "Average", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", accent: "yellow" };
    return { label: "Not Qualified", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", accent: "red" };
}

function getAccentColor(pct: number): string {
    if (pct >= 70) return "#10b981";
    if (pct >= 50) return "#eab308";
    return "#ef4444";
}

export default function RecentInterviewResults({ interviews, userName }: Props) {
    const router = useRouter();

    const completed = interviews
        .filter((i) => i.status === "completed" && i.feedback && i.feedback.length > 5)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6);

    if (completed.length === 0) return null;

    return (
        <section className="w-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Recent Interview Results</h2>
                    <p className="text-sm text-gray-500 mt-1">Your latest performance scores</p>
                </div>
                <span className="text-xs text-gray-600 uppercase tracking-widest font-medium">
                    {completed.length} completed
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((interview) => {
                    const score = getScoreFromFeedback(interview.feedback!);
                    const perf = getPerformanceLabel(score);
                    const accent = getAccentColor(score);
                    const role = interview.jobDescription.length > 60
                        ? interview.jobDescription.slice(0, 60) + "…"
                        : interview.jobDescription;
                    const date = new Date(interview.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    });

                    return (
                        <div
                            key={interview._id}
                            className="group relative rounded-xl border border-white/[0.06] bg-[#111827] p-5 shadow-md transition-all duration-200 hover:border-white/10 hover:shadow-lg hover:bg-[#131c30]"
                        >
                            {/* Score accent bar */}
                            <div
                                className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: accent }}
                            />

                            {/* Header row */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{userName}</p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Briefcase className="size-3 text-gray-500 shrink-0" />
                                        <p className="text-xs text-gray-400 truncate">{role || "Interview"}</p>
                                    </div>
                                </div>

                                {/* Large score */}
                                <div className="text-right shrink-0">
                                    <span className="text-3xl font-extrabold tracking-tight" style={{ color: accent }}>
                                        {score}%
                                    </span>
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <Calendar className="size-3" />
                                        <span className="text-[11px]">{date}</span>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${perf.bg} ${perf.color} ${perf.border} border`}>
                                        {perf.label}
                                    </span>
                                </div>

                                <button
                                    onClick={() => router.push(`/interview/${interview._id}/feedback`)}
                                    className="flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-white group-hover:text-gray-300"
                                >
                                    View
                                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
