"use client";

import { Download, Printer, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import type { ScannerMember } from "@/types/scanner";

type CardMember = ScannerMember & { phone?: string; createdAt?: string };

function cardDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

export function MemberCard({ member }: { member: CardMember }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    void toDataURL(member.memberId, { width: 320, margin: 1, errorCorrectionLevel: "M", color: { dark: "#07100f", light: "#f6fbf7" } }).then(setQrDataUrl);
  }, [member.memberId]);

  function downloadCard() {
    if (!qrDataUrl) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 920;
    const context = canvas.getContext("2d");
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, 1600, 920);
    gradient.addColorStop(0, "#0d2924"); gradient.addColorStop(0.56, "#132e29"); gradient.addColorStop(1, "#bdfc42");
    context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(189,252,66,.13)"; context.beginPath(); context.arc(1060, 100, 380, 0, Math.PI * 2); context.fill();
    context.fillStyle = "rgba(255,255,255,.06)"; context.beginPath(); context.arc(180, 900, 430, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#bdfc42"; context.font = "900 25px Arial"; context.fillText("NEXUS ATHLETIC CLUB", 100, 105);
    context.fillStyle = "#f6fbf7"; context.font = "900 63px Arial"; context.fillText("MEMBERSHIP CARD", 100, 185);
    context.fillStyle = "rgba(246,251,247,.66)"; context.font = "700 22px Arial"; context.fillText("OFFICIAL MEMBER ACCESS", 100, 225);
    context.fillStyle = "#f6fbf7"; context.font = "900 70px Arial"; context.fillText(member.fullName.toUpperCase().slice(0, 27), 100, 415);
    context.fillStyle = "#bdfc42"; context.font = "900 34px Arial"; context.fillText(member.memberId, 100, 475);
    context.fillStyle = "rgba(246,251,247,.72)"; context.font = "700 23px Arial"; context.fillText(member.membershipPlan.toUpperCase(), 100, 570); context.fillText(`VALID UNTIL  ${cardDate(member.membershipEndDate).toUpperCase()}`, 100, 620);
    context.fillStyle = "#f6fbf7"; context.fillRect(1110, 215, 360, 445);
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 1150, 255, 280, 280);
      context.fillStyle = "#07100f"; context.font = "900 20px Arial"; context.textAlign = "center"; context.fillText("SCAN TO VERIFY", 1290, 580); context.font = "700 18px Arial"; context.fillText(member.memberId, 1290, 615); context.textAlign = "start";
      const link = document.createElement("a"); link.download = `${member.memberId}-membership-card.png`; link.href = canvas.toDataURL("image/png"); link.click();
    };
    image.src = qrDataUrl;
  }

  return (
    <section className="member-card-area" aria-label={`${member.fullName} membership card`}>
      <article className="member-card" id="printable-member-card">
        <div className="member-card__glow member-card__glow--top" /><div className="member-card__glow member-card__glow--bottom" />
        <div className="member-card__details"><div className="member-card__brand"><QrCode size={26} aria-hidden="true" /><span>NEXUS ATHLETIC CLUB</span></div><p className="member-card__caption">OFFICIAL MEMBER ACCESS</p><h2>{member.fullName}</h2><p className="member-card__id">{member.memberId}</p><div className="member-card__meta"><span>MEMBERSHIP<br /><strong>{member.membershipPlan}</strong></span><span>VALID UNTIL<br /><strong>{cardDate(member.membershipEndDate)}</strong></span></div><p className="member-card__footer">Present this card at the entrance</p></div>
        <aside className="member-card__qr"><div>{qrDataUrl ? <img src={qrDataUrl} alt={`QR code containing ${member.memberId}`} /> : <span>GENERATING QR…</span>}</div><strong>SCAN TO VERIFY</strong><small>{member.memberId}</small></aside>
      </article>
      <div className="member-card__actions"><button type="button" onClick={() => window.print()}><Printer size={16} /> PRINT CARD</button><button type="button" onClick={downloadCard} disabled={!qrDataUrl}><Download size={16} /> DOWNLOAD PNG</button></div>
      <p className="member-card__note">The QR code contains <strong>{member.memberId}</strong>. Scanning it opens the entrance check and shows this member’s verification result.</p>
    </section>
  );
}
