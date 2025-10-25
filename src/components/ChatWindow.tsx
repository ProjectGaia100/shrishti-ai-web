import { useState } from "react";
import { X, Minimize2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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

    setMessages([...messages, { role: "user", content: input }]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I understand you're interested in exploring that dataset. Let me help you visualize and analyze the data from Google Earth Engine.",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1001] w-96 h-[500px] glass-strong rounded-2xl shadow-glow-purple border border-border/50 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-blue-purple p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-glow" />
          </div>
          <div>
            <h3 className="font-bold">GEE AI Assistant</h3>
            <p className="text-xs text-foreground/80">Online</p>
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
                    : "glass border border-border/50"
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
      <div className="p-4 border-t border-border/50 glass">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about Earth Engine data..."
            className="flex-1 glass border-border/50"
          />
          <Button
            onClick={handleSend}
            size="sm"
            className="bg-gradient-blue-purple hover:opacity-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
