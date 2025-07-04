
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Sparkles } from 'lucide-react';
import LLMChatbot from './LLMChatbot';

const ChatbotBubble = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] z-50 glass-card bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
          <LLMChatbot />
        </div>
      )}

      {/* Floating Bubble Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-2xl z-50 p-0 border-4 border-white/50 hover:scale-110 transition-all duration-300 pulse-glow"
      >
        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-7 h-7 text-white" />
            <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
        )}
      </Button>
    </>
  );
};

export default ChatbotBubble;
