import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { pickLabel, type Gs1Label } from "@/lib/gs1";

interface BarcodeScanDialogProps {
  open: boolean;
  onClose: () => void;
  onScanned: (label: Gs1Label) => void;
}

const SCAN_INTERVAL_MS = 250;

export function BarcodeScanDialog({
  open,
  onClose,
  onScanned,
}: BarcodeScanDialogProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;
  const [problem, setProblem] = useState<"camera" | "unreadable" | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    setProblem(null);

    (async () => {
      try {
        const [{ readBarcodes, prepareZXingModule }, { default: wasmUrl }] =
          await Promise.all([
            import("zxing-wasm/reader"),
            import("zxing-wasm/reader/zxing_reader.wasm?url"),
          ]);
        // Served from our own origin: the default is a public CDN, which a
        // hospital network may block.
        prepareZXingModule({
          overrides: {
            locateFile: (path: string, prefix: string) =>
              path.endsWith(".wasm") ? wasmUrl : prefix + path,
          },
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        const video = videoRef.current;
        if (stopped || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        const scanFrame = async () => {
          if (stopped) return;
          if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext("2d", {
              willReadFrequently: true,
            })!;
            context.drawImage(video, 0, 0);
            const results = await readBarcodes(
              context.getImageData(0, 0, canvas.width, canvas.height),
              { formats: ["DataMatrix", "Code128", "QRCode"], tryHarder: true },
            );
            if (stopped) return;
            const label = pickLabel(results);
            if (label) {
              onScannedRef.current(label);
              return;
            }
            if (results.length > 0) setProblem("unreadable");
          }
          timer = window.setTimeout(scanFrame, SCAN_INTERVAL_MS);
        };
        void scanFrame();
      } catch {
        if (!stopped) setProblem("camera");
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title={t("scan.title")}>
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full rounded-md bg-black aspect-[4/3] object-cover"
      />
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        {problem === "camera"
          ? t("scan.cameraUnavailable")
          : problem === "unreadable"
            ? t("scan.noLotOrExpiry")
            : t("scan.hint")}
      </p>
    </Dialog>
  );
}
