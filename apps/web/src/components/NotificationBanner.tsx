import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, GripHorizontal, Maximize2, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Reagent } from '@/types';
import { getDaysUntilExpiry } from '@/lib/utils';

interface NotificationBannerProps {
  reagents: Reagent[];
  onSnooze: (reagentId: number, days: number) => void;
  onDismiss: (reagentId: number) => void;
}

export function NotificationBanner({ reagents, onSnooze, onDismiss }: NotificationBannerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const width = window.innerWidth * 0.25;
    const x = Math.max(16, Math.floor(window.innerWidth - width - 16));
    setPosition({ x, y: 16 });
  }, []);

  if (reagents.length === 0) return null;

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(true);
    setDragOffset({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    const nextX = Math.min(Math.max(8, event.clientX - dragOffset.x), maxX);
    const nextY = Math.min(Math.max(8, event.clientY - dragOffset.y), maxY);
    setPosition({ x: nextX, y: nextY });
  };

  const stopDrag = () => {
    setDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 px-2"
      style={{ left: position.x, top: position.y, width: '25vw', minWidth: 220 }}
    >
      <div
        className="bg-orange-100 border-2 border-orange-400 rounded-lg shadow-lg"
        onPointerMove={onDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <div className="flex items-center justify-between gap-2 border-b border-orange-200 px-3 py-2">
          <div
            className="flex items-center gap-2 cursor-move select-none"
            onPointerDown={startDrag}
          >
            <GripHorizontal className="h-4 w-4 text-orange-700" />
            <span className="text-sm font-semibold text-orange-900">
              {t('notifications.title')} ({reagents.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMinimized((prev) => !prev)}
            className="rounded p-1 text-orange-800 hover:bg-orange-200"
            aria-label={minimized ? 'Restore' : 'Minimize'}
          >
            {minimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
        </div>

        {!minimized && (
          <div className="p-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-orange-800 mb-2">
                  {t('notifications.message', { count: reagents.length })}
                </p>

                <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                  {reagents.map((reagent) => {
                    const days = getDaysUntilExpiry(reagent.expiry_date);
                    return (
                      <div
                        key={reagent.id}
                        className="flex items-center justify-between bg-white/50 rounded p-2 text-xs"
                      >
                        <div>
                          <span className="font-medium">{reagent.name}</span>
                          <span className="text-muted-foreground text-xs mx-2">
                            {days < 0
                              ? t('status.expired')
                              : days === 0
                              ? t('status.expiresToday')
                              : days === 1
                              ? t('status.expiresInOneDay')
                              : t('status.expiresIn', { days })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reagents.forEach((r) => onSnooze(r.id, 1))}
                    className="bg-white"
                  >
                    <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
                    {t('notifications.remindTomorrow')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reagents.forEach((r) => onSnooze(r.id, 3))}
                    className="bg-white"
                  >
                    <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
                    {t('notifications.remindIn3Days')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reagents.forEach((r) => onDismiss(r.id))}
                    className="bg-white"
                  >
                    <X className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
                    {t('notifications.dismiss')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
