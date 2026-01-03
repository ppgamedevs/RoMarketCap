/**
 * ROMC AI Assistant Component
 * 
 * Conversational AI assistant that helps users understand the site,
 * answer questions about companies, market trends, and provides contextual explanations.
 * 
 * Similar to CMC AI - right sidebar panel with chat interface.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Minimize2, Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type ROMCAIAssistantProps = {
  context?: {
    page?: "company" | "industry" | "market" | "homepage" | "compare";
    companySlug?: string;
    companyName?: string;
    industrySlug?: string;
    countySlug?: string;
  };
  lang?: "ro" | "en";
};

export function ROMCAIAssistant({ context, lang = "ro" }: ROMCAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("romc-ai-chat");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Save chat history to session storage
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      sessionStorage.setItem("romc-ai-chat", JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = useCallback(async (question?: string) => {
    const messageToSend = question || input.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          context,
          lang,
          history: messages.slice(-5), // Last 5 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || data.error || "Sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: lang === "ro" 
          ? "Scuze, am întâmpinat o eroare. Te rugăm să încerci din nou."
          : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, context, lang, messages]);

  // Listen for custom events to open chat with pre-filled question
  useEffect(() => {
    const handleOpenChat = (event: CustomEvent<{ question: string }>) => {
      setIsOpen(true);
      setIsMinimized(false);
      // Auto-send the question after opening
      setTimeout(() => {
        handleSend(event.detail.question);
      }, 300);
    };

    window.addEventListener("open-ai-chat", handleOpenChat as EventListener);
    return () => {
      window.removeEventListener("open-ai-chat", handleOpenChat as EventListener);
    };
  }, [handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = lang === "ro" 
    ? [
        "Ce este scorul ROMC?",
        "Cum se calculează market cap?",
        "Ce înseamnă confidența datelor?",
        ...(context?.companyName ? [`Ce este ${context.companyName}?`] : []),
        ...(context?.industrySlug ? [`Care sunt top companiile din ${context.industrySlug}?`] : []),
      ]
    : [
        "What is ROMC score?",
        "How is market cap calculated?",
        "What does data confidence mean?",
        ...(context?.companyName ? [`What is ${context.companyName}?`] : []),
        ...(context?.industrySlug ? [`What are the top companies in ${context.industrySlug}?`] : []),
      ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg"
          size="lg"
        >
          <span className="text-lg font-bold">AI</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed right-6 z-50 flex flex-col bg-card border rounded-lg shadow-xl ${
        isMinimized ? "bottom-6 w-80 h-16" : "bottom-6 w-96 h-[600px]"
      } transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">ROMC AI</span>
          <span className="text-xs text-muted-foreground">
            {lang === "ro" ? "Asistent inteligent" : "AI Assistant"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {lang === "ro"
                    ? "Bună! Sunt ROMC AI, asistentul tău pentru a înțelege site-ul și companiile românești. Cu ce te pot ajuta?"
                    : "Hi! I'm ROMC AI, your assistant to understand the site and Romanian companies. How can I help?"}
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {lang === "ro" ? "Întrebări sugerate:" : "Suggested questions:"}
                  </p>
                  {suggestedQuestions.slice(0, 4).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleSend(q);
                      }}
                      className="block w-full text-left text-xs p-2 rounded border hover:bg-muted transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString(lang === "ro" ? "ro-RO" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === "ro" ? "Întreabă ceva..." : "Ask something..."}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="sm"
                className="h-10 w-10 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {lang === "ro"
                ? "Apasă Enter pentru a trimite"
                : "Press Enter to send"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
