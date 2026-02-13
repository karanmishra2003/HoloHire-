"use client";

import React, { useState, useEffect, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserDetailContext } from "@/context/UserDetailContext";
import {
    Camera,
    Mic,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowLeft,
    Sparkles,
} from "lucide-react";

type PermissionStatus = "pending" | "granted" | "denied";

export default function InterviewStartPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useContext(UserDetailContext);
    const interviewId = params.interviewId as string;

    const interview = useQuery(api.Interviews.GetById, {
        interviewId: interviewId as Id<"Interviews">,
    });

    const [cameraPermission, setCameraPermission] =
        useState<PermissionStatus>("pending");
    const [micPermission, setMicPermission] =
        useState<PermissionStatus>("pending");
    const [checking, setChecking] = useState(false);

    // Check permissions on mount
    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        setChecking(true);
        try {
            // Check camera
            try {
                const camResult = await navigator.permissions.query({
                    name: "camera" as PermissionName,
                });
                setCameraPermission(
                    camResult.state === "granted"
                        ? "granted"
                        : camResult.state === "denied"
                            ? "denied"
                            : "pending"
                );
            } catch {
                // Some browsers don't support permissions.query for camera
                setCameraPermission("pending");
            }

            // Check microphone
            try {
                const micResult = await navigator.permissions.query({
                    name: "microphone" as PermissionName,
                });
                setMicPermission(
                    micResult.state === "granted"
                        ? "granted"
                        : micResult.state === "denied"
                            ? "denied"
                            : "pending"
                );
            } catch {
                setMicPermission("pending");
            }
        } finally {
            setChecking(false);
        }
    };

    const requestPermissions = async () => {
        setChecking(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            // Immediately stop all tracks; we just needed permission
            stream.getTracks().forEach((track) => track.stop());
            setCameraPermission("granted");
            setMicPermission("granted");
        } catch (err) {
            console.error("Permission denied:", err);
            // Check which was denied
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                setCameraPermission("granted");
            } catch {
                setCameraPermission("denied");
            }
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                setMicPermission("granted");
            } catch {
                setMicPermission("denied");
            }
        } finally {
            setChecking(false);
        }
    };

    const allGranted =
        cameraPermission === "granted" && micPermission === "granted";

    const handleStart = () => {
        router.push(`/interview/${interviewId}/start`);
    };

    const PermissionItem = ({
        label,
        icon: Icon,
        status,
    }: {
        label: string;
        icon: React.ElementType;
        status: PermissionStatus;
    }) => (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:bg-white/[0.05]">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10">
                    <Icon className="size-5 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-white">{label}</span>
            </div>
            <div>
                {status === "granted" ? (
                    <CheckCircle2 className="size-5 text-green-400" />
                ) : status === "denied" ? (
                    <XCircle className="size-5 text-red-400" />
                ) : (
                    <div className="size-5 rounded-full border-2 border-white/20" />
                )}
            </div>
        </div>
    );

    if (!interview) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
                <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0f1629]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft className="size-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                            <Sparkles className="size-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">HoloHire</h1>
                            <p className="text-xs text-gray-400">AI Interview Platform</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
                {/* Title section */}
                <div className="text-center">
                    <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-cyan-500/30">
                        <Sparkles className="size-10 text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Ready for your interview?
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">
                        We need access to your camera and microphone so the AI interviewer
                        can see and hear you during the session.
                    </p>
                    {interview.jobDescription && (
                        <div className="mt-4 inline-block rounded-full bg-white/5 px-4 py-1.5 text-xs text-gray-300 ring-1 ring-white/10">
                            {interview.jobDescription.length > 60
                                ? interview.jobDescription.slice(0, 60) + "…"
                                : interview.jobDescription}
                        </div>
                    )}
                </div>

                {/* Permissions checklist */}
                <div className="w-full max-w-md space-y-3">
                    <PermissionItem
                        label="Camera Access"
                        icon={Camera}
                        status={cameraPermission}
                    />
                    <PermissionItem
                        label="Microphone Access"
                        icon={Mic}
                        status={micPermission}
                    />
                </div>

                {/* Buttons */}
                <div className="flex flex-col items-center gap-4">
                    {!allGranted && (
                        <button
                            onClick={requestPermissions}
                            disabled={checking}
                            className="rounded-xl bg-white/10 px-8 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15 disabled:opacity-50"
                        >
                            {checking ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="size-4 animate-spin" />
                                    Checking…
                                </span>
                            ) : (
                                "Grant Permissions"
                            )}
                        </button>
                    )}

                    <button
                        onClick={handleStart}
                        disabled={!allGranted}
                        className="group relative rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Sparkles className="size-4" />
                            Start Interview
                        </span>
                        {allGranted && (
                            <span className="absolute inset-0 animate-pulse rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20" />
                        )}
                    </button>

                    {!allGranted && (
                        <p className="text-xs text-gray-500">
                            Please grant camera and microphone access to proceed
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
