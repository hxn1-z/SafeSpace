import React from "react";
import logoWordmark from "../../assets/brand/logo-wordmark.svg";

export default function ChatSidebar({
    isSidebarOpen,
    setIsSidebarOpen,
    currentUser,
    handleLogout,
    userSearchTerm,
    setUserSearchTerm,
    filteredUsers,
    startDmWith,
    conversations,
    unreadCounts,
    lastActive,
    selectedConversationId,
    joinConversation,
    setIsCreatingGroup,
    conversationLabel,
    navigate // accessible from parent hook or passed down
}) {
    return (
        <aside
            className={[
                "z-50 h-full w-72 lg:w-80 max-w-[88vw] shrink-0 border-r border-white/10 ss-surface backdrop-blur-xl flex flex-col shadow-[0_24px_80px_-60px_rgba(0,0,0,0.85)]",
                "fixed inset-y-0 left-0 transform transition-transform duration-200 ease-out md:static md:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            ].join(" ")}
        >
            <div className="px-4 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between gap-3">
                <div className="flex flex-1 flex-col items-start gap-2 min-w-0">
                    <img
                        src={logoWordmark}
                        alt="SafeSpace"
                        className="w-full max-w-[220px] sm:max-w-[240px] h-auto rounded-2xl"
                    />
                    <div className="text-xs text-slate-300/80 truncate">
                        {currentUser?.username ? `Signed in as ${currentUser.username}` : ""}
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-[rgb(var(--ss-accent-rgb)/0.4)] text-slate-50 transition-all shadow-[0_12px_40px_-30px_rgba(0,0,0,0.9)]"
                >
                    Logout
                </button>
            </div>

            {/* Search users (DMs) */}
            <div className="p-4 border-b border-white/10 bg-white/[0.03]">
                <div className="flex items-center text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">
                    <span>Direct Messages</span>
                </div>

                <input
                    placeholder="Search usernames to DM"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[rgb(var(--ss-accent-rgb)/0.40)] transition-all shadow-[0_12px_48px_-34px_rgba(0,0,0,0.85)]"
                />

                <div className="mt-3 max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredUsers.length === 0 && userSearchTerm.trim().length >= 2 ? (
                        <div className="px-3 py-2 text-slate-500 ss-text-sm">No matches.</div>
                    ) : null}
                    {filteredUsers.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => startDmWith(u.username)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 text-sm text-slate-100 transition-colors"
                        >
                            {u.username}
                        </button>
                    ))}

                    {userSearchTerm.trim() && filteredUsers.length === 0 && (
                        <div className="text-xs text-slate-500 px-1">No users found.</div>
                    )}
                </div>
            </div>

            {/* Conversations */}
            <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-200 uppercase tracking-[0.22em]">Conversations</span>
                    <button
                        onClick={() => setIsCreatingGroup(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-[rgb(var(--ss-accent-rgb)/0.4)] text-slate-100 transition-all shadow-[0_12px_40px_-30px_rgba(0,0,0,0.85)]"
                        title="Create group"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>

                <div className="space-y-1.5">
                    {conversations
                        .slice()
                        .sort((a, b) => {
                            if (a.id === "global") return -1;
                            if (b.id === "global") return 1;

                            const unreadA = unreadCounts[a.id] || 0;
                            const unreadB = unreadCounts[b.id] || 0;
                            if (unreadA !== unreadB) return unreadB - unreadA;

                            const la = lastActive[a.id] || 0;
                            const lb = lastActive[b.id] || 0;
                            return lb - la;
                        })
                        .map((conv) => {
                            const unread = unreadCounts[conv.id] || 0;
                            const active = conv.id === selectedConversationId;

                            const base =
                                "w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border text-sm transition-all duration-200 group overflow-hidden relative";
                            const activeCls = active
                                ? "bg-[radial-gradient(circle_at_10%_20%,rgb(var(--ss-accent-rgb)/0.20),rgba(13,18,30,0.95))] border-[rgb(var(--ss-accent-rgb)/0.45)] text-white shadow-[0_18px_60px_-48px_rgb(var(--ss-accent-rgb)/0.9)]"
                                : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.06]";
                            const unreadCls = unread > 0 ? "ring-1 ring-[rgb(var(--ss-accent-rgb)/0.4)]" : "";

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => joinConversation(conv.id)}
                                    className={`${base} ${activeCls} ${unreadCls}`}
                                >
                                    <span className={`truncate ${active ? "text-white font-medium" : "text-slate-200 group-hover:text-white"}`}>
                                        {conversationLabel(conv)}
                                    </span>
                                    {unread > 0 && (
                                        <span className="shrink-0 text-[11px] px-2.5 py-0.5 rounded-full pill-accent font-semibold">
                                            {unread}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                </div>
            </div>

            {/* Sidebar actions */}
            <div className="p-4 border-t border-white/10 bg-white/5 space-y-2">
                <button
                    onClick={() => {
                        navigate("/settings");
                        setIsSidebarOpen(false);
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-sm text-center text-slate-100 transition-all shadow-[0_14px_48px_-36px_rgba(0,0,0,0.9)]"
                >
                    Settings
                </button>

                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/16 border border-white/10 text-sm md:hidden text-slate-100"
                >
                    Close
                </button>
            </div>
        </aside>
    );
}
