import { useState } from "react";
import { X, Minimize2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendChatMessage } from "@/services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  onClose: () => void;
}

export const ChatWindow = ({ onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your GEE AI Assistant. I can help you with satellite imagery analysis, data interpretation, and geospatial insights. What would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");

  const suggestions = ["Analyze vegetation", "Show temperature trends", "Compare land cover"];

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    // call backend chat endpoint
    (async () => {
      try {
        const response = await sendChatMessage(userMessage, []);
        // The backend should return response_text and optionally tile_url
        if (response?.response_text) {
          setMessages((prev) => [...prev, { role: "assistant", content: response.response_text }]);
        }

        if (response?.tile_url) {
          // add layer to map with better metadata
          const layerName = response.metadata?.title || response.metadata?.name || `AI Query: ${userMessage}`;
          const layerDescription = response.metadata?.description || `Generated from: "${userMessage}"`;
          
          window.dispatchEvent(new CustomEvent('geo:add-layer', {
            detail: {
              id: `ai-${Date.now()}`,
              name: layerName,
              url: response.tile_url,
              metadata: {
                ...response.metadata,
                description: layerDescription,
                source: 'AI Generated',
                query: userMessage
              },
              opacity: 0.8,
            }
          }));
          setMessages((prev) => [...prev, { role: 'assistant', content: '✅ Layer added to map. You can adjust its opacity and visibility in the Active Layers panel.' }]);
        }
      } catch (err) {
        console.error('Chat API error', err);
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry — failed to get a response from the AI service.' }]);
      }
    })();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1001] w-96 h-[500px] bg-background rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-primary-foreground">GEE AI Assistant</h3>
            <p className="text-xs text-primary-foreground/80">Online</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-background/20"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-background/20"
          >
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
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 border border-border"
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick suggestions */}
      <div className="px-4 pb-2 flex gap-2 flex-wrap">
        {suggestions.map((suggestion, i) => (
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

      {/* Input */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about Earth Engine data..."
            className="flex-1 bg-background border-border"
          />
          <Button
            onClick={handleSend}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
