"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  SwitchCamera,
  Upload,
  User,
  X,
} from "lucide-react";

interface PhotoIdUploaderProps {
  currentPhotoUrl?: string | null;
  memberName: string;
  onPhotoSaved: (newPhotoUrl: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  requiredForCheckout?: boolean;
}

export function PhotoIdUploader({
  currentPhotoUrl,
  memberName,
  onPhotoSaved,
  isOpen,
  onOpenChange,
  requiredForCheckout = false,
}: PhotoIdUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof isOpen === "boolean";
  const modalOpen = isControlled ? isOpen : internalOpen;

  const setOpen = (open: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  // Active studio tab: "camera" | "upload"
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("upload");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Camera studio options
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [useCountdown, setUseCountdown] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state when parent prop updates
  useEffect(() => {
    if (currentPhotoUrl !== undefined) {
      setPhotoUrl(currentPhotoUrl || null);
    }
  }, [currentPhotoUrl]);

  // Clean up camera stream when modal closes
  useEffect(() => {
    if (!modalOpen) {
      stopCamera();
      setPreviewDataUrl(null);
      setCountdownNum(null);
    }
  }, [modalOpen]);

  // ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && modalOpen && !saving) {
        handleCloseModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, saving]);

  // Client-side image crop to 400x400 square JPEG
  function compressImage(fileOrBlob: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const SIZE = 400;
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas context failed"));

          // Solid dark background to prevent alpha transparency glitch
          ctx.fillStyle = "#0c0d12";
          ctx.fillRect(0, 0, SIZE, SIZE);

          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, SIZE, SIZE);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    });
  }

  // Camera Management
  async function startCamera(mode = facingMode) {
    setCameraError("");
    setPreviewDataUrl(null);
    setIsCameraActive(true);
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
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
      console.warn("Camera start failed:", err);
      setCameraError(
        "Camera permission was denied or camera is unavailable. Please select 'Upload File' instead."
      );
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

  function switchCameraMode() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (isCameraActive) {
      void startCamera(nextMode);
    }
  }

  // Snap selfie with optional 3-second countdown
  function handleSnapClick() {
    if (!videoRef.current) return;
    if (useCountdown) {
      setCountdownNum(3);
      const timer = setInterval(() => {
        setCountdownNum((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            executeCapture();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      executeCapture();
    }
  }

  function executeCapture() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    const SIZE = 400;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const minDim = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    const startX = ((video.videoWidth || 640) - minDim) / 2;
    const startY = ((video.videoHeight || 640) - minDim) / 2;

    // Flip horizontally if front facing camera for natural selfie mirror
    if (facingMode === "user") {
      ctx.translate(SIZE, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, SIZE, SIZE);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setPreviewDataUrl(dataUrl);
    stopCamera();
  }

  // File Handling
  async function processSelectedFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    try {
      stopCamera();
      const compressed = await compressImage(file);
      setPreviewDataUrl(compressed);
    } catch {
      alert("Failed to process the photo. Please try a different image.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processSelectedFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processSelectedFile(file);
  }

  // Save to backend and database
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
        setOpen(false);
        stopCamera();
        setPreviewDataUrl(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profile-photo-updated", { detail: { photoUrl: savedUrl } })
          );
        }
      } else {
        alert(data.message || "Failed to save your photo ID.");
      }
    } catch {
      alert("Network connection error. Please try saving again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    stopCamera();
    setPreviewDataUrl(null);
    setOpen(false);
  }

  return (
    <>
      {/* PROFILE CARD DISPLAY */}
      <div className="p-5 sm:p-7 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d0d12] via-[#090a0d] to-[#060709] relative overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-black/60 border-2 border-white/20 flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={memberName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-500 gap-1">
                  <User size={38} className="text-gray-500" />
                  <span className="text-[10px] font-mono tracking-wider font-semibold">NO PHOTO</span>
                </div>
              )}
            </div>

            {photoUrl ? (
              <div
                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 flex items-center justify-center"
                title="Photo ID Verified"
              >
                <Check size={14} strokeWidth={3} />
              </div>
            ) : (
              <div
                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/30 animate-pulse flex items-center justify-center"
                title="Photo ID Missing"
              >
                <ShieldAlert size={14} strokeWidth={2.5} />
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Member Face Identification
              </h3>
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
                ? "Your face photo is linked to your digital entrance pass and turnstile scanner. Front desk attendants visually verify your face upon gym admission."
                : "Required for gym access! Add your portrait photo so front desk attendants and turnstile cameras authenticate you upon entry."}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  setPreviewDataUrl(null);
                  setActiveTab("upload");
                }}
                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  photoUrl
                    ? "bg-white/10 hover:bg-white/15 border border-white/20 text-white"
                    : "bg-[#ff331e] hover:bg-[#ff4733] text-white shadow-[0_4px_20px_rgba(255,51,30,0.4)]"
                }`}
              >
                <Camera size={14} />
                <span>{photoUrl ? "Update Photo ID" : "Upload / Snap Photo Now"}</span>
              </button>

              {photoUrl && (
                <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Turnstile Scanner Ready</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SMART STUDIO MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md my-auto max-h-[calc(100dvh-2rem)] flex flex-col bg-[#0d0e13] border border-white/15 rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Pinned at Top) */}
            <div className="p-4 sm:p-5 border-b border-white/5 space-y-1 pr-12 shrink-0 relative bg-[#0d0e13]">
              {/* Top Close Button */}
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="absolute top-3.5 right-3.5 text-gray-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors z-20 disabled:opacity-40"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ff331e]/15 border border-[#ff331e]/30 text-[#ff4733] text-[10px] font-bold font-mono tracking-wider uppercase flex items-center gap-1">
                  <Camera size={11} />
                  <span>{requiredForCheckout ? "CHECKOUT REQUIREMENT" : "BIOMETRIC PHOTO ID"}</span>
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {previewDataUrl ? "Confirm Your Member Photo" : "Add Member Face Photo"}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                {previewDataUrl
                  ? "Ensure your face is clearly visible without heavy shadows or obstructions."
                  : "Upload a selfie or portrait photo for turnstile entrance & front desk cashier identification."}
              </p>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Camera error notification if any */}
              {cameraError && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("upload");
                        setCameraError("");
                      }}
                      className="font-bold underline text-amber-300 text-xs"
                    >
                      Switch to File Upload
                    </button>
                  </div>
                </div>
              )}
              {/* If preview is ready to save */}
              {previewDataUrl ? (
                <div className="space-y-4">
                  {/* Viewport Frame */}
                  <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-3xl overflow-hidden border-2 border-[#c2f83a] shadow-[0_0_30px_rgba(194,248,58,0.2)] bg-black flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewDataUrl}
                      alt="Captured Face"
                      className="w-full h-full object-cover"
                    />

                    {/* Biometric overlay ring */}
                    <div className="absolute inset-2 rounded-2xl border border-white/20 pointer-events-none" />
                    <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-center font-mono text-[#c2f83a] font-bold">
                      ✓ READY FOR SCANNER
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSavePhoto}
                      disabled={saving}
                      className="w-full py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Saving & Authenticating Photo...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Confirm & Save Pass Photo</span>
                        </>
                      )}
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewDataUrl(null);
                          if (activeTab === "camera") {
                            void startCamera();
                          }
                        }}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                      >
                        <RotateCcw size={13} />
                        <span>Retake Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewDataUrl(null);
                          setActiveTab("upload");
                          setTimeout(() => fileInputRef.current?.click(), 50);
                        }}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                      >
                        <Upload size={13} />
                        <span>Choose Other</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* NOT IN PREVIEW MODE: SHOW TABS (CAMERA VS UPLOAD) */
                <div className="space-y-4">
                  {/* Segmented Tab Controls */}
                  <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("upload");
                        stopCamera();
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "upload"
                          ? "bg-white/15 text-white shadow-sm"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Upload size={13} />
                      <span>Upload File</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("camera");
                        void startCamera();
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "camera"
                          ? "bg-[#ff331e] text-white shadow-sm shadow-[#ff331e]/30"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Camera size={13} />
                      <span>Take Selfie</span>
                    </button>
                  </div>

                  {/* TAB 1: UPLOAD & DRAG/DROP */}
                  {activeTab === "upload" && (
                    <div className="space-y-3">
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all ${
                          isDragging
                            ? "border-[#c2f83a] bg-[#c2f83a]/10"
                            : "border-white/15 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-3">
                          <Upload size={22} />
                        </div>
                        <p className="text-sm font-bold text-white mb-1">
                          Click to Browse or Drag Photo Here
                        </p>
                        <p className="text-xs text-gray-400">
                          Supports JPEG, PNG, or WebP &bull; Auto-centered square
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <ImageIcon size={14} />
                        <span>Select Photo from Files</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}

                  {/* TAB 2: LIVE WEBCAM STUDIO */}
                  {activeTab === "camera" && (
                    <div className="space-y-3">
                      {/* Video Viewport Frame */}
                      <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-3xl overflow-hidden border-2 border-white/20 bg-black flex items-center justify-center shadow-inner">
                        {isCameraActive ? (
                          <video
                            ref={videoRef}
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${
                              facingMode === "user" ? "-scale-x-100" : ""
                            }`}
                          />
                        ) : (
                          <div className="text-center p-4 text-gray-500 space-y-2">
                            <Camera size={36} className="mx-auto text-gray-600 animate-pulse" />
                            <p className="text-xs">Initializing camera sensor...</p>
                          </div>
                        )}

                        {/* Facial Oval Alignment Guidelines */}
                        <div className="absolute inset-4 rounded-full border-2 border-dashed border-[#c2f83a]/60 pointer-events-none flex items-center justify-center">
                          <span className="text-[10px] font-mono text-[#c2f83a] bg-black/60 px-2 py-0.5 rounded-full font-bold">
                            Align Face Here
                          </span>
                        </div>

                        {/* Countdown Overlay */}
                        {countdownNum !== null && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-6xl font-black text-[#c2f83a] animate-ping">
                              {countdownNum}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Camera Controls Bar */}
                      <div className="flex items-center gap-2">
                        {/* Switch Front/Back on phones */}
                        <button
                          type="button"
                          onClick={switchCameraMode}
                          className="p-3 rounded-full bg-white/10 hover:bg-white/15 text-white transition-all shrink-0"
                          title="Flip Camera (Front/Back)"
                        >
                          <SwitchCamera size={16} />
                        </button>

                        {/* Snap Button */}
                        <button
                          type="button"
                          onClick={handleSnapClick}
                          disabled={!isCameraActive || countdownNum !== null}
                          className="flex-1 py-3 rounded-full bg-[#ff331e] hover:bg-[#ff4733] text-white font-extrabold text-xs shadow-[0_4px_20px_rgba(255,51,30,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Camera size={16} />
                          <span>{useCountdown ? "Snap with 3s Timer" : "Take Photo"}</span>
                        </button>

                        {/* 3s Timer Toggle */}
                        <button
                          type="button"
                          onClick={() => setUseCountdown(!useCountdown)}
                          className={`p-3 rounded-full transition-all shrink-0 border ${
                            useCountdown
                              ? "bg-[#c2f83a] text-black border-[#c2f83a]"
                              : "bg-white/10 hover:bg-white/15 text-white border-white/10"
                          }`}
                          title="3-Second Timer Toggle"
                        >
                          <Clock size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="p-4 bg-black/40 border-t border-white/5 text-center">
              <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Encrypted Face ID &bull; Optical Turnstile &amp; Front Desk Authentication</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
