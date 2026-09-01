"use client";

import { Download, Printer, QrCode, Send, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import type { ScannerMember } from "@/types/scanner";

type CardMember = ScannerMember & { phone?: string; createdAt?: string };

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
    void toDataURL(member.memberId, { width: 360, margin: 1, errorCorrectionLevel: "M", color: { dark: "#07100f", light: "#f6fbf7" } }).then(setQrDataUrl);
  }, [member.memberId]);

  const renderCard = useCallback(async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W; canvas.height = CARD_H;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas not supported");

    const gradient = context.createLinearGradient(0, 0, CARD_W, CARD_H);
    gradient.addColorStop(0, "#0a221f"); gradient.addColorStop(0.52, "#123029"); gradient.addColorStop(1, "#0b1714");
    context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const athlete = await loadImage("/athlete-hero.png");
      const sourceRatio = athlete.width / athlete.height;
      const targetH = CARD_H * 1.35;
      const targetW = targetH * sourceRatio;
      context.save();
      context.beginPath();
      context.rect(CARD_W * 0.36, 0, CARD_W * 0.64, CARD_H);
      context.clip();
      context.drawImage(athlete, CARD_W - targetW * 0.62, (CARD_H - targetH) / 2, targetW, targetH);
      context.fillStyle = "rgba(7,15,13,.34)";
      context.fillRect(CARD_W * 0.36, 0, CARD_W * 0.64, CARD_H);
      context.restore();
    } catch { /* hero image is decorative only */ }

    const scrim = context.createLinearGradient(0, 0, CARD_W * 0.62, 0);
    scrim.addColorStop(0, "rgba(10,34,31,.9)"); scrim.addColorStop(1, "rgba(12,29,25,0)");
    context.fillStyle = scrim; context.fillRect(0, 0, CARD_W * 0.62, CARD_H);

    context.fillStyle = "rgba(189,252,66,.11)"; context.beginPath(); context.arc(1120, 120, 380, 0, Math.PI * 2); context.fill();
    context.fillStyle = "rgba(255,255,255,.06)"; context.beginPath(); context.arc(120, 900, 430, 0, Math.PI * 2); context.fill();

    context.fillStyle = "#bdfc42"; context.font = "900 25px Arial"; context.fillText("NEXUS ATHLETIC CLUB", 100, 100);
    context.fillStyle = "#f6fbf7"; context.font = "900 64px Arial"; context.fillText("MEMBERSHIP CARD", 100, 180);
    context.fillStyle = "rgba(246,251,247,.66)"; context.font = "700 22px Arial"; context.fillText("OFFICIAL MEMBER ACCESS", 100, 224);
    context.strokeStyle = "#bdfc42"; context.lineWidth = 3; context.beginPath(); context.moveTo(100, 258); context.lineTo(600, 258); context.stroke();

    context.fillStyle = "#f6fbf7"; context.font = "900 74px Arial"; context.fillText(member.fullName.toUpperCase().slice(0, 24), 100, 430);
    context.fillStyle = "#bdfc42"; context.font = "900 34px Arial"; context.fillText(member.memberId, 100, 490);

    context.fillStyle = "rgba(246,251,247,.74)"; context.font = "700 23px Arial"; context.fillText(member.membershipPlan.toUpperCase(), 100, 572);
    context.fillText(`VALID UNTIL  ${cardDate(member.membershipEndDate).toUpperCase()}`, 100, 622);

    context.fillStyle = "#f6fbf7"; context.fillRect(1115, 215, 360, 440);
    const qrImage = await loadImage(qrDataUrl);
    context.drawImage(qrImage, 1148, 246, 294, 294);
    context.fillStyle = "#07100f"; context.font = "900 22px Arial"; context.textAlign = "center"; context.fillText("SCAN TO VERIFY", 1295, 583); context.font = "700 19px Arial"; context.fillText(member.memberId, 1295, 618); context.textAlign = "start";

    context.fillStyle = "rgba(246,251,247,.6)"; context.font = "700 20px Arial"; context.fillText("NEXUS ATHLETIC CLUB · NAIROBI", 100, 700);

    return canvas;
  }, [member, qrDataUrl]);

  async function downloadCard() {
    if (!qrDataUrl) return;
    setBusy(true);
    try {
      const canvas = await renderCard();
      const link = document.createElement("a"); link.download = `${member.memberId}-membership-card.png`; link.href = canvas.toDataURL("image/png"); link.click();
    } finally { setBusy(false); }
  }

  const cardBlob = useCallback(async (): Promise<Blob> => {
    const canvas = await renderCard();
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Unable to create image"))), "image/png"));
  }, [renderCard]);

  async function shareCard() {
    if (!qrDataUrl) return;
    setBusy(true);
    try {
      const blob = await cardBlob();
      const file = new File([blob], `${member.memberId}-membership-card.png`, { type: "image/png" });
      const data = { files: [file], title: `${member.fullName} — Nexus Athletic Club`, text: `Nexus Athletic Club membership card\n${member.fullName} · ${member.memberId}\nValid until ${cardDate(member.membershipEndDate)}\n\nScan to verify.` };
      if (navigator.canShare && navigator.canShare(data)) {
        await navigator.share(data);
      } else {
        openTelegram();
      }
    } finally { setBusy(false); }
  }

  function openTelegram() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Nexus Athletic Club membership card\n${member.fullName} · ${member.memberId}\nValid until ${cardDate(member.membershipEndDate)}`;
    const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(share, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="member-card-area" aria-label={`${member.fullName} membership card`}>
      <article className="member-card" id="printable-member-card">
        <div className="member-card__glow member-card__glow--top" /><div className="member-card__glow member-card__glow--bottom" />
        <div className="member-card__details"><div className="member-card__brand"><QrCode size={26} aria-hidden="true" /><span>NEXUS ATHLETIC CLUB</span></div><p className="member-card__caption">OFFICIAL MEMBER ACCESS</p><h2>{member.fullName}</h2><p className="member-card__id">{member.memberId}</p><div className="member-card__meta"><span>MEMBERSHIP<br /><strong>{member.membershipPlan}</strong></span><span>VALID UNTIL<br /><strong>{cardDate(member.membershipEndDate)}</strong></span></div><p className="member-card__footer">Present this card at the entrance</p></div>
        <aside className="member-card__qr"><div>{qrDataUrl ? <img src={qrDataUrl} alt={`QR code containing ${member.memberId}`} /> : <span>GENERATING QR…</span>}</div><strong>SCAN TO VERIFY</strong><small>{member.memberId}</small></aside>
      </article>
      <div className="member-card__actions">
        <button type="button" onClick={() => window.print()}><Printer size={16} /> PRINT CARD</button>
        <button type="button" onClick={downloadCard} disabled={!qrDataUrl || busy}><Download size={16} /> DOWNLOAD PNG</button>
        <button type="button" onClick={() => void shareCard()} disabled={!qrDataUrl || busy}><Share2 size={16} /> SHARE CARD</button>
        <button type="button" onClick={openTelegram}><Send size={16} /> TELEGRAM</button>
      </div>
      <p className="member-card__note">The QR code contains <strong>{member.memberId}</strong>. Scanning it opens the entrance check and shows this member’s verification result. Sharing lets a member keep their card on Telegram, WhatsApp or any app.</p>
    </section>
  );
}
