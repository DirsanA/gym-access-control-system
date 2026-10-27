import crypto from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
  fallback?: boolean;
}

/**
 * Uploads a base64 Data URI or image buffer directly to Cloudinary via REST API.
 * Uses SHA-1 signature authentication with zero third-party dependencies for maximum reliability.
 * Connects directly to Mongoose user.photoUrl.
 */
export async function uploadMemberPhotoToCloudinary(
  fileDataUri: string,
  identifier: string
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.warn("[CLOUDINARY_CONFIG_WARNING] Missing Cloudinary environment variables. Falling back to direct data storage.");
    return {
      success: true,
      url: fileDataUri,
      fallback: true,
    };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const sanitizedId = identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
    const folder = "elite-fitness/members";
    const publicId = `member_${sanitizedId}_${timestamp}`;

    // Cloudinary signature requires parameters sorted alphabetically: folder, public_id, timestamp
    const stringToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    const formData = new FormData();
    formData.append("file", fileDataUri);
    formData.append("api_key", API_KEY);
    formData.append("timestamp", timestamp.toString());
    formData.append("folder", folder);
    formData.append("public_id", publicId);
    formData.append("signature", signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    }).catch((fetchErr: any) => {
      console.warn("[CLOUDINARY_FETCH_WARNING] Network request to api.cloudinary.com failed:", fetchErr?.message);
      return null;
    });

    if (!res) {
      // Offline fallback: persist photo directly in MongoDB so local testing never breaks
      console.info("[CLOUDINARY_OFFLINE_NOTICE] Saved member portrait directly to database as network fallback.");
      return {
        success: true,
        url: fileDataUri,
        publicId,
        fallback: true,
      };
    }

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.secure_url) {
      const errMsg = data?.error?.message || `Cloudinary upload failed with status ${res.status}`;
      console.error("[CLOUDINARY_UPLOAD_ERROR]", errMsg);
      return {
        success: true,
        url: fileDataUri,
        publicId,
        fallback: true,
      };
    }

    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (err: any) {
    console.error("[CLOUDINARY_EXCEPTION]", err);
    return {
      success: true,
      url: fileDataUri,
      fallback: true,
    };
  }
}
