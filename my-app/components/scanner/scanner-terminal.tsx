"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Dumbbell, TriangleAlert, Volume2, VolumeX, X } from "lucide-react";
import { recordCheckIn, verifyMember } from "@/lib/scanner-api";
import type { AccessResponse, ScannerMember, ScannerState } from "@/types/scanner";

const RESET_DELAY_MS = 4_500;
const DUPLICATE_COOLDOWN_MS = 3_000;
const memberIdPattern = /^GYM-\d{6,}$/;

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

function playFallbackTone(kind: "success" | "expired" | "error"): void {
  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = kind === "success" ? 760 : kind === "expired" ? 280 : 180;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.28);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Sound is an enhancement. A visual result remains the authoritative signal.
  }
}

function playResultSound(kind: "success" | "expired" | "error"): void {
  const audio = new Audio(`/sounds/${kind}.mp3`);
  audio.volume = 0.75;
  audio.addEventListener("error", () => playFallbackTone(kind), { once: true });
  void audio.play().catch(() => playFallbackTone(kind));
}

export function ScannerTerminal() {
  const [scannerState, setScannerState] = useState<ScannerState>("READY");
  const [scanInput, setScanInput] = useState("");
  const [result, setResult] = useState<AccessResponse | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ memberId: string; at: number } | null>(null);

  const focusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    const setting = window.localStorage.getItem("gym-scanner-sound");
    const animationFrame = window.requestAnimationFrame(() => setSoundEnabled(setting !== "off"));
    return () => {
      window.clearInterval(interval);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

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

  const setFinalState = useCallback(
    (response: AccessResponse) => {
      setResult(response);
      if (response.status === "ACTIVE") {
        setScannerState("ACCESS_GRANTED");
        if (soundEnabled) playResultSound("success");
      } else if (response.status === "EXPIRED") {
        setScannerState("MEMBERSHIP_EXPIRED");
        if (soundEnabled) playResultSound("expired");
      } else if (response.status === "NOT_FOUND") {
        setScannerState("MEMBER_NOT_FOUND");
        if (soundEnabled) playResultSound("error");
      } else {
        setScannerState("ERROR");
        if (soundEnabled) playResultSound("error");
      }
    },
    [soundEnabled]
  );

  const submitScan = useCallback(
    async (rawMemberId: string) => {
      if (scannerState !== "READY" && scannerState !== "SCANNING") return;
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
    [scannerState, setFinalState]
  );

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

        <div className="scanner-content">
          {!isResult && (
            <div className="scanner-ready rise-in">
              <div className="scanner-orbit" aria-hidden="true"><div /><div /><div /></div>
              <p className="status-label">{scannerState === "CHECKING" ? "VERIFYING MEMBERSHIP" : "SCANNER READY"}</p>
              <h2>{scannerState === "CHECKING" ? "Checking access…" : "Scan your member ID"}</h2>
              <p className="scanner-copy">
                {scannerState === "CHECKING" ? "Please wait a moment." : "Present your membership card to the scanner."}
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
              <p className="scanner-hint">Scanner active · Manual entry available</p>
            </div>
          )}

          {scannerState === "ACCESS_GRANTED" && member && (
            <div className="access-result access-result--granted rise-in">
              <div className="result-icon" aria-hidden="true"><Check size={43} strokeWidth={2.4} /></div>
              <p className="status-label">ACCESS GRANTED</p>
              <Avatar member={member} />
              <h2>{member.fullName}</h2>
              <p className="member-id">{member.memberId}</p>
              <span className="plan-badge">{member.membershipPlan}</span>
              <p className="result-message">MEMBERSHIP ACTIVE</p>
              <dl className="result-details">
                <div><dt>VALID UNTIL</dt><dd>{formatMembershipDate(member.membershipEndDate)}</dd></div>
                <div><dt>CHECK-IN TIME</dt><dd>{formatDateTime(new Date()).time}</dd></div>
              </dl>
            </div>
          )}

          {scannerState === "MEMBERSHIP_EXPIRED" && member && (
            <div className="access-result access-result--expired rise-in">
              <div className="result-icon" aria-hidden="true"><X size={43} strokeWidth={2.4} /></div>
              <p className="status-label">MEMBERSHIP EXPIRED</p>
              <Avatar member={member} />
              <h2>{member.fullName}</h2>
              <p className="member-id">{member.memberId}</p>
              <dl className="result-details"><div><dt>EXPIRED ON</dt><dd>{formatMembershipDate(member.membershipEndDate)}</dd></div></dl>
              <p className="renew-message">PLEASE RENEW YOUR MEMBERSHIP</p>
              <p className="denied-label">ACCESS DENIED</p>
            </div>
          )}

          {scannerState === "MEMBER_NOT_FOUND" && (
            <div className="access-result access-result--missing rise-in">
              <div className="result-icon" aria-hidden="true"><TriangleAlert size={38} strokeWidth={2.3} /></div>
              <p className="status-label">MEMBER NOT FOUND</p>
              <h2>This ID is not registered.</h2>
              <p className="scanner-copy">Please contact a member of staff for assistance.</p>
            </div>
          )}

          {scannerState === "ERROR" && (
            <div className="access-result access-result--missing rise-in">
              <div className="result-icon" aria-hidden="true"><TriangleAlert size={38} strokeWidth={2.3} /></div>
              <p className="status-label">ACCESS CHECK UNAVAILABLE</p>
              <h2>{result?.message ?? "Please try again."}</h2>
              <p className="scanner-copy">The terminal will reset automatically.</p>
            </div>
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
