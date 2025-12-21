// client/src/hooks/useMessageOperations.js
// Custom hook for message-related operations (send, edit, delete, reply)

import { useState } from "react";

export function useMessageOperations() {
    const [input, setInput] = useState("");
    const [replyToId, setReplyToId] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [flashHighlightId, setFlashHighlightId] = useState(null);

    const cancelReply = () => setReplyToId(null);

    const cancelEdit = () => {
        setEditingMessageId(null);
        setInput("");
    };

    return {
        input,
        setInput,
        replyToId,
        setReplyToId,
        editingMessageId,
        setEditingMessageId,
        flashHighlightId,
        setFlashHighlightId,
        cancelReply,
        cancelEdit,
    };
}
