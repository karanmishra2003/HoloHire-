"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useContext,
    useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserDetailContext } from "@/context/UserDetailContext";
import Vapi from "@vapi-ai/web";
import { Loader2, MessageCircle } from "lucide-react";

/* ─── Types ─── */
interface QuestionItem {
    question: string;
    answer?: string;
}

/* ─── Constants ─── */
const QUESTION_TIME_SECONDS = 120;

export default function LiveInterviewPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useContext(UserDetailContext);
    const interviewId = params.interviewId as string;

    const interview = useQuery(api.Interviews.GetById, {
        interviewId: interviewId as Id<"Interviews">,
    });

    /* ─── Refs ─── */
    const videoRef = useRef<HTMLVideoElement>(null);
    const vapiRef = useRef<Vapi | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* ─── State ─── */
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [transcript, setTranscript] = useState("Connecting to AI interviewer…");
    const [isEnding, setIsEnding] = useState(false);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
    const [vapiConnected, setVapiConnected] = useState(false);

    /* ─── Parse questions from Convex ─── */
    useEffect(() => {
        if (interview?.questions) {
            try {
                const parsed = JSON.parse(interview.questions);
                setQuestions(parsed);
                if (parsed.length > 0) {
                    setTranscript(parsed[0].question || "Tell me about yourself.");
                }
            } catch {
                setQuestions([]);
                setTranscript("Tell me about yourself.");
            }
        }
    }, [interview?.questions]);

    /* ─── Start webcam ─── */
    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Failed to access camera:", err);
            }
        };
        startCamera();
    }, []);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    /* ─── Initialize Vapi ─── */
    useEffect(() => {
        if (!questions.length) return;

        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        if (!publicKey) {
            console.error("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY");
            return;
        }

        const vapi = new Vapi(publicKey);
        vapiRef.current = vapi;

        const questionList = questions
            .map((q, i) => `${i + 1}. ${q.question}`)
            .join("\n");

        const systemPrompt = `You are a professional AI interviewer for HoloHire. You are conducting a technical/behavioral interview.

Here are the interview questions you must ask, one at a time, in order:
${questionList}

Instructions:
- Greet the candidate warmly first.
- Ask question 1, then wait for their answer.
- After they answer (or if they seem stuck), briefly acknowledge and move to the next question.
- Keep your responses concise and professional.
- Do NOT reveal the answers.
- After all questions, thank the candidate and say the interview is concluded.`;

        vapi.start({
            model: {
                provider: "openai",
                model: "gpt-4",
                messages: [{ role: "system", content: systemPrompt }],
            },
            name: "HoloHire AI Interviewer",
            voice: {
                provider: "11labs",
                voiceId: "21m00Tcm4TlvDq8ikWAM",
            },
            firstMessage:
                "Hello! Welcome to your HoloHire interview. I'm your AI interviewer today. Let's get started. Are you ready?",
        });

        vapi.on("call-start", () => {
            setVapiConnected(true);
            startTimer();
        });

        vapi.on("message", (msg: any) => {
            if (msg.role === "assistant" && msg.content) {
                setTranscript(msg.content);
                for (let i = currentQuestionIndex + 1; i < questions.length; i++) {
                    const qText = questions[i].question.slice(0, 30);
                    if (msg.content.includes(qText)) {
                        advanceQuestion(i);
                        break;
                    }
                }
            }
        });

        vapi.on("call-end", () => {
            setVapiConnected(false);
            cleanupAndRedirect();
        });

        vapi.on("error", (err: any) => {
            console.error("Vapi error:", err);
        });

        return () => {
            vapi.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions]);

    /* ─── Timer ─── */
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(QUESTION_TIME_SECONDS);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    handleTimerExpired();
                    return QUESTION_TIME_SECONDS;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleTimerExpired = () => {
        setCurrentQuestionIndex((prev) => {
            const next = prev + 1;
            if (next >= questions.length) {
                vapiRef.current?.send({
                    type: "add-message",
                    message: {
                        role: "system",
                        content:
                            "The timer for the final question has ended. Please wrap up and thank the candidate.",
                    },
                });
                return prev;
            }
            vapiRef.current?.send({
                type: "add-message",
                message: {
                    role: "system",
                    content: `Time is up. Please move on to question ${next + 1}: "${questions[next].question}"`,
                },
            });
            setTranscript(questions[next].question);
            startTimer();
            return next;
        });
    };

    const advanceQuestion = (idx: number) => {
        setCurrentQuestionIndex(idx);
        setTranscript(questions[idx].question);
        startTimer();
    };

    /* ─── End interview ─── */
    const cleanupAndRedirect = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        stream?.getTracks().forEach((t) => t.stop());
        router.push("/dashboard");
    };

    const handleEnd = () => {
        setIsEnding(true);
        vapiRef.current?.stop();
        setTimeout(cleanupAndRedirect, 800);
    };

    /* ─── Helpers ─── */
    const userName = user?.fullName || user?.firstName || "You";
    const userImageUrl = user?.imageUrl;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    /* ─── Loading ─── */
    if (!interview) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
                <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white">
            {/* ── Header ── */}
            <header className="px-8 pt-6 pb-2">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-white">
                        <MessageCircle className="size-5 text-[#0a0e17]" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">HoloHire</span>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="flex flex-1 flex-col px-8 pb-8">
                {/* Label */}
                <h2 className="mt-4 mb-6 text-base font-semibold text-gray-200">
                    Interview Generation
                </h2>

                {/* ── Two cards side by side ── */}
                <div className="grid flex-1 grid-cols-1 gap-5 md:grid-cols-2"
                    style={{ minHeight: "380px" }}>
                    {/* AI Interviewer */}
                    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-[#2a3a6a]/60 bg-gradient-to-br from-[#101c42] via-[#0e1835] to-[#0b1025]">
                        {/* Icon */}
                        <div className="mb-5 flex size-[88px] items-center justify-center rounded-full bg-white shadow-lg">
                            <MessageCircle className="size-11 text-[#0a0e17]" />
                        </div>
                        <p className="text-lg font-semibold">AI Interviewer</p>

                        {/* Timer badge — top-right corner */}
                        {vapiConnected && (
                            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
                                <span
                                    className={`font-mono text-xs font-semibold ${timeLeft <= 15
                                        ? "text-red-400"
                                        : timeLeft <= 30
                                            ? "text-amber-400"
                                            : "text-cyan-400"
                                        }`}
                                >
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                        )}

                        {/* Question badge — bottom */}
                        {questions.length > 0 && (
                            <span className="mt-3 text-xs text-cyan-400">
                                Question {currentQuestionIndex + 1} / {questions.length}
                            </span>
                        )}
                    </div>

                    {/* User / Candidate */}
                    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111827]">
                        {/* Circular live webcam feed */}
                        <div className="mb-5 size-[88px] overflow-hidden rounded-full ring-2 ring-white/10">
                            {stream ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="size-full object-cover"
                                />
                            ) : userImageUrl ? (
                                <img
                                    src={userImageUrl}
                                    alt={userName}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="flex size-full items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl font-bold uppercase">
                                    {userName.charAt(0)}
                                </div>
                            )}
                        </div>
                        <p className="text-lg font-semibold">{userName}</p>
                    </div>
                </div>

                {/* ── Transcript bar ── */}
                <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-4">
                    <p className="text-center text-sm italic text-gray-300 leading-relaxed">
                        {transcript}
                    </p>
                </div>

                {/* ── End button ── */}
                <div className="mt-5 flex justify-center">
                    <button
                        onClick={handleEnd}
                        disabled={isEnding}
                        className="rounded-full bg-red-500 px-10 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400 disabled:opacity-50"
                    >
                        {isEnding ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Ending…
                            </span>
                        ) : (
                            "End"
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}
