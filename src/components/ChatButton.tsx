import { useState } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./ChatWindow";

export const ChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[1001] w-14 h-14 rounded-full bg-gradient-blue-purple shadow-glow hover:shadow-glow-purple transition-smooth hover:scale-110 p-0"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background" />
          </div>
        </Button>
      )}

      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
    </>
  );
};
