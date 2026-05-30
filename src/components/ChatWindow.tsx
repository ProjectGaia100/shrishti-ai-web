import { useState, useRef, useEffect } from "react";
import { X, Minimize2, Send, Sparkles, Loader2, ChevronDown, MapPin, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deriveChatLayerName } from "@/lib/chatLayerName";
import { useState as useLocalState } from "react";

function ThinkingBubble({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [open, setOpen] = useLocalState(false);
  return (
    <div className="max-w-[85%] rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
      >
        {isStreaming
          ? <Loader2 className="w-3 h-3 animate-spin text-amber-500/70 shrink-0" />
          : <ChevronDown className={`w-3 h-3 text-amber-500/70 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        }
        <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500/70">
          {isStreaming ? "Thinking…" : "Thought process"}
        </span>
        {!isStreaming && <span className="text-[9px] text-amber-500/40 ml-auto">{open ? 'hide' : 'show'}</span>}
      </button>
      {(open || isStreaming) && (
        <div className="px-4 pb-3 border-t border-amber-500/10">
          <p className="text-[11px] text-muted-foreground/60 italic whitespace-pre-wrap leading-relaxed mt-2">
            {content || "…"}
          </p>
        </div>
      )}
    </div>
  );
}

interface Message {
  role: "user" | "assistant" | "thinking";
  content: string;
}

interface ChatWindowProps {
  onClose: () => void;
  onMapUpdate?: (tileUrl: string, layerName: string, center?: { lat: number; lon: number; zoom?: number }) => void;
}

export const ChatWindow = ({ onClose, onMapUpdate }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm the ShrishtiAI Earth Engine Agent. Ask me to load any layer — NDVI, NDWI, elevation, temperature, land cover, nightlights, rainfall, and more. Try: \"Show NDWI for Goa\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Show NDVI of Kerala",
    "Show elevation of India",
    "NDWI for Goa",
    "Land cover of Karnataka",
    "Temperature map of Rajasthan",
    "Nighttime lights of India",
  ];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const history = messages
      .filter(m => m.role !== "thinking")
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    // Use unique IDs to track placeholder messages
    const thinkingId = `thinking-${Date.now()}`;
    const responseId = `response-${Date.now() + 1}`;
    setMessages(prev => [
      ...prev,
      { role: "thinking", content: "", _id: thinkingId } as any,
      { role: "assistant", content: "", _id: responseId } as any,
    ]);

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000') + '/api/chat/message';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(() => {
          try { const t = localStorage.getItem('auth_token'); return t ? { Authorization: `Bearer ${t}` } : {}; } catch { return {}; }
        })() },
        body: JSON.stringify({ message: userMessage, history, stream: true }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.error) errMsg += `: ${errData.error}`;
          else if (errData.message) errMsg += `: ${errData.message}`;
        } catch (e) {}
        throw new Error(errMsg);
      }
      
      if (!res.body) throw new Error(`HTTP ${res.status} (No response body)`);

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();

        // Build display message
        let displayMsg = data.message || data.response_text || "Done!";
        if (data.gee_error) {
          displayMsg += `\n\n⚠️ Map layer couldn't be rendered: ${data.gee_error}`;
        }

        let displayMsgFinal = displayMsg;

        // Add tile layer to map if URL is provided
        if (data.tile_url) {
          const layerName = deriveChatLayerName(userMessage, data.message || data.response_text);
          const layerId = `ai-${Date.now()}`;

          window.dispatchEvent(new CustomEvent('geo:add-layer', {
            detail: {
              id: layerId,
              name: layerName,
              url: data.tile_url,
              opacity: 0.85,
              zIndex: 450,
              legend: data.legend ?? [],
            },
          }));

          // Fly to region if center provided
          if (data.center?.lat && data.center?.lon) {
            window.dispatchEvent(new CustomEvent('geo:jump-to', {
              detail: {
                lat: data.center.lat,
                lon: data.center.lon,
                zoom: data.center.zoom || 8,
              },
            }));
          }

          displayMsgFinal = `✅ ${displayMsg}\n\n🗺️ Layer added to map.`;
          onMapUpdate?.(data.tile_url, layerName, data.center);
        } else if (data.gee_error) {
          displayMsgFinal = `⚠️ Map layer could not be loaded: ${data.gee_error}\n\n${displayMsg}`;
        }

        setMessages(prev =>
          prev
            .filter((m: any) => m._id !== thinkingId)
            .map((m: any) =>
              m._id === responseId ? { ...m, content: displayMsgFinal, _id: undefined } : m
            )
        );

        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let thinkingText = "";
      let responseText = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // Split on SSE event boundaries (\n\n), then parse each event's data line
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";  // last incomplete event stays in buffer

        for (const event of events) {
          const dataLine = event.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          const line = dataLine;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "thinking") {
              thinkingText += evt.content;
              setMessages(prev => prev.map((m: any) =>
                m._id === thinkingId ? { ...m, content: thinkingText } : m
              ));
            } else if (evt.type === "content") {
              responseText += evt.content;
              setMessages(prev => prev.map((m: any) =>
                m._id === responseId ? { ...m, content: responseText } : m
              ));
            } else if (evt.type === "done") {
              if (evt.response_text && !responseText) {
                responseText = evt.response_text;
              }

              if (evt.center?.lat != null && evt.center?.lon != null) {
                window.dispatchEvent(new CustomEvent('geo:jump-to', {
                  detail: {
                    lat: evt.center.lat,
                    lon: evt.center.lon,
                    zoom: evt.center.zoom || 8,
                  },
                }));
              }

              let finalMsg = (responseText || evt.response_text || '').trim();

              if (evt.tile_url) {
                const layerId = `ai-${Date.now()}`;
                const layerName = deriveChatLayerName(
                  userMessage,
                  responseText || evt.response_text
                );

                window.dispatchEvent(new CustomEvent('geo:add-layer', {
                  detail: {
                    id: layerId,
                    name: layerName,
                    url: evt.tile_url,
                    opacity: 0.85,
                    zIndex: 450,
                    legend: evt.legend ?? [],
                  },
                }));

                onMapUpdate?.(evt.tile_url, layerName, evt.center);
                finalMsg = finalMsg
                  ? `✅ ${finalMsg}\n\n🗺️ Layer added to map.`
                  : '🗺️ Layer added to map.';
              } else if (evt.gee_error) {
                finalMsg = finalMsg
                  ? `⚠️ Map layer could not be loaded: ${evt.gee_error}\n\n${finalMsg}`
                  : `⚠️ Map layer could not be loaded: ${evt.gee_error}`;
              }

              setMessages(prev =>
                prev
                  .filter((m: any) => m._id !== thinkingId)
                  .map((m: any) =>
                    m._id === responseId
                      ? { ...m, content: finalMsg || 'Done.', _id: undefined }
                      : m
                  )
              );
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            }
          } catch (parseErr) {
            console.warn('SSE parse error on line:', line.slice(0, 100), parseErr);
          }
        }
      }

      if (!responseText) {
        // Stream ended without done — show whatever thinking we got as the response
        setMessages(prev => prev.filter((m: any) => m._id !== responseId));
        if (thinkingText) {
          // Keep thinking visible, add error note
          setMessages(prev => [...prev, { role: "assistant", content: "The model thought but didn't return a map. Check backend logs." }]);
        } else {
          setMessages(prev => prev.filter((m: any) => m._id !== thinkingId));
          setMessages(prev => [...prev, { role: "assistant", content: "Sorry — no response received." }]);
        }
      }
    } catch (err) {
      console.error('Chat SSE error', err);
      setMessages(prev => prev.filter(m => m.role !== "thinking" && m.content !== ""));
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry — failed to connect to the AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1001] w-96 h-[560px] bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-zinc-900 dark:bg-zinc-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-black/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white dark:text-black" />
          </div>
          <div>
            <h3 className="font-bold text-white dark:text-black">SHRISHTI AI Agent</h3>
            <p className="text-xs text-white/70 dark:text-black/70 font-medium tracking-wide">
              {isLoading ? "Thinking..." : "Earth Engine Agent • Online"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0 text-white/70 dark:text-black/70 hover:text-white dark:hover:text-black hover:bg-white/10 dark:hover:bg-black/10">
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0 text-white/70 dark:text-black/70 hover:text-white dark:hover:text-black hover:bg-white/10 dark:hover:bg-black/10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "thinking" ? (
                <ThinkingBubble content={message.content} isStreaming={isLoading} />
              ) : (
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                      : "bg-muted/50 border border-border"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Quick suggestions */}
      {!isLoading && messages.length <= 3 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {suggestions.slice(0, 3).map((suggestion, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => setInput(suggestion)}
              className="text-xs bg-muted/50 hover:bg-muted border-border/50"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
            placeholder="Show NDVI for Kerala..."
            className="flex-1 bg-background border-border"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            size="sm"
            disabled={isLoading || !input.trim()}
            className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
