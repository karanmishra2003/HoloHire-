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
import { Loader2, Volume2, Clock, PhoneOff } from "lucide-react";

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
    const callEndedRef = useRef(false);
    const cleanupCalledRef = useRef(false);

    /* ─── State ─── */
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [isEnding, setIsEnding] = useState(false);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

    // Vapi / Connection States
    const [vapiConnected, setVapiConnected] = useState(false);
    const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
    const [userIsSpeaking, setUserIsSpeaking] = useState(false);
    const [timerStarted, setTimerStarted] = useState(false);

    // Live transcript from AI — this is what the question card displays
    const [liveAiText, setLiveAiText] = useState("");

    /* ─── Parse questions from Convex ─── */
    useEffect(() => {
        if (interview?.questions) {
            try {
                const parsed = JSON.parse(interview.questions);
                setQuestions(parsed);
            } catch {
                setQuestions([]);
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

        // Reset flags for this effect lifecycle
        callEndedRef.current = false;
        cleanupCalledRef.current = false;

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
- If the candidate says "I don't know", "skip this", or "next question", acknowledge briefly and move to the next question immediately.
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

        /* ── Event Listeners ── */
        vapi.on("call-start", () => {
            setVapiConnected(true);
        });

        vapi.on("speech-start", () => {
            setAiIsSpeaking(true);
            setUserIsSpeaking(false);
            // Pause the timer while AI is speaking
            if (timerRef.current) clearInterval(timerRef.current);
        });

        vapi.on("speech-end", () => {
            setAiIsSpeaking(false);
        });

        vapi.on("message", (msg: any) => {
            /* ── Real-time AI transcript → Question Card ── */
            if (msg.type === "transcript" && msg.role === "assistant") {
                setLiveAiText(msg.transcript);
                // Detect question advancement from AI speech
                for (let i = currentQuestionIndex + 1; i < questions.length; i++) {
                    const qText = questions[i].question.slice(0, 30);
                    if (msg.transcript.includes(qText)) {
                        advanceQuestion(i);
                        break;
                    }
                }
            }

            /* ── User transcript → start timer + skip detection ── */
            if (msg.type === "transcript" && msg.role === "user") {
                if (msg.transcriptType === "partial" && !userIsSpeaking) {
                    setUserIsSpeaking(true);
                    startTimer();
                }
                if (msg.transcriptType === "final") {
                    const text = msg.transcript.toLowerCase();
                    const skipPhrases = [
                        "i don't know", "i'm not sure", "i can't answer",
                        "skip this", "pass", "next question",
                    ];
                    if (skipPhrases.some((p: string) => text.includes(p))) {
                        handleSkipQuestion();
                    }
                }
            }
        });

        vapi.on("call-end", () => {
            callEndedRef.current = true;
            setVapiConnected(false);
            cleanupAndRedirect();
        });

        vapi.on("error", (err: any) => {
            // Suppress known "meeting ejection" errors during normal call teardown
            const errMsg = typeof err === "string" ? err : err?.message || String(err);
            if (errMsg.includes("ejection") || errMsg.includes("Meeting has ended")) {
                return;
            }
            console.error("Vapi error:", err);
        });

        return () => {
            if (!callEndedRef.current) {
                try {
                    vapi.stop();
                } catch {
                    // Call already ended — safe to ignore
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions]);

    /* ─── Timer Logic ─── */
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!timerStarted) {
            setTimerStarted(true);
            setTimeLeft(QUESTION_TIME_SECONDS);
        }

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
    }, [timerStarted]);

    const handleTimerExpired = () => {
        const next = currentQuestionIndex + 1;
        if (next < questions.length) {
            vapiRef.current?.send({
                type: "add-message",
                message: {
                    role: "system",
                    content: `Time is up. Move to question ${next + 1}: "${questions[next].question}"`,
                },
            });
            advanceQuestion(next);
        } else {
            vapiRef.current?.send({
                type: "add-message",
                message: {
                    role: "system",
                    content: "Time is up for the final question. Conclude the interview.",
                },
            });
        }
    };

    const handleSkipQuestion = () => {
        const next = currentQuestionIndex + 1;
        if (next < questions.length) {
            vapiRef.current?.send({
                type: "add-message",
                message: {
                    role: "system",
                    content: "User requested to skip. Acknowledge briefly and ask the next question immediately.",
                },
            });
            advanceQuestion(next);
        }
    };

    const advanceQuestion = (idx: number) => {
        setCurrentQuestionIndex(idx);
        setTimeLeft(QUESTION_TIME_SECONDS);
        setUserIsSpeaking(false);
        setTimerStarted(false);
        setLiveAiText("");
        if (timerRef.current) clearInterval(timerRef.current);
    };

    /* ─── Cleanup ─── */
    const cleanupAndRedirect = () => {
        if (cleanupCalledRef.current) return;
        cleanupCalledRef.current = true;
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
    const userName = user?.fullName || user?.firstName || "Candidate";
    const userImageUrl = user?.imageUrl;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const currentQuestion = questions[currentQuestionIndex]?.question ?? "";
    // Show live AI text if available, otherwise show the stored question
    const displayedQuestion = liveAiText || currentQuestion;

    const timerColor =
        timeLeft <= 15 ? "text-red-400" :
            timeLeft <= 30 ? "text-amber-400" :
                "text-white";
    const timerBg =
        timeLeft <= 15 ? "bg-red-500/15 border-red-500/30" :
            timeLeft <= 30 ? "bg-amber-500/15 border-amber-500/30" :
                "bg-white/5 border-white/10";

    /* ─── Loading ─── */
    if (!interview) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
                <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-[#0a0e17] text-white overflow-hidden">
            {/* ── Header ── */}
            <header className="shrink-0 border-b border-white/5 bg-[#0a0e17]/90 backdrop-blur-lg px-6 py-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    {/* Left: Brand */}
                    <div className="flex items-center gap-3">
                        <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
                            <circle cx="14" cy="18" r="11" fill="#3B82F6" opacity="0.6" />
                            <circle cx="22" cy="18" r="11" fill="#60A5FA" />
                        </svg>
                        <span className="text-lg font-bold tracking-tight">HoloHire</span>
                        {questions.length > 0 && (
                            <span className="ml-2 text-xs font-medium text-gray-500">
                                Q{currentQuestionIndex + 1}/{questions.length}
                            </span>
                        )}
                    </div>

                    {/* Center: Answer Timer (replaces Live indicator) */}
                    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all duration-300 ${timerBg}`}>
                        <Clock className={`size-4 ${timerColor}`} />
                        <span className={`font-mono text-sm font-bold tabular-nums ${timerColor}`}>
                            {formatTime(timeLeft)}
                        </span>
                        {timerStarted && (
                            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                    </div>

                    {/* Right: End Interview */}
                    <button
                        onClick={handleEnd}
                        disabled={isEnding}
                        className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isEnding ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <PhoneOff className="size-4" />
                        )}
                        {isEnding ? "Ending…" : "End Interview"}
                    </button>
                </div>
            </header>

            {/* ── Main: Two Side-by-Side Cards ── */}
            <main className="flex-1 flex flex-col min-h-0 p-4 gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">

                    {/* ── AI Interviewer Card ── */}
                    <div className="relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 overflow-hidden">
                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.08),transparent_60%)]" />

                        {/* Avatar + Name */}
                        <div className="relative flex flex-col items-center gap-5 z-10">
                            <div className="relative">
                                <div className={`flex size-28 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 ${aiIsSpeaking ? 'scale-105 shadow-[0_0_50px_rgba(59,130,246,0.4)]' : ''}`}>
                                    <Volume2 className={`size-10 text-cyan-400 transition-transform duration-300 ${aiIsSpeaking ? 'scale-110' : ''}`} />
                                </div>
                                {aiIsSpeaking && (
                                    <>
                                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/40 animate-[ping_1.5s_ease-in-out_infinite]" />
                                        <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-[ping_2s_ease-in-out_infinite_0.5s]" />
                                    </>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white">AI Interviewer</h3>
                                <p className="text-xs text-gray-500 mt-0.5">HoloHire Assistant</p>
                            </div>
                        </div>
                    </div>

                    {/* ── User Webcam Card ── */}
                    <div className="relative rounded-2xl bg-[#111827] border border-white/10 overflow-hidden">
                        {stream ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="size-full object-cover scale-x-[-1]"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center bg-[#1f2937]">
                                <Loader2 className="size-8 animate-spin text-gray-500" />
                            </div>
                        )}

                        {/* Name Badge */}
                        <div className="absolute bottom-4 left-4">
                            <div className="bg-black/50 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 flex items-center gap-2">
                                {userImageUrl ? (
                                    <img src={userImageUrl} alt="User" className="size-5 rounded-full" />
                                ) : (
                                    <div className="size-5 rounded-full bg-cyan-500 flex items-center justify-center text-[9px] font-bold">
                                        {userName.charAt(0)}
                                    </div>
                                )}
                                <span className="text-xs font-medium">{userName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Current Question Bar (synced to AI speech) ── */}
                <div className={`shrink-0 rounded-xl border transition-all duration-500 ${aiIsSpeaking
                    ? 'border-cyan-500/30 bg-cyan-500/5'
                    : 'border-white/10 bg-white/[0.03]'
                    }`}>
                    <div className="px-6 py-4 flex items-start gap-4">
                        <div className="shrink-0 mt-0.5">
                            <div className={`flex size-8 items-center justify-center rounded-full transition-colors duration-300 ${aiIsSpeaking ? 'bg-cyan-500/20' : 'bg-white/5'
                                }`}>
                                <Volume2 className={`size-4 transition-colors duration-300 ${aiIsSpeaking ? 'text-cyan-400 animate-pulse' : 'text-gray-500'
                                    }`} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </span>
                                {aiIsSpeaking && (
                                    <span className="text-[10px] text-cyan-400/60 font-medium">● Speaking</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed">
                                {displayedQuestion || "Waiting for the interviewer..."}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
