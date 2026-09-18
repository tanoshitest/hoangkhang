"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Lớp phủ + hộp thoại — port từ NZeducation.
 * Gắn vào <body> bằng portal để không bị cắt bởi `overflow` của thẻ cha.
 */
function Overlay({
  title,
  onClose,
  wide = false,
  fit = false,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Hộp thoại rộng, cho form nhiều trường xếp thành lưới. */
  wide?: boolean;
  /** Không cuộn thân form — dùng khi nội dung đã xếp gọn, nhìn hết trong một khung. */
  fit?: boolean;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const openedOnPath = useRef(pathname);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (pathname !== openedOnPath.current) onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Khoá cuộn nền trong lúc hộp thoại mở. Nội dung app cuộn ở `#app-scroll`,
    // không phải `body`, nên phải khoá cả hai.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const scroller = document.getElementById("app-scroll");
    const previousScroller = scroller?.style.overflow;
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      if (scroller) scroller.style.overflow = previousScroller ?? "";
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div data-app-modal="" className="fixed inset-0 z-50">
      {/* Lớp nền tách riêng — bấm ra ngoài luôn đóng, không phụ thuộc flex hit-testing. */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="pointer-events-none relative flex min-h-full items-center justify-center overflow-y-auto p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "pointer-events-auto w-full rounded-xl border border-slate-200 bg-white shadow-lg",
            fit || wide ? "max-w-4xl" : "max-w-md",
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className={buttonClass("ghost", "icon")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Hộp thoại không gắn Server Action — cập nhật state trên client.
 */
export function Dialog({
  title,
  open,
  onClose,
  children,
  footer,
  wide = false,
  fit = false,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  fit?: boolean;
}) {
  if (!open) return null;
  return (
    <Overlay title={title} onClose={onClose} wide={wide} fit={fit}>
      <div className="space-y-4 px-5 py-4">{children}</div>
      {footer ? (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          {footer}
        </div>
      ) : null}
    </Overlay>
  );
}
