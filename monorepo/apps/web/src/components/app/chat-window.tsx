"use client";

/**
 * ChatWindow
 * ----------
 * The main conversation surface for a selected Room.
 * Responsibilities:
 * - Render a header with room title and type.
 * - Display a scrollable list of messages (local state mock for now).
 * - Show typing indicators and basic file placeholders.
 * - Provide a composer for sending messages and attaching files.
 * Integration points (TODO):
 * - Subscribe to Phoenix Channel for the room to receive messages & typing events.
 * - Post new messages to the backend API and upload attachments to Blob Storage.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Info,
  Search,
  Smile,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
} from "lucide-react";
import type { Room, User } from "@/types";
import { usePhoenix } from "@/lib/phoenix/context";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  type: "text" | "file" | "image" | "system";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  edited?: boolean;
  isOwn: boolean;
}

// Note: Using shared User type from '@/types'

interface ChatWindowProps {
  room: Room;
  user?: User | null;
  className?: string;
}

export function ChatWindow({ room, user, className }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { joinRoom, leaveRoom, push, isConnected } = usePhoenix() as any;
  const topic = `room:${room.id}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join/leave Phoenix channel for the current room
  useEffect(() => {
    if (!isConnected) return; // wait until socket ready
    const ch = joinRoom(topic, { org_id: room.orgId });
    if (!ch) return;

    // Message history on join
    ch.on("message_history", (payload: any) => {
      const list = Array.isArray(payload?.messages) ? payload.messages : [];
      const mapped: Message[] = list.map((p: any) => ({
        id: p.id ?? String(Date.now()),
        content: p.content ?? "",
        senderId: p.user_id ?? p.senderId,
        senderName: p.user_name ?? p.senderName ?? "User",
        timestamp: p.timestamp ?? new Date().toISOString(),
        type: p.type ?? "text",
        fileUrl: p.file_url,
        fileName: p.file_name,
        fileSize: p.file_size,
        edited: Boolean(p.edited_at),
        isOwn: (p.user_id ?? p.senderId) === (user as any)?.id,
      }));
      setMessages(mapped);
    });

    // Incoming message event from backend
    ch.on("new_message", (payload: any) => {
      // Expecting shape compatible with Message; adjust mapping as needed
      const incoming: Message = {
        id: payload.id ?? String(Date.now()),
        content: payload.content ?? "",
        senderId: payload.user_id ?? payload.senderId,
        senderName: payload.user_name ?? payload.senderName ?? "User",
        timestamp: payload.timestamp ?? new Date().toISOString(),
        type: payload.type ?? "text",
        fileUrl: payload.file_url,
        fileName: payload.file_name,
        fileSize: payload.file_size,
        edited: Boolean(payload.edited_at),
        isOwn: payload.user_id === (user as any)?.id,
      };
      setMessages((prev) => [...prev, incoming]);
    });

    // Typing status from others
    ch.on("user_typing", (payload: any) => {
      const name = payload.user_name || payload.user_id || "Someone";
      if (payload.typing) {
        setTypingUsers((prev) =>
          prev.includes(name) ? prev : [...prev, name]
        );
      } else {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
      }
    });

    // Message edited event
    ch.on("message_edited", (payload: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === payload.id
            ? { ...msg, content: payload.content, edited: true }
            : msg
        )
      );
    });

    // Message deleted event
    ch.on("message_deleted", (payload: any) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== payload.id));
    });

    // Reaction added event
    ch.on("reaction_added", (payload: any) => {
      console.log("Reaction added:", payload);
      // TODO: Update message reactions in state
    });

    return () => {
      // Leave channel when the room changes/unmounts
      leaveRoom(topic);
      setTypingUsers([]);
    };
  }, [topic, room.orgId, isConnected]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const msg: Message = {
        id: String(Date.now()),
        content: newMessage.trim(),
        senderId: user?.id as any,
        senderName: (user as any)?.name || "You",
        timestamp: new Date().toLocaleTimeString(),
        type: "text",
        isOwn: true,
      };
      setMessages((m) => [...m, msg]);
      setNewMessage("");
      handleTypingStop();

      // Push to server channel (backend expects 'new_message')
      if (isConnected) {
        push(topic, "new_message", {
          content: msg.content,
          type: msg.type,
          org_id: (room as any).orgId,
          room_id: room.id,
          user_id: (user as any)?.id,
        });
      }
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      // Notify channel: typing started
      if (isConnected)
        push(topic, "typing", { user_id: (user as any)?.id, typing: true });
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      // Notify channel: typing stopped
      if (isConnected)
        push(topic, "typing", { user_id: (user as any)?.id, typing: false });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTypingStart();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Implement file upload to Azure Blob Storage
      console.log("File selected:", file.name);
      // This would call the upload API we found in the backend
    }
  };

  const handleEditMessage = (messageId: string, currentContent: string) => {
    const newContent = prompt("Edit message:", currentContent);
    if (newContent && newContent !== currentContent && isConnected) {
      push(topic, "edit_message", {
        message_id: messageId,
        content: newContent,
      });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (
      confirm("Are you sure you want to delete this message?") &&
      isConnected
    ) {
      push(topic, "delete_message", {
        message_id: messageId,
      });
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (isConnected) {
      push(topic, "add_reaction", {
        message_id: messageId,
        emoji: emoji,
      });
    }
  };

  const handleReply = (message: Message) => {
    setNewMessage(`@${message.senderName} `);
    // Focus the textarea
    const textarea = document.querySelector(
      'textarea[placeholder*="Message"]'
    ) as HTMLTextAreaElement;
    textarea?.focus();
  };

  const handleViewFile = (fileUrl: string, fileName: string) => {
    // Open file in new tab for viewing
    window.open(fileUrl, "_blank");
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    // Create download link
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick action handlers
  const handleAttachDoc = () => {
    fileInputRef.current?.click();
  };

  const handleESign = () => {
    // Open signature modal for document signing
    alert("E-Sign feature: Would open signature modal for document signing");
  };

  const handleStartCall = () => {
    // Initiate voice/video call
    alert("Start Call feature: Would initiate a voice/video call");
  };

  const handleShareLocation = () => {
    // Get and share current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationMessage = `📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          // Send location as a message
          if (isConnected) {
            const msg: Message = {
              id: String(Date.now()),
              content: locationMessage,
              senderId: user?.id as any,
              senderName: (user as any)?.name || "You",
              timestamp: new Date().toLocaleTimeString(),
              type: "text",
              isOwn: true,
            };

            setMessages((m) => [...m, msg]);

            push(topic, "new_message", {
              content: msg.content,
              type: msg.type,
              org_id: (room as any).orgId,
              room_id: room.id,
              user_id: (user as any)?.id,
            });
          }
        },
        (error) => {
          alert("Unable to get location: " + error.message);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleImageVideo = () => {
    // Create a file input for images/videos
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log("Image/Video selected:", file.name);
        // TODO: Upload to Azure Blob Storage and send as message
      }
    };
    input.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.senderId === (user as any)?.id;

    return (
      <div
        key={message.id}
        className="group px-4 py-2 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex gap-3">
          {/* Avatar - Always show for Discord-style layout */}
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 mt-1">
            {message.senderName.charAt(0).toUpperCase()}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {/* Header with name and timestamp */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-medium text-white">
                {isOwnMessage ? "You" : message.senderName}
              </span>
              <span className="text-xs text-slate-400">
                {message.timestamp}
              </span>
            </div>

            {/* Message Body */}
            <div className="text-slate-200 text-sm leading-relaxed break-words">
              {message.type === "text" && (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}

              {message.type === "file" && (
                <div className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg max-w-md">
                  <FileText className="h-8 w-8 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {message.fileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {message.fileSize && formatFileSize(message.fileSize)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white p-1 h-6 w-6"
                      onClick={() =>
                        handleViewFile(message.fileUrl!, message.fileName!)
                      }
                      title="View file"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white p-1 h-6 w-6"
                      onClick={() =>
                        handleDownloadFile(message.fileUrl!, message.fileName!)
                      }
                      title="Download file"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Message Actions - Discord Style (appear on hover) */}
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                title="Add reaction"
                onClick={() => handleReaction(message.id, "👍")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 14s1.5 2 4 2 4-2 4-2"
                  />
                  <line
                    x1="9"
                    y1="9"
                    x2="9.01"
                    y2="9"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <line
                    x1="15"
                    y1="9"
                    x2="15.01"
                    y2="9"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                title="Reply"
                onClick={() => handleReply(message)}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </button>
              {isOwnMessage && (
                <>
                  <button
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                    title="Edit message"
                    onClick={() =>
                      handleEditMessage(message.id, message.content)
                    }
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete message"
                    onClick={() => handleDeleteMessage(message.id)}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </>
              )}
              <button
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                title="More options"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="1" strokeWidth={1.5} />
                  <circle cx="19" cy="12" r="1" strokeWidth={1.5} />
                  <circle cx="5" cy="12" r="1" strokeWidth={1.5} />
                </svg>
              </button>
            </div>

            {/* Sample Reactions - Show for demo */}
            {message.id === "msg1" && (
              <div className="flex items-center gap-1 mt-2">
                <button
                  className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 rounded-full text-xs text-slate-300 transition-colors"
                  onClick={() => handleReaction(message.id, "👍")}
                >
                  👍 <span className="text-slate-400">2</span>
                </button>
                <button
                  className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 rounded-full text-xs text-slate-300 transition-colors"
                  onClick={() => handleReaction(message.id, "❤️")}
                >
                  ❤️ <span className="text-slate-400">1</span>
                </button>
                <button
                  className="w-6 h-6 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors text-xs flex items-center justify-center"
                  title="Add reaction"
                  onClick={() => handleReaction(message.id, "😊")}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-slate-900", className)}>
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(renderMessage)}

          {/* Typing indicator - Discord style */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  <div className="flex gap-1">
                    <div
                      className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-slate-400 italic">
                  {typingUsers.length === 1 ? (
                    <span>
                      <strong className="text-slate-300">
                        {typingUsers[0]}
                      </strong>{" "}
                      is typing...
                    </span>
                  ) : (
                    <span>
                      <strong className="text-slate-300">
                        {typingUsers.join(", ")}
                      </strong>{" "}
                      are typing...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions Bar */}
      <div className="px-4 py-3 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Quick actions:</span>
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded text-xs text-white flex items-center gap-1 transition-colors shadow-lg"
            onClick={handleAttachDoc}
            title="Attach Document"
          >
            <FileText className="w-3 h-3" />
            Attach Doc
          </button>
          <button
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 rounded text-xs text-white flex items-center gap-1 transition-colors shadow-lg"
            onClick={handleESign}
            title="Electronic Signature"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            E-Sign
          </button>
          <button
            className="px-3 py-1 bg-violet-600 hover:bg-violet-700 border border-violet-500 rounded text-xs text-white flex items-center gap-1 transition-colors shadow-lg"
            onClick={handleStartCall}
            title="Start Voice/Video Call"
          >
            <Phone className="w-3 h-3" />
            Start Call
          </button>
          <button
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 border border-orange-500 rounded text-xs text-white flex items-center gap-1 transition-colors shadow-lg"
            onClick={handleShareLocation}
            title="Share Current Location"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Share Location
          </button>
          <button
            className="px-3 py-1 bg-pink-600 hover:bg-pink-700 border border-pink-500 rounded text-xs text-white flex items-center gap-1 transition-colors shadow-lg"
            onClick={handleImageVideo}
            title="Share Image or Video"
          >
            <ImageIcon className="w-3 h-3" />
            Image/Video
          </button>
        </div>
      </div>

      {/* Message Input - Discord Style */}
      <div className="p-4">
        <div className="bg-slate-800 rounded-lg border border-slate-600 focus-within:border-slate-500 transition-colors">
          <div className="flex items-end gap-3 p-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            {/* File Upload Button */}
            <button
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              onClick={() => fileInputRef.current?.click()}
              title="Upload file"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>

            {/* Message Input */}
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${room.name}`}
                className="w-full min-h-[20px] max-h-32 bg-transparent text-sm resize-none focus:outline-none text-white placeholder-slate-400 leading-5"
                rows={1}
                style={{
                  height: "auto",
                  minHeight: "20px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = target.scrollHeight + "px";
                }}
              />
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-1">
              {/* Emoji Picker */}
              <button
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Add emoji"
              >
                <Smile className="h-5 w-5" />
              </button>

              {/* Send Button - Only show when there's text */}
              {newMessage.trim() && (
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                  title="Send message"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Command suggestions or typing hints can go here */}
          {newMessage.startsWith("/") && (
            <div className="px-4 pb-3">
              <div className="text-xs text-slate-400">
                💡 Try: <span className="text-blue-400">/help</span>,{" "}
                <span className="text-blue-400">/status</span>,{" "}
                <span className="text-blue-400">/location</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
