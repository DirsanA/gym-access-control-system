"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Keyboard,
  MapPin,
  QrCode,
  RefreshCw,
  ScanLine,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserCheck,
  UserX,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { recordCheckIn, verifyMember } from "@/lib/scanner-api";
import type { AccessResponse, ScannerMember, ScannerState } from "@/types/scanner";

const RESET_DELAY_MS = 4_500;
const DUPLICATE_COOLDOWN_MS = 3_000;
const memberIdPattern = /^GYM-\d{6,}$/;
const FRAME_INTERVAL_MS = 200;

type Detector = { detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> };
type DetectorWindow = Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => Detector };

function formatDateTime(value: Date): { date: string; time: string } {
  return {
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Africa/Nairobi",
    }).format(value),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Africa/Nairobi",
    }).format(value),
  };
}

function formatMembershipDate(value: string): string {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function playTone(kind: "success" | "expired" | "error"): void {
  try {
    if (kind === "success") {
      const audio = new Audio("/soundCard.mp3");
      audio.volume = 1;
      void audio.play();
      return;
    }
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = kind === "expired" ? 280 : 180;
    gain.gain.setValueAtTime(0.3, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.28);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Sound enhancement fallback
  }
}

function decodeFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || !video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, 1080 / video.videoWidth);
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  context.drawImage(video, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

export function ScannerTerminal() {
  const [scannerState, setScannerState] = useState<ScannerState>("READY");
  const [scanInput, setScanInput] = useState("");
  const [result, setResult] = useState<AccessResponse | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraMessage, setCameraMessage] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [resetCountdown, setResetCountdown] = useState(RESET_DELAY_MS / 1000);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraTimerRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ memberId: string; at: number } | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const scannerStateRef = useRef(scannerState);
  scannerStateRef.current = scannerState;
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const scanContinuouslyRef = useRef<() => void>(() => {});

  const focusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const setFinalState = useCallback(
    (response: AccessResponse) => {
      setResult(response);
      if (response.status === "ACTIVE") {
        setScannerState("ACCESS_GRANTED");
        if (soundEnabled) playTone("success");
      } else if (response.status === "EXPIRED") {
        setScannerState("MEMBERSHIP_EXPIRED");
        if (soundEnabled) playTone("expired");
      } else if (response.status === "NOT_FOUND") {
        setScannerState("MEMBER_NOT_FOUND");
        if (soundEnabled) playTone("error");
      } else {
        setScannerState("ERROR");
        if (soundEnabled) playTone("error");
      }
    },
    [soundEnabled]
  );

  const submitScan = useCallback(
    async (rawToken: string) => {
      if (scannerStateRef.current !== "READY" && scannerStateRef.current !== "SCANNING") return;
      const token = rawToken.trim();
      if (!token) return;

      const lastScan = lastScanRef.current;
      if (lastScan && lastScan.memberId === token && Date.now() - lastScan.at < DUPLICATE_COOLDOWN_MS) {
        return;
      }

      lastScanRef.current = { memberId: token, at: Date.now() };
      setScanInput(token);
      setScannerState("CHECKING");

      try {
        const recorded = await recordCheckIn(token);
        setFinalState(recorded);
      } catch {
        setFinalState({
          success: false,
          status: "ERROR",
          message: "The access verification system is temporarily unavailable. Please alert front desk staff.",
        });
      }
    },
    [setFinalState]
  );

  const stopCamera = useCallback(() => {
    if (cameraTimerRef.current) window.clearTimeout(cameraTimerRef.current);
    cameraTimerRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current = null;
    setCameraOn(false);
  }, []);

  const scanContinuously = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !cameraStreamRef.current) return;
    try {
      let rawCode: string | null = null;
      if (detectorRef.current) {
        const codes = await detectorRef.current.detect(video);
        rawCode = codes[0]?.rawValue?.trim() ?? null;
      } else if (canvas) {
        rawCode = decodeFrame(video, canvas)?.trim() ?? null;
      }
      if (rawCode) {
        setScanInput(rawCode);
        setCameraMessage(`Scanned ${rawCode.slice(0, 15)}`);
        void submitScan(rawCode);
      }
    } catch {
      // transient decoding error
    }
    cameraTimerRef.current = window.setTimeout(scanContinuously, FRAME_INTERVAL_MS);
  }, [submitScan]);

  scanContinuouslyRef.current = scanContinuously;

  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    const stream = pendingStreamRef.current ?? cameraStreamRef.current;
    if (!video || !stream) return;
    pendingStreamRef.current = null;
    video.srcObject = stream;
    video
      .play()
      .then(() => {
        const DetectorClass = (window as DetectorWindow).BarcodeDetector;
        detectorRef.current = DetectorClass
          ? new DetectorClass({ formats: ["qr_code", "code_128", "code_39"] })
          : null;
        setCameraMessage("Live optical lens active &bull; Align pass QR code");
        scanContinuouslyRef.current();
      })
      .catch(() => {
        setCameraMessage("Camera started but could not initialize video feed.");
      });
  }, [cameraOn]);

  const startCamera = useCallback(async (): Promise<void> => {
    setCameraMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("Camera scanning is not supported in this browser. Enter member code manually.");
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      cameraStreamRef.current = stream;
      pendingStreamRef.current = stream;
      setCameraOn(true);
    } catch {
      stopCamera();
      setCameraMessage("Camera access was not granted. Please enter member ID manually.");
    }
  }, [stopCamera]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    const setting = window.localStorage.getItem("gym-scanner-sound");
    setSoundEnabled(setting !== "off");
    return () => {
      window.clearInterval(interval);
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (scannerState === "READY") focusInput();
  }, [focusInput, scannerState]);

  // Handle countdown and auto-reset after scan completion
  useEffect(() => {
    const completeStates: ScannerState[] = ["ACCESS_GRANTED", "MEMBERSHIP_EXPIRED", "MEMBER_NOT_FOUND", "ERROR"];
    if (!completeStates.includes(scannerState)) return;

    setResetCountdown(RESET_DELAY_MS / 1000);
    const stepInterval = 100;
    const startTime = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (RESET_DELAY_MS - elapsed) / 1000);
      setResetCountdown(Number(remaining.toFixed(1)));
    }, stepInterval);

    const timeout = window.setTimeout(() => {
      setResult(null);
      setScanInput("");
      setScannerState("READY");
    }, RESET_DELAY_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [scannerState]);

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scanInput.trim()) return;
    void submitScan(scanInput);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") return;
    if (scannerState === "READY") setScannerState("SCANNING");
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.localStorage.setItem("gym-scanner-sound", next ? "on" : "off");
  }

  function resetToReady() {
    setResult(null);
    setScanInput("");
    setScannerState("READY");
    focusInput();
  }

  const clock = formatDateTime(now);
  const member = result?.member;
  const isResult = ["ACCESS_GRANTED", "MEMBERSHIP_EXPIRED", "MEMBER_NOT_FOUND", "ERROR"].includes(scannerState);

  return (
    <main
      className="min-h-screen bg-[#050608] pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 px-3 sm:px-4 flex flex-col items-center relative overflow-x-hidden select-none"
      onClick={focusInput}
    >
      {/* Dynamic ambient background glow that shifts with entrance status */}
      <div
        className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[340px] sm:w-[540px] md:w-[680px] h-[340px] sm:h-[540px] rounded-full blur-[110px] pointer-events-none transition-colors duration-700 ${
          scannerState === "ACCESS_GRANTED"
            ? "bg-emerald-500/20"
            : scannerState === "MEMBERSHIP_EXPIRED"
            ? "bg-amber-500/20"
            : scannerState === "MEMBER_NOT_FOUND" || scannerState === "ERROR"
            ? "bg-red-500/20"
            : "bg-[#ff331e]/15"
        }`}
      />

      <div className="w-full max-w-md sm:max-w-lg relative z-10 space-y-4 my-auto">
        {/* MAIN TERMINAL CHASSIS */}
        <div
          className={`rounded-3xl border transition-all duration-300 bg-[#0d0f14]/90 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden ${
            scannerState === "ACCESS_GRANTED"
              ? "border-emerald-500/50 shadow-emerald-500/10"
              : scannerState === "MEMBERSHIP_EXPIRED"
              ? "border-amber-500/50 shadow-amber-500/10"
              : scannerState === "MEMBER_NOT_FOUND" || scannerState === "ERROR"
              ? "border-red-500/50 shadow-red-500/10"
              : "border-white/10"
          }`}
        >
          {/* Terminal Hardware Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff331e] to-[#c2f83a] flex items-center justify-center text-black font-black shadow-lg shadow-[#ff331e]/20">
                <Dumbbell size={20} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-[#c2f83a] tracking-widest uppercase">
                    ELITE FITNESS CLUB
                  </span>
                  <span className="text-gray-500 text-[10px]">&bull;</span>
                  <span className="text-[10px] font-mono font-semibold text-gray-400">GATE 01</span>
                </div>
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Turnstile Entrance Terminal
                </h1>
              </div>
            </div>

            {/* Hardware Controls: Sound Toggle + Online Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSound();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all ${
                  soundEnabled
                    ? "bg-white/10 text-white border-white/20 hover:bg-white/15"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                }`}
                title="Toggle Audio Feedback"
                aria-label="Toggle Audio Feedback"
              >
                {soundEnabled ? <Volume2 size={12} className="text-[#c2f83a]" /> : <VolumeX size={12} />}
                <span className="hidden sm:inline">{soundEnabled ? "Audio ON" : "Muted"}</span>
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>
          </div>

          {/* VIEWPORT BODY */}
          <div className="p-4 sm:p-6">
            {/* STATE 1: RESULT SCREEN (Active, Expired, Error, Not Found) */}
            {isResult ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1.1 ACCESS GRANTED */}
                {scannerState === "ACCESS_GRANTED" && member && (
                  <div className="space-y-4 text-center">
                    {/* Status Pill */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <Check size={16} strokeWidth={3} />
                      <span>ACCESS GRANTED &bull; TURNSTILE UNLOCKED</span>
                    </div>

                    {/* Member Identity Hero */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-500/10 via-white/[0.03] to-transparent border border-emerald-500/25 flex flex-col items-center">
                      <div className="relative mb-3">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-emerald-400/60 shadow-xl shadow-emerald-500/20 bg-black flex items-center justify-center">
                          {member.profileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.profileImage}
                              alt={member.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900 to-black text-2xl font-black text-emerald-300">
                              {initials(member.fullName)}
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                        {member.fullName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2.5 py-0.5 rounded-md bg-white/10 font-mono text-xs font-bold text-[#c2f83a]">
                          {member.memberId}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                          {member.membershipPlan}
                        </span>
                      </div>
                    </div>

                    {/* Check-In Audit Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-gray-400 block">EXPIRES</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {formatMembershipDate(member.membershipEndDate)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-gray-400 block">CHECK-IN</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatDateTime(new Date()).time}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-gray-400 block">TERMINAL</span>
                        <span className="text-xs font-mono font-bold text-white">GATE-01</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-gray-400 block">STATUS</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">ACTIVE</span>
                      </div>
                    </div>

                    {/* Cashier Photo Match Confirmation */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-left text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={15} />
                        </div>
                        <span className="text-gray-300 text-[11px] leading-tight">
                          {member.profileImage
                            ? "Face photo verified &bull; Entrance pass valid."
                            : "Pass valid &bull; Advise member to upload photo ID on profile."}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase shrink-0">
                        PASS VERIFIED
                      </span>
                    </div>
                  </div>
                )}

                {/* 1.2 MEMBERSHIP EXPIRED */}
                {scannerState === "MEMBERSHIP_EXPIRED" && member && (
                  <div className="space-y-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-xs tracking-wider">
                      <TriangleAlert size={16} />
                      <span>ACCESS DENIED &bull; MEMBERSHIP EXPIRED</span>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-white/[0.03] to-transparent border border-amber-500/25 flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-xl shadow-amber-500/20 bg-black flex items-center justify-center mb-3">
                        {member.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.profileImage}
                            alt={member.fullName}
                            className="w-full h-full object-cover grayscale"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900 to-black text-2xl font-black text-amber-300">
                            {initials(member.fullName)}
                          </div>
                        )}
                      </div>

                      <h2 className="text-xl font-extrabold text-white">{member.fullName}</h2>
                      <p className="text-xs font-mono text-amber-400 font-bold mt-1">
                        {member.memberId} &bull; {member.membershipPlan}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Expired on <span className="font-mono text-amber-300">{formatMembershipDate(member.membershipEndDate)}</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-left flex items-center gap-2.5">
                      <TriangleAlert size={16} className="shrink-0" />
                      <span>Please renew this membership at the front desk or via the member portal.</span>
                    </div>
                  </div>
                )}

                {/* 1.3 MEMBER NOT FOUND / ERROR */}
                {(scannerState === "MEMBER_NOT_FOUND" || scannerState === "ERROR") && (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                      <X size={28} strokeWidth={2.5} />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-xs font-mono">
                      <span>INVALID QR CODE</span>
                    </div>
                    <h2 className="text-lg font-bold text-white">Member Not Recognized</h2>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                      {result?.message || "This pass code does not match any registered gym customer."}
                    </p>
                    {scanInput && (
                      <div className="font-mono text-xs text-gray-400 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 max-w-xs mx-auto truncate">
                        Scanned: {scanInput}
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-reset Progress Bar */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin text-gray-500" />
                    <span className="text-[11px]">
                      Re-arming scanner in <strong>{resetCountdown}s</strong>...
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={resetToReady}
                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold transition-all"
                  >
                    Scan Next Pass
                  </button>
                </div>
              </div>
            ) : cameraOn ? (
              /* STATE 2: LIVE CAMERA OPTICAL SCANNER */
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    aria-label="Live camera viewfinder"
                  />
                  <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

                  {/* Optical Targeting Reticle & Brackets */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                    <div className="relative w-48 sm:w-56 h-48 sm:h-56">
                      {/* 4 Corner Target Brackets */}
                      <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#c2f83a] rounded-tl-lg" />
                      <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#c2f83a] rounded-tr-lg" />
                      <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#c2f83a] rounded-bl-lg" />
                      <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#c2f83a] rounded-br-lg" />

                      {/* Animated Sweeping Laser Scanline */}
                      <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-[#c2f83a] to-transparent shadow-[0_0_15px_#c2f83a] animate-bounce duration-1000" />
                    </div>
                  </div>

                  {/* Floating Viewfinder Status Banner */}
                  <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[#c2f83a] font-mono text-[10px] font-bold tracking-wider uppercase">
                      {scannerState === "CHECKING" ? "VERIFYING PASS..." : "ALIGN MEMBER QR CODE"}
                    </span>
                  </div>

                  {/* Bottom Controls inside Video Frame */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all"
                    >
                      <Keyboard size={13} />
                      <span>Manual Entry</span>
                    </button>

                    {cameraMessage && (
                      <span className="px-2.5 py-1 rounded-md bg-black/80 text-[10px] font-mono text-gray-300 max-w-[200px] truncate backdrop-blur-md">
                        {cameraMessage}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-center text-[11px] text-gray-400">
                  Position smartphone screen or printed badge directly in front of camera
                </p>
              </div>
            ) : (
              /* STATE 3: READY / STANDBY MODE (Camera Launch + Manual ID Input) */
              <div className="space-y-5 text-center py-2 animate-in fade-in duration-200">
                {/* Holographic Scanner Aperture */}
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-[#c2f83a]/30 animate-ping opacity-25" />
                  <div className="absolute inset-2 rounded-full border border-dashed border-[#c2f83a]/40 animate-spin duration-1000" />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1b2621] to-[#0c1310] border border-[#c2f83a]/40 flex items-center justify-center text-[#c2f83a] shadow-[0_0_25px_rgba(194,248,58,0.2)]">
                    <QrCode size={30} />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Optical Gate Check-In
                  </h2>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Scan entrance pass QR code, or enter Member ID or Phone Number (09...) below for instant admission.
                  </p>
                </div>

                {/* Main Launch Camera Button */}
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  disabled={scannerState === "CHECKING"}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#c2f83a] to-[#aee628] hover:from-[#d2ff4a] hover:to-[#c2f83a] text-[#081310] font-black text-sm tracking-wide shadow-[0_8px_25px_rgba(194,248,58,0.3)] transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
                >
                  <Camera size={18} strokeWidth={2.5} />
                  <span>START CAMERA SCANNER</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#0d0f14] px-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest absolute">
                    OR MANUAL ENTRY
                  </span>
                </div>

                {/* Manual Code Input Form */}
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/15 focus-within:border-[#c2f83a] transition-all">
                    <Keyboard size={16} className="text-gray-400 ml-2.5 shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      placeholder="Scan QR or enter Member ID / Phone (09...)"
                      autoComplete="off"
                      spellCheck="false"
                      disabled={scannerState === "CHECKING"}
                      className="w-full bg-transparent border-0 outline-none px-2 py-2 text-xs sm:text-sm text-white placeholder-gray-500 font-mono font-bold"
                    />
                    <button
                      type="submit"
                      disabled={!scanInput.trim() || scannerState === "CHECKING"}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      {scannerState === "CHECKING" ? (
                        <RefreshCw size={14} className="animate-spin text-[#c2f83a]" />
                      ) : (
                        "VERIFY"
                      )}
                    </button>
                  </div>

                  {cameraMessage && (
                    <p className="text-[11px] text-amber-400 text-center">{cameraMessage}</p>
                  )}
                </form>

                {/* Quick Test Demo Codes */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                  <span className="text-[10px] font-mono text-gray-500 uppercase w-full">TEST PRESETS:</span>
                  <button
                    type="button"
                    onClick={() => void submitScan("GYM-000123")}
                    className="px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 font-mono text-[11px] font-bold transition-all"
                  >
                    GYM-000123 &bull; Active
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitScan("GYM-000124")}
                    className="px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 font-mono text-[11px] font-bold transition-all"
                  >
                    GYM-000124 &bull; Expired
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Footer Info */}
          <div className="px-4 py-3 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 font-mono">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-[#ff331e]" />
              <span>Addis Ababa Hub &bull; Gate 01</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-[#c2f83a]" />
              <strong className="text-white font-bold">{clock.time}</strong>
              <span className="text-gray-500">EAT</span>
            </div>
          </div>
        </div>

        {/* Turnstile Safety Disclaimer & Navigation */}
        <div className="text-center space-y-2 px-4">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Contactless Turnstile System &bull; Single patron entry per optical QR scan &bull; Automated barrier reset
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">
              &larr; Back to Home
            </Link>
            <span className="text-gray-600">&bull;</span>
            <Link href="/admin" className="hover:text-amber-400 text-gray-400 transition-colors flex items-center gap-1">
              <Shield size={12} className="text-amber-400" />
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
