import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  hasConflictingLabels,
  parseTypedBarcode,
  pickLabel,
  type Gs1Label,
} from "@/lib/gs1";

interface BarcodeScanDialogProps {
  open: boolean;
  onClose: () => void;
  onScanned: (label: Gs1Label) => void;
}

const SCAN_INTERVAL_MS = 250;
// A code with only a lot (Immucor REF/LOT) is used if no code with an expiry turns up by then,
// and only once the same lot was read in two frames with no more than a few misses in between.
const PARTIAL_MAX_MISSES = 4;
const PARTIAL_WAIT_MS = 2500;
// Codes the whole-frame pass misses are often found in a crop: a Bio-Rad GS1-128 on a box front
// and an Immucor vial held at arm's length were both read only this way. One crop per frame,
// in turn, so a frame costs at most two passes. Fractions of the frame: x, y, width, height.
const SCAN_REGIONS = [
  [0.2, 0.2, 0.6, 0.6],
  [0, 0.25, 1, 0.5],
  [0.25, 0, 0.5, 1],
  [0, 0, 1, 0.5],
  [0, 0.5, 1, 0.5],
] as const;

export function BarcodeScanDialog({
  open,
  onClose,
  onScanned,
}: BarcodeScanDialogProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;
  const [problem, setProblem] = useState<
    "camera" | "unreadable" | "several" | null
  >(null);
  const [typed, setTyped] = useState("");
  const [typedUnreadable, setTypedUnreadable] = useState(false);

  // A keyboard scanner types into the focused field and presses Enter, so this form serves it too.
  const handleTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const label = parseTypedBarcode(typed);
    if (label) onScanned(label);
    else setTypedUnreadable(true);
  };

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    setProblem(null);
    setTyped("");
    setTypedUnreadable(false);

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

        // Ask for continuous autofocus where the camera supports it; thin UDI bars blur otherwise.
        const [track] = stream.getVideoTracks();
        if (
          (track?.getCapabilities?.() as { focusMode?: string[] } | undefined)
            ?.focusMode?.includes("continuous")
        ) {
          await track
            .applyConstraints({
              advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
            })
            .catch(() => undefined);
        }

        const canvas = document.createElement("canvas");
        const options = {
          formats: ["DataMatrix", "Code128", "QRCode"] as ("DataMatrix" | "Code128" | "QRCode")[],
          tryHarder: true,
          maxNumberOfSymbols: 4,
        };
        let frame = 0;
        let partial: Gs1Label | null = null;
        let partialSince = 0;
        let partialSeen = 0;
        let partialMisses = 0;
        const scanFrame = async () => {
          if (stopped) return;
          if (video.videoWidth > 0) {
            const width = video.videoWidth;
            const height = video.videoHeight;
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", {
              willReadFrequently: true,
            })!;
            context.drawImage(video, 0, 0);
            const [x, y, w, h] = SCAN_REGIONS[frame % SCAN_REGIONS.length];
            frame += 1;
            const results = [
              ...(await readBarcodes(
                context.getImageData(0, 0, width, height),
                options,
              )),
              ...(await readBarcodes(
                context.getImageData(
                  Math.round(x * width),
                  Math.round(y * height),
                  Math.round(w * width),
                  Math.round(h * height),
                ),
                options,
              )),
            ];
            if (stopped) return;
            const label = pickLabel(results);
            if (label?.lot && label.expiryDate) {
              onScannedRef.current(label);
              return;
            }
            if (label?.lot) {
              if (label.lot !== partial?.lot) {
                partial = label;
                partialSince = Date.now();
                partialSeen = 0;
              }
              partialSeen += 1;
              partialMisses = 0;
            } else if (partial && ++partialMisses > PARTIAL_MAX_MISSES) {
              partial = null;
              partialSeen = 0;
            }
            if (
              partial &&
              partialSeen >= 2 &&
              Date.now() - partialSince >= PARTIAL_WAIT_MS
            ) {
              onScannedRef.current(partial);
              return;
            }
            if (results.length > 0 && !label)
              setProblem(hasConflictingLabels(results) ? "several" : "unreadable");
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
            : problem === "several"
              ? t("scan.severalLabels")
            : t("scan.hint")}
      </p>
      <form onSubmit={handleTyped} className="mt-4 border-t pt-4">
        <label htmlFor="typed-barcode" className="block text-sm font-medium mb-1">
          {t("scan.typedLabel")}
        </label>
        <div className="flex gap-2">
          <Input
            id="typed-barcode"
            dir="ltr"
            autoComplete="off"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setTypedUnreadable(false);
            }}
            placeholder="(17)261120(10)112062"
            className="flex-1 min-w-0"
          />
          <Button type="submit" disabled={!typed.trim()} className="shrink-0">
            {t("scan.typedSubmit")}
          </Button>
        </div>
        {typedUnreadable && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {t("scan.typedUnreadable")}
          </p>
        )}
      </form>
    </Dialog>
  );
}
