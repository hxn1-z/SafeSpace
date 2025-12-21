import React, { useEffect, useRef, useState } from "react";

const MAX_MESSAGE_CHARS = 4000;

export default function MessageInput({
    input,
    setInput,
    sendMessage,
    editingMessageId,
    setEditingMessageId,
    replyToId,
    setReplyToId,
    scrollToMessage,
    cancelEdit,
    cancelReply,
    editTargetMsg,
    replyTargetMsg,
    replyPreview,
    getSenderNameForMsg,
    getPlaintextForMsg,
    jumpToMessage,
    pendingImages,
    onAddImages,
    removePendingImage,
    clearPendingImages,
    maxImageBytes,
    formatBytes,
    onOpenGifPicker
}) {
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isDragActive, setIsDragActive] = useState(false);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        // Sync height when input changes programmatically (send/edit/reply).
        el.style.height = "auto";
        const nextHeight = Math.min(el.scrollHeight, 128);
        el.style.height = Math.max(nextHeight, 44) + "px";
    }, [input]);

    const truncateWithEllipsis = (text, max, forceEllipsis = false) => {
        const clean = String(text || "").replace(/\s+/g, " ").trim();
        if (!clean) return "";
        if (clean === "Encrypted message...") return clean;
        if (clean.length > max) {
            const sliceLen = Math.max(0, max - 3);
            return clean.slice(0, sliceLen).trimEnd() + "...";
        }
        if (forceEllipsis && !clean.endsWith("...")) return clean + "...";
        return clean;
    };

    const replyName =
        replyTargetMsg ? getSenderNameForMsg(replyTargetMsg) : replyPreview?.senderName || "message";
    const replySnippetSource =
        replyTargetMsg ? getPlaintextForMsg(replyTargetMsg) : replyPreview?.snippet || "";
    const replySnippet = truncateWithEllipsis(
        replySnippetSource,
        140,
        !replyTargetMsg && Boolean(replyPreview?.truncated)
    );

    const hasImages = Array.isArray(pendingImages) && pendingImages.length > 0;
    const hasProcessingImages = Array.isArray(pendingImages)
        ? pendingImages.some((img) => img.status !== "ready")
        : false;
    const canSend = editingMessageId
        ? Boolean(input.trim())
        : Boolean(input.trim() || hasImages);
    const sendDisabled = !canSend || hasProcessingImages;
    const attachmentsDisabled = Boolean(editingMessageId);
    const imageLimitLabel = formatBytes && maxImageBytes ? formatBytes(maxImageBytes) : "3 GB";

    const handleFiles = (files) => {
        if (attachmentsDisabled) return;
        if (!files || !onAddImages) return;
        onAddImages(files);
    };

    const handlePaste = (e) => {
        if (attachmentsDisabled) return;
        const items = e.clipboardData?.items;
        if (!items || items.length === 0) return;
        const files = [];
        for (const item of items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file && file.type && file.type.startsWith("image/")) {
                    files.push(file);
                }
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            handleFiles(files);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragActive(false);
        if (attachmentsDisabled) return;
        const files = Array.from(e.dataTransfer?.files || []).filter(
            (file) => file.type && file.type.startsWith("image/")
        );
        if (files.length > 0) handleFiles(files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (attachmentsDisabled) return;
        setIsDragActive(true);
    };

    const handleDragLeave = () => {
        setIsDragActive(false);
    };

    return (
        <footer className="shrink-0 bg-transparent pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-3 px-4 md:px-6">
            <div
                className="w-full relative"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {isDragActive && !attachmentsDisabled && (
                    <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-[rgb(var(--ss-accent-rgb)/0.6)] bg-[rgb(var(--ss-accent-rgb)/0.08)] flex items-center justify-center text-sm text-slate-100 pointer-events-none">
                        Drop images to upload
                    </div>
                )}
                {editingMessageId && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl glass-panel px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <button
                            type="button"
                            onClick={() => scrollToMessage(editingMessageId)}
                            className="min-w-0 text-left group rounded-lg px-2 py-1 -mx-2 -my-1 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                            title="Jump to message"
                        >
                            <div className="text-[rgb(var(--ss-accent-rgb))] ss-text-sm font-medium flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                Editing message
                            </div>
                            <div className="truncate ss-text text-slate-300 group-hover:text-white transition-colors">
                                {(() => {
                                    const t = editTargetMsg ? getPlaintextForMsg(editTargetMsg) : "";
                                    return (t || "Encrypted message").slice(0, 140);
                                })()}
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="h-8 w-8 rounded-full border border-white/10 bg-white/10 hover:bg-white/16 flex items-center justify-center transition-all text-slate-200"
                            title="Cancel edit"
                            aria-label="Cancel edit"
                        >
                            <span className="text-slate-300 hover:text-white">x</span>
                        </button>
                    </div>
                )}

                {!editingMessageId && replyToId && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl glass-panel px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <button
                            type="button"
                            onClick={() => {
                                if (jumpToMessage) {
                                    jumpToMessage(replyToId);
                                    return;
                                }
                                scrollToMessage(replyToId);
                            }}
                            className="min-w-0 text-left group rounded-lg px-2 py-1 -mx-2 -my-1 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                            title="Jump to message"
                        >
                            <div className="text-[rgb(var(--ss-accent-rgb))] ss-text-sm font-medium flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path></svg>
                                Replying to {replyName}
                            </div>
                            <div className="truncate ss-text text-slate-300 group-hover:text-white transition-colors">
                                {(() => {
                                    return (replySnippet || "Message").slice(0, 140);
                                })()}
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={cancelReply}
                            className="h-8 w-8 rounded-full border border-white/10 bg-white/10 hover:bg-white/16 flex items-center justify-center transition-all text-slate-200"
                            title="Cancel reply"
                            aria-label="Cancel reply"
                        >
                            <span className="text-slate-300 hover:text-white">x</span>
                        </button>
                    </div>
                )}

                {!editingMessageId && hasImages && (
                    <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Images ({pendingImages.length})</span>
                            {clearPendingImages && (
                                <button
                                    type="button"
                                    onClick={clearPendingImages}
                                    className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/16 border border-white/10 text-slate-100"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {pendingImages.map((img) => (
                                <div
                                    key={img.id}
                                    className="relative h-20 w-20 rounded-lg border border-white/10 bg-white/5 overflow-hidden shrink-0"
                                >
                                    {img.status === "ready" && img.dataUrl ? (
                                        <img
                                            src={img.dataUrl}
                                            alt={img.name || "Image"}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-400">
                                            Loading...
                                        </div>
                                    )}
                                    {removePendingImage && (
                                        <button
                                            type="button"
                                            onClick={() => removePendingImage(img.id)}
                                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center"
                                            title="Remove image"
                                            aria-label="Remove image"
                                        >
                                            x
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-3 items-end relative bg-white/5 p-3 rounded-2xl border border-white/10 shadow-[0_18px_60px_-45px_rgba(0,0,0,0.9)] ring-1 ring-white/5 transition-all focus-within:ring-[rgb(var(--ss-accent-rgb)/0.5)] focus-within:border-[rgb(var(--ss-accent-rgb)/0.35)] focus-within:bg-white/10">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            handleFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        disabled={attachmentsDisabled}
                        className={[
                            "h-11 w-11 rounded-xl border border-white/10 flex items-center justify-center transition-colors",
                            attachmentsDisabled
                                ? "bg-white/5 text-slate-500 cursor-not-allowed"
                                : "bg-white/10 hover:bg-white/16 text-slate-200"
                        ].join(" ")}
                        title="Add images"
                        aria-label="Add images"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (attachmentsDisabled) return;
                            if (onOpenGifPicker) onOpenGifPicker();
                        }}
                        disabled={attachmentsDisabled}
                        className={[
                            "h-11 w-11 rounded-xl border border-white/10 flex items-center justify-center transition-colors text-xs font-semibold tracking-wide",
                            attachmentsDisabled
                                ? "bg-white/5 text-slate-500 cursor-not-allowed"
                                : "bg-white/10 hover:bg-white/16 text-slate-200"
                        ].join(" ")}
                        title="Add GIF"
                        aria-label="Add GIF"
                    >
                        GIF
                    </button>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        maxLength={MAX_MESSAGE_CHARS}
                        onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                        placeholder="Type a message..."
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                e.preventDefault();
                                if (editingMessageId) cancelEdit();
                                else if (replyToId) cancelReply();
                                return;
                            }

                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (!sendDisabled) sendMessage();
                            }
                        }}
                        className="flex-1 min-w-0 bg-transparent py-3 px-3 ss-text text-slate-100 placeholder:text-slate-500 outline-none resize-none max-h-32 custom-scrollbar"
                        style={{ minHeight: "44px", height: "auto" }}
                        rows={1}
                        // Auto-expand height
                        onInput={(e) => {
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
                        }}
                    />

                    <button
                        onClick={sendMessage}
                        disabled={sendDisabled}
                        className={[
                            "h-11 px-5 mb-1 rounded-xl text-sm font-semibold transition-all duration-200 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)]",
                            !sendDisabled
                                ? "pill-accent bg-[rgb(var(--ss-accent-rgb))] text-slate-900 hover:brightness-110 active:scale-95"
                                : "bg-white/10 text-slate-500 border border-white/10 cursor-not-allowed"
                        ].join(" ")}
                    >
                        {editingMessageId ? "Save" : "Send"}
                    </button>
                </div>

                <div className="mt-2 flex items-center justify-between px-2">
                    <div className="text-slate-500 text-[11px] font-medium tracking-wide">
                        {editingMessageId ? "Editing text only" : ""}
                    </div>
                    <div className={`text-[11px] font-medium transition-colors ${input.length >= MAX_MESSAGE_CHARS ? "text-amber-400" : "text-slate-500"}`}>
                        {input.length > 0 && `${input.length}/${MAX_MESSAGE_CHARS}`}
                    </div>
                </div>
            </div>
        </footer>
    );
}
