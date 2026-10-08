import type { FaceStatus } from "@/lib/types";

export function cameraStatusMessage(options: {
  cameraError: string | null;
  hasVideo: boolean;
  status?: FaceStatus;
}) {
  if (options.cameraError) return options.cameraError;
  if (!options.hasVideo) return "Asking the browser for camera access…";
  if (options.status === "none") {
    return "Tom can’t see a face. Scoot into the frame — lighting helps.";
  }
  if (options.status === "multiple") {
    return "One human at a time. Tom is easily overwhelmed.";
  }
  return null;
}
