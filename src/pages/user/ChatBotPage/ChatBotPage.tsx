import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Bot,
  User,
  Loader2,
  MessagesSquare,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import chatBotService, {
  type ChatSession,
  type SessionMessage,
} from "../../../services/user/chatBotService";

// ── Types ──

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Component ──

const ChatBotPage = () => {
  const { t } = useTranslation("Chatbot");
  const location = useLocation();

  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<number, ChatMessage[]>>({});
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(
    null
  );
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived: current session messages
  const messages = activeSessionId !== null ? (messagesMap[activeSessionId] ?? []) : [];

  // Whether we are in "new chat" mode (no session selected)
  const isNewChatMode = activeSessionId === null;

  // ── Fetch sessions ──
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await chatBotService.getSessions();
      const data = res.data.data ?? [];
      // Most recent session first
      setSessions(data.reverse());
    } catch {
      // silently fail, user sees empty list
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Pre-fill input from navigation state (e.g. from Dashboard "View Result") ──
  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt) {
      setInputValue(state.initialPrompt);
      // Focus textarea after render
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      // Clear state so navigating back/forward doesn't re-fill
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auto-resize textarea ──
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  // ── Helper: update messages for a specific session ──
  const updateSessionMessages = (
    sessionId: number,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => {
    setMessagesMap((prev) => ({
      ...prev,
      [sessionId]: updater(prev[sessionId] ?? []),
    }));
  };

  // ── Start a new chat (reset to new-chat mode) ──
  const handleNewChat = () => {
    setActiveSessionId(null);
    setInputValue("");
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // ── Open delete confirmation modal ──
  const handleRequestDelete = (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
  };

  // ── Confirm delete session ──
  const handleConfirmDelete = async () => {
    if (sessionToDelete === null) return;
    const sessionId = sessionToDelete;
    setSessionToDelete(null);
    setDeletingSessionId(sessionId);
    try {
      await chatBotService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      // Clean up messages map
      setMessagesMap((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch {
      // handle error
    } finally {
      setDeletingSessionId(null);
    }
  };

  // ── Select session ──
  const handleSelectSession = async (session: ChatSession) => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    if (session.id === activeSessionId) return;
    setActiveSessionId(session.id);

    // If messages already cached, don't re-fetch
    if (messagesMap[session.id]) return;

    // Fetch messages from server
    setIsLoadingMessages(true);
    try {
      const res = await chatBotService.getMessages(session.id);
      const serverMessages: ChatMessage[] = (res.data.data ?? []).map(
        (msg: SessionMessage) => ({
          role: msg.role === "USER" ? "user" as const : "assistant" as const,
          content: msg.content,
        })
      );
      setMessagesMap((prev) => ({ ...prev, [session.id]: serverMessages }));
    } catch {
      // If fetch fails, initialize with empty array
      setMessagesMap((prev) => ({ ...prev, [session.id]: [] }));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // ── Send message ──
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSendingMessage) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsSendingMessage(true);

    try {
      let sessionId = activeSessionId;

      // If no active session, create one with the message as title
      if (sessionId === null) {
        const title = userMessage.length > 50
          ? userMessage.substring(0, 50) + "..."
          : userMessage;
        const createRes = await chatBotService.createSession({ title });
        const newSession = createRes.data.data;
        if (!newSession) throw new Error("Chat session response data is missing");
        sessionId = newSession.id;
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(sessionId);
        setMessagesMap((prev) => ({ ...prev, [sessionId!]: [] }));
      }

      // Add user message to chat
      updateSessionMessages(sessionId, (prev) => [
        ...prev,
        { role: "user", content: userMessage },
      ]);

      // Send message to AI
      const res = await chatBotService.sendMessage({
        sessionId,
        userMessage,
      });
      const responseData = res.data.data;
      if (!responseData) throw new Error("Chat response data is missing");
      const aiResponse = responseData.aiResponse;
      updateSessionMessages(sessionId, (prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);

      // Move this session to top of the list
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === sessionId);
        if (idx > 0) {
          const updated = [...prev];
          const [moved] = updated.splice(idx, 1);
          updated.unshift(moved);
          return updated;
        }
        return prev;
      });
    } catch {
      // If we have a session, show error in chat
      if (activeSessionId !== null) {
        updateSessionMessages(activeSessionId, (prev) => [
          ...prev,
          {
            role: "assistant",
            content: t("errorMessage"),
          },
        ]);
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ── Handle keyboard ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Render ──
  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-50 relative">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-30 bg-zinc-900/40 backdrop-blur-xs transition-opacity md:hidden"
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          absolute inset-y-0 left-0 z-40 w-72 border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out overflow-hidden
          ${sidebarOpen ? "translate-x-0 md:w-72" : "-translate-x-full md:w-0 md:translate-x-0"}
          md:static md:z-auto md:flex-shrink-0
        `}
      >
        <div className="flex h-full w-72 flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 p-4">
            <div className="flex items-center gap-2">
              <MessagesSquare size={18} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-zinc-900">
                {t("sessions")}
              </h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              aria-label={t("closeSidebar")}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              disabled={isNewChatMode}
              className={`
                flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]
                ${isNewChatMode
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
                }
              `}
            >
              <Plus size={16} />
              {t("newChat")}
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  size={20}
                  className="animate-spin text-zinc-400"
                />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare
                  size={32}
                  className="mb-2 text-zinc-300"
                />
                <p className="text-xs text-zinc-400">
                  {t("noSessions")}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={`
                      group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all
                      ${
                        activeSessionId === session.id
                          ? "bg-sky-50 text-slate-700 font-medium"
                          : "text-zinc-600 hover:bg-sky-50 hover:text-zinc-900"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare size={14} className="flex-shrink-0 text-blue-700" />
                      <span className="truncate">{session.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleRequestDelete(e, session.id)}
                      disabled={deletingSessionId === session.id}
                      className={`
                        flex-shrink-0 rounded-lg p-1 transition-all
                        ${
                          activeSessionId === session.id
                            ? "text-slate-400 hover:bg-blue-100 hover:text-rose-500"
                            : "text-zinc-300 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 hover:text-rose-500"
                        }
                      `}
                      aria-label={t("deleteSession")}
                    >
                      {deletingSessionId === session.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Chat Header */}
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              aria-label={t("openSidebar")}
            >
              <PanelLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <Sparkles size={16} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">
                {t("title")}
              </h1>
              <p className="text-xs text-zinc-400">{t("subtitle")}</p>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingMessages ? (
            // ── Loading messages ──
            <div className="flex h-full flex-col items-center justify-center px-6">
              <Loader2 size={28} className="animate-spin text-blue-400" />
              <p className="mt-3 text-sm text-zinc-400">{t("loadingMessages")}</p>
            </div>
          ) : messages.length === 0 && !isSendingMessage ? (
            // ── Empty State: New chat / no messages ──
            <div className="flex h-full flex-col items-center justify-center px-6">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <Sparkles size={32} className="text-blue-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-zinc-900">
                {isNewChatMode ? t("welcomeTitle") : t("emptySessionTitle")}
              </h2>
              <p className="mb-4 max-w-md text-center text-sm text-zinc-500">
                {isNewChatMode ? t("welcomeDescription") : t("emptySessionDescription")}
              </p>
              {/* Quick suggestions */}
              <div className="grid max-w-lg grid-cols-2 gap-2">
                {[
                  t("suggestion1"),
                  t("suggestion2"),
                  t("suggestion3"),
                  t("suggestion4"),
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInputValue(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-xs text-zinc-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ── Messages ──
            <div className="mx-auto w-full max-w-3xl space-y-1 px-4 py-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                      <Bot size={16} className="text-600" />
                    </div>
                  )}
                  <div
                    className={`
                      max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                      ${
                        msg.role === "user"
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-700 border border-zinc-200"
                      }
                    `}
                  >
                    {msg.role === "assistant" ? (
                      <Markdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="mb-3 mt-4 text-lg font-bold text-zinc-900 first:mt-0">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-2 mt-3 text-base font-bold text-zinc-900 first:mt-0">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-2 mt-3 text-sm font-bold text-zinc-800 first:mt-0">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="my-2 border-l-3 border-blue-300 bg-blue-50/50 py-1 pl-3 pr-2 text-zinc-600 italic rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                          code: ({ children, className }) => {
                            const isBlock = className?.includes("language-");
                            if (isBlock) {
                              return (
                                <pre className="my-2 overflow-x-auto rounded-lg bg-zinc-800 p-3 text-xs text-zinc-100">
                                  <code>{children}</code>
                                </pre>
                              );
                            }
                            return (
                              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-blue-600">
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => <>{children}</>,
                          strong: ({ children }) => (
                            <strong className="font-semibold text-zinc-900">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="text-zinc-500">{children}</em>
                          ),
                          hr: () => (
                            <hr className="my-3 border-zinc-200" />
                          ),
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-500">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </Markdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200">
                      <User size={16} className="text-zinc-600" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isSendingMessage && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Bot size={16} className="text-600" />
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area — always visible */}
        <div className="border-t border-zinc-200 bg-white px-3 py-2.5 md:px-4 md:py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex max-w-3xl items-end gap-2.5">
            <div className="flex flex-1 items-end rounded-2xl border border-zinc-300 bg-white px-3.5 py-2 md:px-4 md:py-2.5 shadow-xs transition-all focus-within:border-blue-400 focus-within:shadow-md focus-within:shadow-blue-100/50">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("inputPlaceholder")}
                rows={1}
                className="max-h-40 flex-1 resize-none bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isSendingMessage}
              className={`
                flex h-10 w-10 md:h-10 md:w-10 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-[0.93]
                ${
                  inputValue.trim() && !isSendingMessage
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-500"
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                }
              `}
              aria-label={t("send")}
            >
              {isSendingMessage ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="mx-auto mt-1 md:mt-1.5 max-w-3xl text-center text-[11px] text-zinc-400 leading-tight">
            {t("disclaimer")}
          </p>
        </div>
      </main>

      {/* ── Delete Confirmation Modal ── */}
      {sessionToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">
                {t("deleteConfirmTitle")}
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                {t("deleteConfirmDescription")}
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSessionToDelete(null)}
                className="flex-1 rounded-full border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 active:scale-[0.98]"
              >
                {t("deleteConfirmCancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-medium text-white transition hover:bg-rose-500 active:scale-[0.98]"
              >
                {t("deleteConfirmSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBotPage;
