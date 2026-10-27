"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import jsQR from "jsqr";
import { Check, Dumbbell, Keyboard, ScanLine, TriangleAlert, Volume2, VolumeX, X } from "lucide-react";
import { recordCheckIn, verifyMember } from "@/lib/scanner-api";
import type { AccessResponse, ScannerMember, ScannerState } from "@/types/scanner";

const RESET_DELAY_MS = 4_500;
const DUPLICATE_COOLDOWN_MS = 3_000;
const memberIdPattern = /^GYM-\d{6,}$/;
const FRAME_INTERVAL_MS = 250;

type Detector = { detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> };
type DetectorWindow = Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => Detector };

function formatDateTime(value: Date): { date: string; time: string } {
  return {
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
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
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
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

function BrandMark() {
  return <Dumbbell aria-hidden="true" className="brand-mark" strokeWidth={2.2} />;
}

function Avatar({ member }: { member: ScannerMember }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (member.profileImage && !imageFailed) {
    return (
      // A profile image may be served by the API or a future object-storage provider.
      // eslint-disable-next-line @next/next/no-img-element
      <img className="member-avatar" src={member.profileImage} alt={`${member.fullName} profile`} onError={() => setImageFailed(true)} />
    );
  }
  return <div className="member-avatar member-avatar--fallback">{initials(member.fullName)}</div>;
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
    // Sound is an enhancement. A visual result remains the authoritative signal.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraTimerRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ memberId: string; at: number } | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
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
    async (rawMemberId: string) => {
      if (scannerStateRef.current !== "READY" && scannerStateRef.current !== "SCANNING") return;
      const memberId = rawMemberId.trim().toUpperCase();
      if (!memberIdPattern.test(memberId)) {
        setFinalState({ success: false, status: "ERROR", message: "Use a member ID such as GYM-000123." });
        return;
      }

      const lastScan = lastScanRef.current;
      if (lastScan && lastScan.memberId === memberId && Date.now() - lastScan.at < DUPLICATE_COOLDOWN_MS) {
        return;
      }

      lastScanRef.current = { memberId, at: Date.now() };
      setScanInput(memberId);
      setScannerState("CHECKING");

      try {
        // First show the dedicated verification call in the access flow. The
        // recording endpoint performs the same check again before it persists.
        await verifyMember(memberId);
        const recorded = await recordCheckIn(memberId);
        setFinalState(recorded);
      } catch {
        setFinalState({
          success: false,
          status: "ERROR",
          message: "The access system is temporarily unavailable. Please contact staff.",
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
        rawCode = codes[0]?.rawValue?.trim().toUpperCase() ?? null;
      } else if (canvas) {
        rawCode = decodeFrame(video, canvas)?.trim().toUpperCase() ?? null;
      }
      if (rawCode) {
        setScanInput(rawCode);
        setCameraMessage(`Scanned ${rawCode}`);
        void submitScan(rawCode);
      }
    } catch { /* a frame can be unreadable while the camera settles */ }
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
        setCameraMessage(
          detectorRef.current
            ? "Live scanner ready"
            : "Compatibility mode · scanning live"
        );
        scanContinuouslyRef.current();
      })
      .catch(() => {
        setCameraMessage("Camera started but could not play the video feed.");
      });
  }, [cameraOn]);

  const startCamera = useCallback(async (): Promise<void> => {
    setCameraMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("Camera scanning is not supported in this browser. Enter the code below.");
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
      setCameraStarted(true);
    } catch {
      stopCamera();
      setCameraStarted(false);
      setCameraMessage("Camera permission was not granted. You can still enter the member ID manually.");
    }
  }, [stopCamera]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    const setting = window.localStorage.getItem("gym-scanner-sound");
    const animationFrame = window.requestAnimationFrame(() => setSoundEnabled(setting !== "off"));
    return () => {
      window.clearInterval(interval);
      window.cancelAnimationFrame(animationFrame);
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (scannerState === "READY") focusInput();
  }, [focusInput, scannerState]);

  useEffect(() => {
    const completeStates: ScannerState[] = ["ACCESS_GRANTED", "MEMBERSHIP_EXPIRED", "MEMBER_NOT_FOUND", "ERROR"];
    if (!completeStates.includes(scannerState)) return;

    const timeout = window.setTimeout(() => {
      setResult(null);
      setScanInput("");
      setScannerState("READY");
    }, RESET_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [scannerState]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitScan(scanInput);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") return;
    if (scannerState === "READY") setScannerState("SCANNING");
  }

  function toggleSound() {
    const nextSetting = !soundEnabled;
    setSoundEnabled(nextSetting);
    window.localStorage.setItem("gym-scanner-sound", nextSetting ? "on" : "off");
    focusInput();
  }

  const clock = formatDateTime(now);
  const member = result?.member;
  const isResult = ["ACCESS_GRANTED", "MEMBERSHIP_EXPIRED", "MEMBER_NOT_FOUND", "ERROR"].includes(scannerState);

  const resultCard = (
    <>
      {scannerState === "ACCESS_GRANTED" && member && (
        <div className="verify-card verify-card--granted rise-in">
          <div className="verify-card__glow" aria-hidden="true" />
          <div className="verify-card__header">
            <div className="verify-card__status-pill verify-card__status-pill--granted">
              <span className="verify-card__pulse" aria-hidden="true" />
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              ACCESS GRANTED
            </div>
            <span className="verify-card__timestamp">{formatDateTime(new Date()).time}</span>
          </div>

          <div className="verify-card__body">
            <div className="verify-card__identity">
              <Avatar member={member} />
              <div className="verify-card__name-block">
                <h2>{member.fullName}</h2>
                <p className="verify-card__mid">{member.memberId}</p>
              </div>
            </div>

            <div className="verify-card__divider" aria-hidden="true" />

            <div className="verify-card__plan-row">
              <span className="verify-card__plan-badge">{member.membershipPlan}</span>
              <span className="verify-card__active-badge">ACTIVE</span>
            </div>

            <dl className="verify-card__grid">
              <div>
                <dt>MEMBER SINCE</dt>
                <dd>{formatMembershipDate(member.membershipStartDate)}</dd>
              </div>
              <div>
                <dt>VALID UNTIL</dt>
                <dd>{formatMembershipDate(member.membershipEndDate)}</dd>
              </div>
              <div>
                <dt>CHECK-IN</dt>
                <dd>{formatDateTime(new Date()).time}</dd>
              </div>
              <div>
                <dt>LOCATION</dt>
                <dd>Addis Ababa, Ethiopia</dd>
              </div>
            </dl>

            {/* Cashier Photo Match Prompt */}
            <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                member.profileImage ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}>
                {member.profileImage ? <Check size={16} strokeWidth={3} /> : <TriangleAlert size={16} />}
              </div>
              <div className="text-left text-xs">
                <div className="font-bold text-white">
                  {member.profileImage ? "CASHIER IDENTITY CONFIRMATION" : "PHOTO ID NOT ON FILE"}
                </div>
                <div className="text-[11px] text-gray-400 leading-snug">
                  {member.profileImage
                    ? "Confirm the member standing at the entrance matches the photo ID above."
                    : "Please advise member to upload their face photo on their profile."}
                </div>
              </div>
            </div>
          </div>

          <div className="verify-card__footer">
            <Dumbbell size={14} aria-hidden="true" />
            <span>ELITE FITNESS CLUB &middot; ENTRANCE TERMINAL</span>
          </div>
        </div>
      )}

      {scannerState === "MEMBERSHIP_EXPIRED" && member && (
        <div className="verify-card verify-card--expired rise-in">
          <div className="verify-card__glow verify-card__glow--expired" aria-hidden="true" />
          <div className="verify-card__header">
            <div className="verify-card__status-pill verify-card__status-pill--expired">
              <span className="verify-card__pulse verify-card__pulse--expired" aria-hidden="true" />
              <X size={14} strokeWidth={3} aria-hidden="true" />
              ACCESS DENIED
            </div>
          </div>

          <div className="verify-card__body">
            <div className="verify-card__identity">
              <Avatar member={member} />
              <div className="verify-card__name-block">
                <h2>{member.fullName}</h2>
                <p className="verify-card__mid">{member.memberId}</p>
              </div>
            </div>

            <div className="verify-card__divider verify-card__divider--expired" aria-hidden="true" />

            <div className="verify-card__plan-row">
              <span className="verify-card__plan-badge verify-card__plan-badge--expired">{member.membershipPlan}</span>
              <span className="verify-card__expired-badge">EXPIRED</span>
            </div>

            <dl className="verify-card__grid">
              <div>
                <dt>EXPIRED ON</dt>
                <dd>{formatMembershipDate(member.membershipEndDate)}</dd>
              </div>
              <div>
                <dt>STATUS</dt>
                <dd className="verify-card__dd--muted">Please renew</dd>
              </div>
            </dl>
          </div>

          <div className="verify-card__footer verify-card__footer--expired">
            <TriangleAlert size={14} aria-hidden="true" />
            <span>PLEASE RENEW YOUR MEMBERSHIP AT THE FRONT DESK</span>
          </div>
        </div>
      )}

      {scannerState === "MEMBER_NOT_FOUND" && (
        <div className="verify-card verify-card--error rise-in">
          <div className="verify-card__glow verify-card__glow--error" aria-hidden="true" />
          <div className="verify-card__header">
            <div className="verify-card__status-pill verify-card__status-pill--error">
              <TriangleAlert size={14} strokeWidth={2.5} aria-hidden="true" />
              NOT RECOGNIZED
            </div>
          </div>
          <div className="verify-card__body verify-card__body--centered">
            <div className="verify-card__error-icon" aria-hidden="true">
              <TriangleAlert size={48} strokeWidth={1.8} />
            </div>
            <h2>Member Not Found</h2>
            <p className="verify-card__copy">This ID is not registered in the system. Please check the code and try again, or contact staff for assistance.</p>
            {scanInput && <p className="verify-card__scanned-id">Scanned: {scanInput}</p>}
          </div>
          <div className="verify-card__footer verify-card__footer--error">
            <span>ELITE FITNESS CLUB &middot; ENTRANCE TERMINAL</span>
          </div>
        </div>
      )}

      {scannerState === "ERROR" && (
        <div className="verify-card verify-card--error rise-in">
          <div className="verify-card__glow verify-card__glow--error" aria-hidden="true" />
          <div className="verify-card__header">
            <div className="verify-card__status-pill verify-card__status-pill--error">
              <TriangleAlert size={14} strokeWidth={2.5} aria-hidden="true" />
              SYSTEM ERROR
            </div>
          </div>
          <div className="verify-card__body verify-card__body--centered">
            <div className="verify-card__error-icon" aria-hidden="true">
              <TriangleAlert size={48} strokeWidth={1.8} />
            </div>
            <h2>Verification Unavailable</h2>
            <p className="verify-card__copy">{result?.message ?? "The access system is temporarily unavailable."}</p>
            <p className="verify-card__copy verify-card__copy--sub">The terminal will reset automatically.</p>
          </div>
          <div className="verify-card__footer verify-card__footer--error">
            <span>ELITE FITNESS CLUB &middot; ENTRANCE TERMINAL</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <motion.main
      className={`scanner-shell scanner-shell--${scannerState.toLowerCase()}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24 }}
      onClick={focusInput}
    >
      <section className="scanner-panel" aria-label="Gym membership check-in terminal">
        <header className="scanner-header">
          <div className="brand-lockup">
            <BrandMark />
            <div>
              <p className="eyebrow">NEXUS ATHLETIC CLUB</p>
              <h1>MEMBER ACCESS</h1>
            </div>
          </div>
          <button className="sound-control" type="button" onClick={toggleSound} aria-pressed={soundEnabled}>
            <span className={`sound-switch ${soundEnabled ? "is-on" : ""}`} aria-hidden="true"><span /></span>
            {soundEnabled ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
            SOUND {soundEnabled ? "ON" : "OFF"}
          </button>
        </header>

        <div className={`scanner-content ${cameraOn ? "scanner-content--live" : ""}`}>
          {cameraOn ? (
            <div className="scanner-live">
              <video ref={videoRef} className="scanner-live__video" muted playsInline aria-label="Live scanner viewfinder" />
              <canvas ref={canvasRef} className="scanner-live__canvas" aria-hidden="true" />
              <div className="scanner-live__frame" aria-hidden="true"><i /><i /><i /><i /></div>
              <p className="scanner-live__status">{scannerState === "CHECKING" ? "VERIFYING MEMBERSHIP…" : isResult ? "DETECTED" : "LIVE SCANNING"}</p>
              <button className="scanner-live__manual" type="button" onClick={() => { stopCamera(); setCameraMessage(""); }}><Keyboard size={15} aria-hidden="true" /> MANUAL ENTRY</button>
              {cameraMessage && <p className="scan-readout">{cameraMessage}</p>}
              {isResult && <div className="scanner-live__result">{resultCard}</div>}
            </div>
          ) : (
            <>
              {!isResult && !cameraStarted && (
                <div className="scanner-ready rise-in">
                  <div className="scanner-orbit" aria-hidden="true"><div /><div /><div /></div>
                  <p className="status-label">SCANNER READY</p>
                  <h2>Tap to start camera</h2>
                  <p className="scanner-copy">Grant camera access when prompted to scan member QR codes.</p>
                  <div className="mobile-scan-tools">
                    <button className="camera-button camera-button--primary" type="button" onClick={() => void startCamera()} disabled={scannerState === "CHECKING"}>
                      <ScanLine size={18} aria-hidden="true" /> START CAMERA
                    </button>
                  </div>
                  <p className="scanner-hint">Or enter a member ID manually below</p>
                  <form className="scanner-form" onSubmit={handleSubmit}>
                    <label className="sr-only" htmlFor="member-id">Member ID</label>
                    <input
                      ref={inputRef}
                      id="member-id"
                      value={scanInput}
                      onChange={(event) => setScanInput(event.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      placeholder="GYM-000123"
                      autoComplete="off"
                      spellCheck="false"
                      disabled={scannerState === "CHECKING"}
                    />
                    <button type="submit" disabled={scannerState === "CHECKING"}>CHECK ACCESS</button>
                  </form>
                  <div className="demo-codes" aria-label="Mock membership IDs">
                    <span>TRY MOCK DATA</span>
                    <button type="button" onClick={() => void submitScan("GYM-000123")}>GYM-000123 · ACTIVE</button>
                    <button type="button" onClick={() => void submitScan("GYM-000124")}>GYM-000124 · EXPIRED</button>
                  </div>
                </div>
              )}
              {!isResult && cameraStarted && (
                <div className="scanner-ready rise-in">
                  <div className="scanner-orbit" aria-hidden="true"><div /><div /><div /></div>
                  <p className="status-label">{scannerState === "CHECKING" ? "VERIFYING MEMBERSHIP" : "SCANNER READY"}</p>
                  <h2>{scannerState === "CHECKING" ? "Checking access…" : "Scan your member ID"}</h2>
                  <p className="scanner-copy">
                    {scannerState === "CHECKING"
                      ? "Please wait a moment."
                      : cameraMessage || "Camera could not be started. Enter the code below."}
                  </p>
                  <form className="scanner-form" onSubmit={handleSubmit}>
                    <label className="sr-only" htmlFor="member-id">Member ID</label>
                    <input
                      ref={inputRef}
                      id="member-id"
                      value={scanInput}
                      onChange={(event) => setScanInput(event.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      placeholder="GYM-000123"
                      autoComplete="off"
                      spellCheck="false"
                      disabled={scannerState === "CHECKING"}
                    />
                    <button type="submit" disabled={scannerState === "CHECKING"}>CHECK ACCESS</button>
                  </form>
                  <div className="mobile-scan-tools">
                    <button className="camera-button" type="button" onClick={() => { setCameraStarted(false); void startCamera(); }} disabled={scannerState === "CHECKING"}>
                      <ScanLine size={16} aria-hidden="true" /> RETRY CAMERA
                    </button>
                  </div>
                  <div className="demo-codes" aria-label="Mock membership IDs">
                    <span>TRY MOCK DATA</span>
                    <button type="button" onClick={() => void submitScan("GYM-000123")}>GYM-000123 · ACTIVE</button>
                    <button type="button" onClick={() => void submitScan("GYM-000124")}>GYM-000124 · EXPIRED</button>
                  </div>
                  <p className="scanner-hint">Place the phone on a stand, tilt it toward the member's card</p>
                </div>
              )}
              {isResult && resultCard}
            </>
          )}
        </div>

        <footer className="scanner-footer">
          <span>{clock.date}</span>
          <strong>{clock.time}</strong>
          <span>East Africa Time</span>
        </footer>
      </section>
    </motion.main>
  );
}
