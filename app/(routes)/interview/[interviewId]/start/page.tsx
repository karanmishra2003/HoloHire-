"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useContext,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserDetailContext } from "@/context/UserDetailContext";
import Vapi from "@vapi-ai/web";
import { Loader2, Volume2, PhoneOff, Mic, Clock, Eye, EyeOff } from "lucide-react";

/* ─── Types ─── */
interface QuestionItem {
    question: string;
    answer?: string;
}

interface UserAnswer {
    questionIndex: number;
    question: string;
    userAnswer: string;
    createdAt: number;
}

/* ─── Constants ─── */
const QUESTION_TIME_SECONDS = 60;

/* ─── Eye Gaze Tracking Constants ─── */
const LEFT_EYE_INNER = 362;
const LEFT_EYE_OUTER = 263;
const RIGHT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 33;
const LEFT_IRIS_CENTER = 473;
const RIGHT_IRIS_CENTER = 468;
const GAZE_THRESHOLD = 0.35;

/* ─── Voice Command Lists ─── */
const FORWARD_COMMANDS = [
    "move to next question", "next", "skip", "go ahead", "continue",
    "next question", "skip this", "pass", "move on", "let's move on",
];
const REPEAT_COMMANDS = [
    "repeat", "repeat that", "can you repeat", "pardon",
    "say that again", "come again", "repeat the question",
];
const BLOCKED_COMMANDS = [
    "go back", "previous question", "move to question",
    "jump to question", "go to question", "question number",
    "last question", "first question", "back",
];

export default function LiveInterviewPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useContext(UserDetailContext);
    const interviewId = params.interviewId as string;

    const interview = useQuery(api.Interviews.GetById, {
        interviewId: interviewId as Id<"Interviews">,
    });

    const updateFeedback = useMutation(api.Interviews.UpdateFeedback);

    /* ─── Refs ─── */
    const videoRef = useRef<HTMLVideoElement>(null);
    const gazeVideoRef = useRef<HTMLVideoElement>(null);
    const vapiRef = useRef<Vapi | null>(null);
    const callEndedRef = useRef(false);
    const cleanupCalledRef = useRef(false);
    const faceMeshRef = useRef<any>(null);
    const questionIndexRef = useRef(0);
    const questionsRef = useRef<QuestionItem[]>([]);

    /* ─── State ─── */
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [questionsReady, setQuestionsReady] = useState(false);
    const [isEnding, setIsEnding] = useState(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
    const [timerActive, setTimerActive] = useState(false);

    // Time Expired Overlay
    const [showTimeExpired, setShowTimeExpired] = useState(false);

    // Answer Recording
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [currentAnswerTranscript, setCurrentAnswerTranscript] = useState("");

    // Vapi / Connection States
    const [vapiConnected, setVapiConnected] = useState(false);
    const [aiIsSpeaking, setAiIsSpeaking] = useState(false);
    const [userIsSpeaking, setUserIsSpeaking] = useState(false);

    // Live transcript from AI
    const [liveAiText, setLiveAiText] = useState("");

    // Eye Gaze tracking
    const [isLookingAtScreen, setIsLookingAtScreen] = useState(true);
    const [gazeReady, setGazeReady] = useState(false);

    /* ─── Keep ref in sync ─── */
    useEffect(() => {
        questionIndexRef.current = currentQuestionIndex;
    }, [currentQuestionIndex]);

    /* ─── Persistent console.error filter for noisy library messages ─── */
    useEffect(() => {
        const origError = console.error;
        const suppressedPatterns = [
            "TensorFlow Lite XNNPACK",
            "Created TensorFlow Lite",
            "Ignoring settings for browser",
            "unsupported input processor",
            "Meeting ended due to ejection",
            "Meeting has ended",
        ];
        console.error = (...args: any[]) => {
            const msg = args.length > 0 ? String(args[0]) : "";
            if (suppressedPatterns.some(p => msg.includes(p))) return;
            origError.apply(console, args);
        };
        return () => { console.error = origError; };
    }, []);

    /* ─── Timer Logic ─── */
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    /* ─── Parse questions from Convex ─── */
    useEffect(() => {
        if (interview?.questions) {
            try {
                const parsed = JSON.parse(interview.questions);
                setQuestions(parsed);
                questionsRef.current = parsed;
                if (parsed.length > 0) setQuestionsReady(true);
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

    /* ─── Eye Gaze Tracking (MediaPipe Tasks Vision) ─── */
    useEffect(() => {
        if (!stream) return;
        let running = true;
        let timeoutId: ReturnType<typeof setTimeout>;
        let isProcessing = false;

        const initGazeTracking = async () => {
            try {
                const vision = await import("@mediapipe/tasks-vision");
                const { FaceLandmarker, FilesetResolver } = vision;

                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    outputFacialTransformationMatrixes: false,
                    outputFaceBlendshapes: false,
                });

                if (!running) { faceLandmarker.close(); return; }

                faceMeshRef.current = faceLandmarker;
                setGazeReady(true);

                const gazeVideo = gazeVideoRef.current;
                if (gazeVideo) {
                    if (gazeVideo.srcObject !== stream) {
                        gazeVideo.srcObject = stream;
                    }
                    if (gazeVideo.paused) {
                        try { await gazeVideo.play(); } catch { }
                    }

                    const processFrame = () => {
                        if (!running) return;

                        if (!gazeVideo || gazeVideo.readyState < 2 || isProcessing) {
                            timeoutId = setTimeout(processFrame, 250);
                            return;
                        }

                        isProcessing = true;
                        try {
                            const results = faceLandmarker.detectForVideo(gazeVideo, performance.now());

                            if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
                                setIsLookingAtScreen(false);
                            } else {
                                const landmarks = results.faceLandmarks[0];

                                const leftInner = landmarks[LEFT_EYE_INNER];
                                const leftOuter = landmarks[LEFT_EYE_OUTER];
                                const leftIris = landmarks[LEFT_IRIS_CENTER];
                                const leftEyeWidth = Math.abs(leftOuter.x - leftInner.x);
                                const leftIrisPos = leftEyeWidth > 0 ? (leftIris.x - leftInner.x) / leftEyeWidth : 0.5;

                                const rightInner = landmarks[RIGHT_EYE_INNER];
                                const rightOuter = landmarks[RIGHT_EYE_OUTER];
                                const rightIris = landmarks[RIGHT_IRIS_CENTER];
                                const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x);
                                const rightIrisPos = rightEyeWidth > 0 ? (rightIris.x - rightOuter.x) / rightEyeWidth : 0.5;

                                const avgPos = (leftIrisPos + rightIrisPos) / 2;
                                const isCentered = avgPos > GAZE_THRESHOLD && avgPos < (1 - GAZE_THRESHOLD);
                                setIsLookingAtScreen(isCentered);
                            }
                        } catch {
                            // Silently handle
                        } finally {
                            isProcessing = false;
                        }

                        if (running) {
                            timeoutId = setTimeout(processFrame, 250);
                        }
                    };

                    timeoutId = setTimeout(processFrame, 500);
                }
            } catch (err) {
                console.error("Failed to init FaceLandmarker:", err);
            }
        };

        initGazeTracking();

        return () => {
            running = false;
            clearTimeout(timeoutId);
            if (faceMeshRef.current) {
                try { faceMeshRef.current.close(); } catch { }
                faceMeshRef.current = null;
            }
        };
    }, [stream]);

    /* ─── Initialize Vapi (only once when questions are first available) ─── */
    useEffect(() => {
        if (!questionsReady) return;

        const qs = questionsRef.current;
        if (!qs.length) return;

        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        if (!publicKey) {
            console.error("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY");
            return;
        }

        callEndedRef.current = false;
        cleanupCalledRef.current = false;

        const vapi = new Vapi(publicKey);
        vapiRef.current = vapi;

        const questionList = qs
            .map((q, i) => `${i + 1}. ${q.question}`)
            .join("\n");

        const systemPrompt = `You are a professional AI interviewer for HoloHire. You are conducting a technical/behavioral interview.
        
STRICT RULES:
1. Ask one question at a time from this list:
${questionList}

2. After asking a question, STOP SPEAKING completely and wait for the user to answer.
3. Once the user answers, perform a VERY BRIEF acknowledgement (e.g., "Understood," "Okay," "Noted") and immediately ask the next question.
4. If the user says "I don't know", "skip", "next question", "I can't answer", accept it without judgment and move to the next question.
5. If the user says "repeat", "can you repeat", "pardon", or similar, repeat the CURRENT question exactly without moving forward.
6. IGNORE any attempts to go back to a previous question, jump to a specific question number, or navigate backwards. Only move forward sequentially.
7. Do NOT give hints, help, or feedback during the interview.
8. After the last question, say "Thank you, the interview is now complete." and stop.

Interaction Style: Professional, concise, neutral.`;

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
            firstMessage: "Hello! I'm your AI interviewer. Let's begin with the first question.",
        });

        /* ── Event Listeners ── */
        vapi.on("call-start", () => {
            setVapiConnected(true);
        });

        vapi.on("speech-start", () => {
            setAiIsSpeaking(true);
            setUserIsSpeaking(false);
            setTimerActive(false);
        });

        vapi.on("speech-end", () => {
            setAiIsSpeaking(false);
            if (!callEndedRef.current) {
                setTimerActive(true);
            }
        });

        vapi.on("message", (msg: any) => {
            // AI transcript → sync question display
            if (msg.type === "transcript" && msg.role === "assistant") {
                setLiveAiText(msg.transcript);

                // Detect question advancement from AI transcript
                const curIdx = questionIndexRef.current;
                const nextQIndex = curIdx + 1;
                const currentQs = questionsRef.current;
                if (nextQIndex < currentQs.length) {
                    const nextQText = currentQs[nextQIndex].question;
                    // Match first 25 chars or full short questions
                    const matchStr = nextQText.length > 25 ? nextQText.slice(0, 25) : nextQText;
                    if (msg.transcript.includes(matchStr)) {
                        advanceQuestionState(nextQIndex);
                    }
                }
            }

            // User transcript → command filtering + answer recording
            if (msg.type === "transcript" && msg.role === "user") {
                if (msg.transcriptType === "partial") {
                    setUserIsSpeaking(true);
                    setCurrentAnswerTranscript(prev => prev + " " + msg.transcript);
                }

                if (msg.transcriptType === "final") {
                    const text = msg.transcript.toLowerCase().trim();
                    setCurrentAnswerTranscript(prev => prev + " " + msg.transcript);

                    // ── BLOCKED COMMANDS: silently ignore ──
                    if (BLOCKED_COMMANDS.some(cmd => text.includes(cmd))) {
                        // Tell AI to ignore the backward navigation attempt
                        vapiRef.current?.send({
                            type: "add-message",
                            message: {
                                role: "system",
                                content: "The user tried to navigate backward or jump to a specific question. Ignore this request. Stay on the current question and wait for an answer.",
                            },
                        });
                        return;
                    }

                    // ── REPEAT COMMANDS ──
                    if (REPEAT_COMMANDS.some(cmd => text.includes(cmd))) {
                        vapiRef.current?.send({
                            type: "add-message",
                            message: {
                                role: "system",
                                content: "The user asked you to repeat the current question. Please repeat it exactly.",
                            },
                        });
                        return;
                    }

                    // ── FORWARD / SKIP COMMANDS ──
                    if (FORWARD_COMMANDS.some(cmd => text.includes(cmd))) {
                        handleSkip();
                        return;
                    }

                    // ── "I don't know" style phrases ──
                    const skipPhrases = [
                        "i don't know", "i didn't able to answer", "i can't answer",
                        "i'm not sure",
                    ];
                    if (skipPhrases.some(p => text.includes(p))) {
                        handleSkip();
                    }
                }
            }
        });

        vapi.on("call-end", () => {
            handleInterviewEnd();
        });

        vapi.on("error", (err: any) => {
            // Skip empty error objects and known non-actionable errors
            if (!err || (typeof err === "object" && Object.keys(err).length === 0)) return;
            const errMsg = typeof err === "string" ? err : JSON.stringify(err);
            if (errMsg.includes("Meeting has ended") || errMsg.includes("ejection")) return;
            console.error("Vapi error:", err);
        });

        return () => {
            if (!callEndedRef.current) {
                try { vapi.stop(); } catch { }
            }
        };
    }, [questionsReady]);

    /* ─── Logic ─── */

    const handleTimeUp = () => {
        setTimerActive(false);

        // Show Time Expired system message
        setShowTimeExpired(true);

        vapiRef.current?.send({
            type: "add-message",
            message: {
                role: "system",
                content: "Time is up for this question. Moving to the next question immediately.",
            },
        });

        saveCurrentAnswer("Time Expired / No Answer");

        const next = questionIndexRef.current + 1;
        if (next < questions.length) {
            // 2 second delay then advance
            setTimeout(() => {
                setShowTimeExpired(false);
                advanceQuestionState(next);
            }, 2000);
        } else {
            // Last question → end interview after delay
            setTimeout(() => {
                setShowTimeExpired(false);
                handleInterviewEnd();
            }, 2000);
        }
    };

    const handleSkip = () => {
        saveCurrentAnswer("Skipped / I don't know");

        vapiRef.current?.send({
            type: "add-message",
            message: {
                role: "system",
                content: "User skipped. Ask the next question immediately.",
            },
        });

        const next = questionIndexRef.current + 1;
        if (next < questions.length) {
            advanceQuestionState(next);
        } else {
            handleInterviewEnd();
        }
    };

    const advanceQuestionState = (index: number) => {
        if (index === questionIndexRef.current) return;

        if (questionIndexRef.current < index) {
            saveCurrentAnswer(currentAnswerTranscript || "No answer detected");
        }

        setCurrentQuestionIndex(index);
        setTimeLeft(QUESTION_TIME_SECONDS);
        setTimerActive(false);
        setLiveAiText("");
        setCurrentAnswerTranscript("");
    };

    const saveCurrentAnswer = (answerText: string) => {
        const idx = questionIndexRef.current;
        setUserAnswers(prev => {
            const existing = prev.find(a => a.questionIndex === idx);
            if (existing) return prev;

            return [
                ...prev,
                {
                    questionIndex: idx,
                    question: questions[idx]?.question || "",
                    userAnswer: answerText,
                    createdAt: Date.now(),
                }
            ];
        });
    };

    const handleInterviewEnd = async () => {
        if (callEndedRef.current || isEnding) return;
        callEndedRef.current = true;
        setIsEnding(true);
        setTimerActive(false);

        saveCurrentAnswer(currentAnswerTranscript || "Interview Ended");

        try { vapiRef.current?.stop(); } catch { }

        // Save to Convex
        try {
            await updateFeedback({
                interviewId: interviewId as Id<"Interviews">,
                answers: JSON.stringify(userAnswers),
                feedback: JSON.stringify([]),
                status: "completed",
            });
            router.push(`/dashboard`);
        } catch (err) {
            console.error("Failed to save interview:", err);
            router.push(`/dashboard`);
        }
    };

    /* ─── UI Helpers ─── */
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const displayedQuestion = questions[currentQuestionIndex]?.question || "Connecting to Interviewer...";

    if (!interview) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
                <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-[#0a0e17] text-white overflow-hidden font-sans">
            {/* ── Header ── */}
            <header className="shrink-0 border-b border-white/5 bg-[#0a0e17]/90 backdrop-blur-lg px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <span className="font-bold text-white text-lg">H</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight">HoloHire Interview</span>
                        <div className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 ml-2">
                            Question {currentQuestionIndex + 1} of {questions.length}
                        </div>
                    </div>

                    {/* Timer & End Controls */}
                    <div className="flex items-center gap-6">
                        {/* ── Minimal Text Timer (replaces blue circle) ── */}
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-0.5">Time Remaining</span>
                            <span className={`text-lg font-mono font-semibold tracking-wider ${timeLeft <= 10 ? "text-red-400" : "text-gray-300"}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        {/* Eye Gaze Status */}
                        {gazeReady && (
                            <>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                                    title="Eye gaze tracking may be less accurate with glasses, low lighting, dark irises, or extreme camera angles."
                                >
                                    <div className={`size-2 rounded-full ${isLookingAtScreen ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                                    <span className="text-xs font-medium text-gray-400">
                                        {isLookingAtScreen ? "Looking at screen" : "Looking away"}
                                    </span>
                                    {isLookingAtScreen ? (
                                        <Eye className="size-3.5 text-emerald-500" />
                                    ) : (
                                        <EyeOff className="size-3.5 text-red-400" />
                                    )}
                                </div>
                                <div className="h-8 w-px bg-white/10" />
                            </>
                        )}

                        <button
                            onClick={() => handleInterviewEnd()}
                            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium transition hover:bg-red-500/20 hover:border-red-500/40"
                        >
                            <PhoneOff className="size-4 transition-transform group-hover:rotate-90" />
                            <span>End Session</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="flex-1 p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                    {/* AI Video Area */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f1629] shadow-2xl shadow-black/50">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10" />

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-6">
                            <div className="relative">
                                {aiIsSpeaking && (
                                    <>
                                        <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[ping_2s_linear_infinite]" />
                                        <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-[ping_1.5s_linear_infinite_0.5s]" />
                                    </>
                                )}
                                <div className={`relative z-10 flex size-32 items-center justify-center rounded-full bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-white/10 shadow-xl transition-transform duration-300 ${aiIsSpeaking ? 'scale-105 border-cyan-500/50 shadow-cyan-500/20' : ''}`}>
                                    <Volume2 className={`size-12 ${aiIsSpeaking ? 'text-cyan-400' : 'text-gray-500'}`} />
                                </div>
                            </div>

                            <div className="text-center space-y-1">
                                <h3 className="text-2xl font-bold text-white tracking-tight">AI Interviewer</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <div className={`size-2 rounded-full ${aiIsSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                    <span className="text-sm font-medium text-gray-400">
                                        {aiIsSpeaking ? "Speaking..." : "Listening"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Video Area — single camera only */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/50 group">
                        {stream ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="size-full object-cover scale-x-[-1]"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center">
                                <Loader2 className="size-8 animate-spin text-gray-600" />
                            </div>
                        )}

                        {/* Hidden video for gaze processing — not rendered visually */}
                        <video
                            ref={gazeVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }}
                        />

                        {/* Status Overlay */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs font-medium text-white">
                                <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                                REC
                            </div>
                        </div>

                        {/* Gaze indicator overlay on camera */}
                        {gazeReady && (
                            <div className="absolute top-4 left-4 z-10">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-bold uppercase tracking-wider border transition-colors duration-300 ${isLookingAtScreen
                                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                    : "bg-red-500/15 border-red-500/30 text-red-400"
                                    }`}>
                                    <div className={`size-1.5 rounded-full ${isLookingAtScreen ? "bg-emerald-400" : "bg-red-400"}`} />
                                    {isLookingAtScreen ? "Focused" : "Distracted"}
                                </div>
                            </div>
                        )}

                        {/* Mic Indicator */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                            <div className={`flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md border transition-all duration-300 ${showTimeExpired
                                ? 'bg-red-500/20 border-red-500/40 text-red-400 opacity-50 pointer-events-none'
                                : userIsSpeaking
                                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                    : 'bg-black/40 border-white/10 text-gray-400'
                                }`}>
                                <Mic className={`size-5 ${userIsSpeaking && !showTimeExpired ? 'animate-bounce' : ''}`} />
                                <span className="text-sm font-semibold">
                                    {showTimeExpired ? "Input Disabled" : userIsSpeaking ? "Speaking..." : "Mic Active"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer: Question Card — synced to centralized questionIndex */}
                <div className="w-full shrink-0 relative">
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 lg:p-8 backdrop-blur-sm transition-all hover:bg-white/[0.05]">
                        <div className="flex items-start gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-lg">
                                Q{currentQuestionIndex + 1}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Current Question</h4>
                                    {liveAiText && <span className="text-xs text-cyan-400 animate-pulse">Live Transcript</span>}
                                </div>
                                <p className="text-xl lg:text-2xl font-medium leading-relaxed text-white">
                                    {displayedQuestion}
                                </p>
                            </div>
                        </div>

                        {/* ── TIME EXPIRED OVERLAY ── */}
                        {showTimeExpired && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-red-500/15 border border-red-500/30">
                                    <Clock className="size-6 text-red-400" />
                                    <div>
                                        <p className="text-lg font-bold text-red-400">Time Expired</p>
                                        <p className="text-sm text-gray-400">Moving to next question...</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
