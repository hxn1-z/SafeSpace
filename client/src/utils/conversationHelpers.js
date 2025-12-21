// client/src/utils/conversationHelpers.js
// Helper functions for conversation management

export function conversationLabel(conv, allUsers, currentUserId) {
    if (!conv) return "Unknown";
    if (conv.type === "global") return "Global Chat";
    if (conv.type === "group") return conv.name || "Unnamed Group";

    // DM
    const memberIds = conv.memberIds || [];
    const otherId = memberIds.find((id) => id !== currentUserId);
    const other = allUsers.find((u) => u.id === otherId);
    return other?.username || "Unknown User";
}

export function sortConversations(conversations, unreadCounts, lastActive) {
    const globalChat = conversations.find((c) => c.id === "global");
    const others = conversations.filter((c) => c.id !== "global");

    const sorted = others.sort((a, b) => {
        const unreadA = unreadCounts[a.id] || 0;
        const unreadB = unreadCounts[b.id] || 0;

        // Sort by unread first
        if (unreadA !== unreadB) {
            return unreadB - unreadA;
        }

        // Then by last active
        const tsA = lastActive[a.id] ? new Date(lastActive[a.id]).getTime() : 0;
        const tsB = lastActive[b.id] ? new Date(lastActive[b.id]).getTime() : 0;

        if (tsA !== tsB) {
            return tsB - tsA;
        }

        // Finally by createdAt
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return createdB - createdA;
    });

    return globalChat ? [globalChat, ...sorted] : sorted;
}
