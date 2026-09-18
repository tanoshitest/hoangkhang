"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Tab chuyển nội dung trong cùng một trang.
 * Panel ẩn bằng `hidden` chứ không unmount — giữ state form ở tab khác.
 */
export type TabItem = { key: string; label: string; content: React.ReactNode };

export function TabGroup({
  tabs,
  variant = "main",
  trailing,
}: {
  tabs: TabItem[];
  variant?: "main" | "sub";
  trailing?: React.ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");

  const bar = (
    <div
      className={cn(
        "flex items-center gap-2",
        variant === "main" && "border-b border-slate-200",
        variant === "sub" && "rounded-lg bg-slate-100 p-1",
      )}
    >
      <div className={cn("flex min-w-0 flex-1 flex-wrap gap-0.5", variant === "sub" && "gap-1")}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "font-medium transition-colors",
                variant === "main"
                  ? cn(
                      "-mb-px whitespace-nowrap border-b-2 px-2 py-1.5 text-sm",
                      isActive
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-slate-500 hover:text-slate-800",
                    )
                  : cn(
                      "rounded-md px-3 py-1.5 text-sm",
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800",
                    ),
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {trailing ? <div className="shrink-0 pb-0.5">{trailing}</div> : null}
    </div>
  );

  return (
    <div>
      {bar}
      {tabs.map((tab) => (
        <div key={tab.key} hidden={tab.key !== active} className="pt-4">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
