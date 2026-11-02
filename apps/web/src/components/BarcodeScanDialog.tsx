import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  hasConflictingLabels,
  parseTypedBarcode,
  pickAlternatives,
  pickLabel,
  typedAlternatives,
  type Gs1Label,
  type KnownLots,
} from "@/lib/gs1";
import { confirmLabel, type PendingLabel } from "@/lib/scanConfirm";

interface BarcodeScanDialogProps {
  open: boolean;
  onClose: () => void;
  onScanned: (label: Gs1Label) => void;
  // Lots already on the team's list: they decide an Immucor code that reads two ways.
  knownLots?: KnownLots;
}

const SCAN_INTERVAL_MS = 250;
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
  knownLots,
}: BarcodeScanDialogProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;
  const knownLotsRef = useRef(knownLots);
  knownLotsRef.current = knownLots;
  const [problem, setProblem] = useState<
    "camera" | "unreadable" | "several" | null
  >(null);
  const [typed, setTyped] = useState("");
  const [typedUnreadable, setTypedUnreadable] = useState(false);
  const [choices, setChoices] = useState<Gs1Label[] | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [torch, setTorch] = useState<boolean | null>(null);
  const [zoom, setZoom] = useState<{
    min: number;
    max: number;
    on: boolean;
  } | null>(null);

  // Torch and zoom only where the camera reports them; a glossy or small label reads better with them.
  const toggleTorch = () => {
    const next = !torch;
    trackRef.current
      ?.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      })
      .then(() => setTorch(next))
      .catch(() => undefined);
  };
  const toggleZoom = () => {
    if (!zoom) return;
    const on = !zoom.on;
    const value = on ? Math.min(zoom.max, zoom.min * 2) : zoom.min;
    trackRef.current
      ?.applyConstraints({
        advanced: [{ zoom: value } as MediaTrackConstraintSet],
      })
      .then(() => setZoom({ ...zoom, on }))
      .catch(() => undefined);
  };

  // A keyboard scanner types into the focused field and presses Enter, so this form serves it too.
  const handleTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const label = parseTypedBarcode(typed, knownLots);
    if (label) onScanned(label);
    else {
      const alternatives = typedAlternatives(typed, knownLots);
      setChoices(alternatives);
      setTypedUnreadable(!alternatives);
    }
  };

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    setProblem(null);
    setTyped("");
    setTypedUnreadable(false);
    setChoices(null);
    setTorch(null);
    setZoom(null);

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
        trackRef.current = track ?? null;
        const capabilities = track?.getCapabilities?.() as
          { torch?: boolean; zoom?: { min: number; max: number } } | undefined;
        if (capabilities?.torch) setTorch(false);
        if (capabilities?.zoom && capabilities.zoom.max > capabilities.zoom.min)
          setZoom({
            min: capabilities.zoom.min,
            max: capabilities.zoom.max,
            on: false,
          });
        if (
          (
            track?.getCapabilities?.() as { focusMode?: string[] } | undefined
          )?.focusMode?.includes("continuous")
        ) {
          await track
            .applyConstraints({
              advanced: [
                { focusMode: "continuous" } as MediaTrackConstraintSet,
              ],
            })
            .catch(() => undefined);
        }

        const canvas = document.createElement("canvas");
        const options = {
          formats: ["DataMatrix", "Code128", "QRCode"] as (
            "DataMatrix" | "Code128" | "QRCode"
          )[],
          tryHarder: true,
          maxNumberOfSymbols: 4,
        };
        let frame = 0;
        let pending: PendingLabel | null = null;
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
            const label = pickLabel(results, knownLotsRef.current);
            const conflict =
              !label && hasConflictingLabels(results, knownLotsRef.current);
            const step = confirmLabel(pending, label, conflict, Date.now());
            pending = step.pending;
            if (step.accepted) {
              onScannedRef.current(step.accepted);
              return;
            }
            // Kept once shown: the code leaves the frame as the hand moves to tap a choice.
            const alternatives =
              label || conflict
                ? null
                : pickAlternatives(results, knownLotsRef.current);
            if (alternatives) setChoices(alternatives);
            if (results.length > 0 && !label)
              setProblem(conflict ? "several" : "unreadable");
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
      trackRef.current = null;
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
      {(torch !== null || zoom) && (
        <div className="mt-2 flex gap-2">
          {torch !== null && (
            <Button
              type="button"
              variant={torch ? "default" : "outline"}
              onClick={toggleTorch}
              aria-pressed={torch}
            >
              {t("scan.torch")}
            </Button>
          )}
          {zoom && (
            <Button
              type="button"
              variant={zoom.on ? "default" : "outline"}
              onClick={toggleZoom}
              aria-pressed={zoom.on}
            >
              {t("scan.zoom")}
            </Button>
          )}
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        {problem === "camera"
          ? t("scan.cameraUnavailable")
          : problem === "unreadable" && !choices
            ? t("scan.noLotOrExpiry")
            : problem === "several"
              ? t("scan.severalLabels")
              : t("scan.hint")}
      </p>
      {choices && (
        <div className="mt-3" role="group" aria-label={t("scan.chooseTitle")}>
          <p className="text-sm font-medium mb-2">{t("scan.chooseTitle")}</p>
          <div className="flex flex-col gap-2">
            {choices.map((choice) => (
              <Button
                key={`${choice.lot}|${choice.expiryDate ?? ""}`}
                type="button"
                variant="outline"
                onClick={() => onScanned(choice)}
                className="justify-start"
              >
                {choice.expiryDate
                  ? t("scan.choiceLotExpiry", {
                      lot: choice.lot,
                      expiry: choice.expiryDate,
                    })
                  : t("scan.choiceLotOnly", { lot: choice.lot })}
              </Button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={handleTyped} className="mt-4 border-t pt-4">
        <label
          htmlFor="typed-barcode"
          className="block text-sm font-medium mb-1"
        >
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
