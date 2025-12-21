import React from "react";
import logoWordmark from "../../assets/brand/logo-wordmark.svg";

export default function BrandHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <img
        src={logoWordmark}
        alt="SafeSpace"
        className="w-full max-w-[380px] sm:max-w-[420px] h-auto rounded-2xl"
      />
      {title ? <div className="text-sm font-semibold text-white">{title}</div> : null}
      {subtitle ? <div className="text-xs text-slate-300/80">{subtitle}</div> : null}
    </div>
  );
}
