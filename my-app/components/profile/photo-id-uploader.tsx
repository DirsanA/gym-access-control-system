"use client";

import { useRef, useState } from "react";
import { Camera, Check, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck, Upload, User, X } from "lucide-react";

interface PhotoIdUploaderProps {
  currentPhotoUrl?: string | null;
  memberName: string;
  onPhotoSaved: (newPhotoUrl: string) => void;
  requiredForCheckout?: boolean;
}

export function PhotoIdUploader({
  currentPhotoUrl,
  memberName,
  onPhotoSaved,
  requiredForCheckout = false,
}: PhotoIdUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress image on client canvas
  function compressImage(fileOrBlob: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const SIZE = 400; // 400x400 square for crystal clear portrait
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas context failed"));

          // Center crop to square
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, SIZE, SIZE);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    });
  }

  // Start webcam
  async function startCamera() {
    setCameraError("");
    setIsCameraActive(true);
    setPreviewDataUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Camera unavailable or permission denied. Please upload a photo from your files instead.");
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }

  // Snap selfie from video
  function captureSelfie() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    const SIZE = 400;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // Flip horizontally for selfie mirror effect
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, SIZE, SIZE);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreviewDataUrl(dataUrl);
    stopCamera();
  }

  // Handle file picker
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      stopCamera();
      const compressed = await compressImage(file);
      setPreviewDataUrl(compressed);
    } catch {
      alert("Failed to process photo. Please choose a different JPEG/PNG image.");
    }
  }

  // Save photo to API via Cloudinary
  async function handleSavePhoto() {
    if (!previewDataUrl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: previewDataUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const savedUrl = data.user?.photoUrl || previewDataUrl;
        setPhotoUrl(savedUrl);
        onPhotoSaved(savedUrl);
        setModalOpen(false);
        stopCamera();
        setPreviewDataUrl(null);
      } else {
        alert(data.message || "Failed to save member photo.");
      }
    } catch {
      alert("Network error saving photo.");
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    stopCamera();
    setPreviewDataUrl(null);
    setModalOpen(false);
  }

  return (
    <>
      <div className="p-6 rounded-3xl border border-white/10 bg-[#0d0d10] relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar display with verification ring */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 flex items-center justify-center shadow-xl">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={memberName} className="w-full h-full object-cover" />
              ) : (
                <User size={42} className="text-gray-500" />
              )}
            </div>

            {photoUrl ? (
              <div
                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-black shadow-lg"
                title="Verified Photo ID"
              >
                <Check size={14} strokeWidth={3} />
              </div>
            ) : (
              <div
                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-amber-500 text-black shadow-lg animate-bounce"
                title="Photo ID Required"
              >
                <ShieldAlert size={14} strokeWidth={2.5} />
              </div>
            )}
          </div>

          {/* Details & Action */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Member Photo Identification</h3>
              {photoUrl ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                  <ShieldCheck size={13} />
                  <span>PHOTO VERIFIED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
                  <ShieldAlert size={13} />
                  <span>ACTION REQUIRED</span>
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
              {photoUrl
                ? "Your face photo is stored on your digital entrance pass. When you scan at turnstiles or front desk scanners, attendants visually confirm your identity."
                : "Required for gym access & checkout! Upload a clear portrait so front desk attendants and turnstile cameras can authenticate you upon entry."}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(true);
                  setPreviewDataUrl(null);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  photoUrl
                    ? "bg-white/10 hover:bg-white/15 border border-white/20 text-white"
                    : "bg-[#ff331e] hover:bg-[#ff4733] text-white shadow-[0_4px_20px_rgba(255,51,30,0.4)]"
                }`}
              >
                <Camera size={14} />
                <span>{photoUrl ? "Update Photo ID" : "Upload / Snap Photo Now"}</span>
              </button>

              {photoUrl && (
                <span className="text-xs text-gray-500 font-mono">Pass Active &bull; Ready for Scanner</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: Upload or Snap Camera Photo */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md my-auto p-5 sm:p-7 rounded-3xl border border-white/15 bg-[#121216] shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-gray-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff331e]/15 border border-[#ff331e]/30 text-[#ff4733] text-xs font-bold uppercase mb-2">
                <Camera size={13} />
                <span>ID Photo Authentication</span>
              </div>
              <h3 className="text-xl font-bold text-white">Add Your Member Face Photo</h3>
              <p className="text-xs text-gray-400 mt-1">
                Please provide a clear portrait photo showing your face. Cashiers and optical turnstiles use this to verify membership.
              </p>
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                {cameraError}
              </div>
            )}

            {/* PREVIEW / CAMERA VIEWPORT */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-3xl overflow-hidden border-2 border-white/20 bg-black flex items-center justify-center shadow-inner">
              {previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDataUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : isCameraActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Current photo" className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="text-center p-4 text-gray-500 space-y-2">
                  <User size={48} className="mx-auto" />
                  <p className="text-xs">No photo selected</p>
                </div>
              )}

              {/* Viewport alignment guide ring */}
              <div className="absolute inset-4 rounded-full border border-dashed border-white/30 pointer-events-none" />
            </div>

            {/* ACTION CONTROLS */}
            <div className="space-y-3">
              {isCameraActive ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="flex-1 py-3 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    <span>Snap Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : previewDataUrl ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSavePhoto}
                    disabled={saving}
                    className="w-full py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>{saving ? "Uploading to Cloudinary & Saving..." : "Confirm & Save Photo"}</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Camera size={14} />
                      <span>Retake with Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Upload size={14} />
                      <span>Choose Different File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#ff331e]/15 text-[#ff4733] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera size={20} />
                    </div>
                    <span>Take Selfie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={20} />
                    </div>
                    <span>Upload From Device</span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Cloudinary CDN Secured &bull; Authenticated for Turnstiles &amp; Cashier Matching</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
