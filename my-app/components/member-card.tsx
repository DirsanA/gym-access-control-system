"use client";

import { Download, Printer, QrCode, Send, Share2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import type { ScannerMember } from "@/types/scanner";

type CardMember = ScannerMember & { phone?: string; createdAt?: string; qrPayload?: string; ticketToken?: string };

const CARD_W = 1600;
const CARD_H = 920;

function cardDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function MemberCard({ member }: { member: CardMember }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const qrValue = member.qrPayload || member.ticketToken || member.memberId;
    void toDataURL(qrValue, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#060b09", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [member.memberId, member.qrPayload, member.ticketToken]);

  const renderCard = useCallback(async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas not supported");

    // Luxury Dark Gradient Background
    const gradient = context.createLinearGradient(0, 0, CARD_W, CARD_H);
    gradient.addColorStop(0, "#081310");
    gradient.addColorStop(0.5, "#0e201b");
    gradient.addColorStop(1, "#070c0b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const athlete = await loadImage("/athlete-hero.png");
      const sourceRatio = athlete.width / athlete.height;
      const targetH = CARD_H * 1.35;
      const targetW = targetH * sourceRatio;
      context.save();
      context.beginPath();
      context.rect(CARD_W * 0.38, 0, CARD_W * 0.62, CARD_H);
      context.clip();
      context.drawImage(athlete, CARD_W - targetW * 0.6, (CARD_H - targetH) / 2, targetW, targetH);
      context.fillStyle = "rgba(7, 13, 11, 0.45)";
      context.fillRect(CARD_W * 0.38, 0, CARD_W * 0.62, CARD_H);
      context.restore();
    } catch {
      /* hero image fallback */
    }

    // Scrim gradient for text contrast
    const scrim = context.createLinearGradient(0, 0, CARD_W * 0.65, 0);
    scrim.addColorStop(0, "rgba(8, 19, 16, 0.95)");
    scrim.addColorStop(0.7, "rgba(8, 19, 16, 0.8)");
    scrim.addColorStop(1, "rgba(8, 19, 16, 0)");
    context.fillStyle = scrim;
    context.fillRect(0, 0, CARD_W * 0.65, CARD_H);

    // Glowing accents
    context.fillStyle = "rgba(194, 248, 58, 0.12)";
    context.beginPath();
    context.arc(1140, 110, 360, 0, Math.PI * 2);
    context.fill();

    // Top branding
    context.fillStyle = "#ff331e";
    context.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    context.fillText("ELITE FITNESS · ADDIS ABABA, ETHIOPIA", 110, 110);

    context.fillStyle = "#ffffff";
    context.font = "900 68px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    context.fillText("ACCESS CARD", 110, 195);

    context.fillStyle = "rgba(244, 247, 245, 0.6)";
    context.font = "700 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    context.fillText("OFFICIAL VERIFIED MEMBER PASS", 110, 240);

    context.strokeStyle = "#c2f83a";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(110, 275);
    context.lineTo(540, 275);
    context.stroke();

    // Member Portrait Photo on Canvas
    let textLeft = 110;
    if (member.profileImage) {
      try {
        const photoImg = await loadImage(member.profileImage);
        const photoSize = 130;
        const photoX = 110;
        const photoY = 360;

        context.save();
        context.beginPath();
        if (context.roundRect) {
          context.roundRect(photoX, photoY, photoSize, photoSize, [20]);
        } else {
          context.rect(photoX, photoY, photoSize, photoSize);
        }
        context.clip();
        context.drawImage(photoImg, photoX, photoY, photoSize, photoSize);
        context.restore();

        // Glowing border around photo
        context.strokeStyle = "#c2f83a";
        context.lineWidth = 4;
        context.beginPath();
        if (context.roundRect) context.roundRect(photoX, photoY, photoSize, photoSize, [20]);
        else context.rect(photoX, photoY, photoSize, photoSize);
        context.stroke();

        textLeft = 265;
      } catch {
        /* fallback to regular layout */
      }
    }

    // Member Name & ID
    context.fillStyle = "#ffffff";
    context.font = "900 64px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    context.fillText(member.fullName.toUpperCase().slice(0, 20), textLeft, 435);

    context.fillStyle = "#c2f83a";
    context.font = "900 34px 'Courier New', monospace";
    context.fillText(member.memberId, textLeft, 490);

    // Plan & Expiry
    context.fillStyle = "rgba(244, 247, 245, 0.75)";
    context.font = "700 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    context.fillText(member.membershipPlan.toUpperCase(), 110, 580);
    context.fillText(`VALID THROUGH  ${cardDate(member.membershipEndDate).toUpperCase()}`, 110, 630);

    // QR container box
    context.fillStyle = "#ffffff";
    context.roundRect ? context.roundRect(1100, 200, 390, 470, [24]) : context.fillRect(1100, 200, 390, 470);
    context.fill();

    const qrImage = await loadImage(qrDataUrl);
    context.drawImage(qrImage, 1135, 235, 320, 320);

    context.fillStyle = "#081310";
    context.font = "900 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    context.textAlign = "center";
    context.fillText("SCAN AT TURNSTILE", 1295, 595);

    context.fillStyle = "#334540";
    context.font = "800 18px 'Courier New', monospace";
    context.fillText(member.memberId, 1295, 630);
    context.textAlign = "start";

    // Bottom note
    context.fillStyle = "rgba(244, 247, 245, 0.5)";
    context.font = "700 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    context.fillText("PRESENT TO OPTICAL SENSOR · POWERED BY ELITE PASS SECURITY", 110, 715);

    return canvas;
  }, [member, qrDataUrl]);

  async function downloadCard() {
    if (!qrDataUrl) return;
    setBusy(true);
    try {
      const canvas = await renderCard();
      const link = document.createElement("a");
      link.download = `${member.memberId}-elite-pass.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setBusy(false);
    }
  }

  const cardBlob = useCallback(async (): Promise<Blob> => {
    const canvas = await renderCard();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Unable to create image"))), "image/png")
    );
  }, [renderCard]);

  async function shareCard() {
    if (!qrDataUrl) return;
    setBusy(true);
    try {
      const blob = await cardBlob();
      const file = new File([blob], `${member.memberId}-pass.png`, { type: "image/png" });
      const data = {
        files: [file],
        title: `${member.fullName} — Elite Fitness Pass`,
        text: `Elite Fitness Club official membership pass\n${member.fullName} · ${member.memberId}\nValid until ${cardDate(member.membershipEndDate)}`,
      };
      if (navigator.canShare && navigator.canShare(data)) {
        await navigator.share(data);
      } else {
        openTelegram();
      }
    } finally {
      setBusy(false);
    }
  }

  function openTelegram() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Elite Fitness Club Membership Pass\nMember: ${member.fullName}\nID: ${member.memberId}\nValid until: ${cardDate(member.membershipEndDate)}`;
    const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(share, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="member-card-area" aria-label={`${member.fullName} membership card`}>
      <article className="member-card" id="printable-member-card">
        <div className="member-card__glow member-card__glow--top" />
        <div className="member-card__glow member-card__glow--bottom" />

        <div className="member-card__details">
          <div className="member-card__brand">
            <span className="member-card__brand-icon">
              <QrCode size={18} aria-hidden="true" />
            </span>
            <span>ELITE FITNESS · ADDIS ABABA, ETHIOPIA</span>
          </div>

          <div className="flex items-center gap-4 my-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#c2f83a] bg-black/60 shadow-xl shrink-0">
              {member.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.profileImage} alt={member.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#c2f83a] bg-white/5 font-mono font-bold text-[10px]">
                  <span>PHOTO</span>
                  <span>ID</span>
                </div>
              )}
            </div>
            <div>
              <p className="member-card__caption">VERIFIED ATHLETE ACCESS PASS</p>
              <h2 title={member.fullName} className="!my-0">{member.fullName}</h2>
              <p className="member-card__id">{member.memberId}</p>
            </div>
          </div>

          <div className="member-card__meta">
            <div>
              <span>PLAN</span>
              <strong>{member.membershipPlan}</strong>
            </div>
            <div>
              <span>VALID THROUGH</span>
              <strong>{cardDate(member.membershipEndDate)}</strong>
            </div>
          </div>

          <p className="member-card__footer">
            <Sparkles size={13} className="inline mr-1 text-[#c2f83a]" />
            Hold QR code before the optical entrance turnstile
          </p>
        </div>

        <aside className="member-card__qr">
          <div className="member-card__qr-box">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR code containing ${member.memberId}`} />
            ) : (
              <span className="text-xs font-semibold text-gray-500">SYNCING QR...</span>
            )}
          </div>
          <strong className="member-card__qr-title">SCAN TO VERIFY</strong>
          <small className="member-card__qr-id">{member.memberId}</small>
        </aside>
      </article>

      <div className="member-card__actions">
        <button type="button" className="card-action-btn card-action-btn--primary" onClick={downloadCard} disabled={!qrDataUrl || busy}>
          <Download size={15} />
          <span>{busy ? "PREPARING..." : "DOWNLOAD PASS"}</span>
        </button>

        <button type="button" className="card-action-btn" onClick={() => window.print()}>
          <Printer size={15} />
          <span>PRINT</span>
        </button>

        <button type="button" className="card-action-btn" onClick={() => void shareCard()} disabled={!qrDataUrl || busy}>
          <Share2 size={15} />
          <span>SHARE PASS</span>
        </button>

        <button type="button" className="card-action-btn" onClick={openTelegram}>
          <Send size={15} />
          <span>TELEGRAM</span>
        </button>
      </div>

      <p className="member-card__note">
        This pass grants direct contactless entry. Scanning it at the member scanner checks your expiration date in real-time.
      </p>
    </section>
  );
}

