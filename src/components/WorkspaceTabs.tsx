import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Benchmarks from "./Benchmarks";
import VideoSimulation from "./VideoSimulation";
import LLMChatbot from "./LLMChatbot";

// Chat state interface for persistence
interface ChatMessage {
  id: number;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface ChatState {
  messages: ChatMessage[];
  contextData: string;
}

interface WorkspaceTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  executionResult: any;
  currentCode: string;
  chatState: ChatState;
  onChatStateChange: (newState: ChatState) => void;
  onResetChat: () => void;
}

const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ 
  activeTab, 
  setActiveTab, 
  executionResult, 
  currentCode, 
  chatState, 
  onChatStateChange, 
  onResetChat 
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
      <div className="p-4 border-b border-white/20 bg-white/80 dark:bg-black/40">
        <TabsList className="flex gap-2 bg-transparent shadow-none border-none p-0">
          <TabsTrigger            value="benchmarks"
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "benchmarks"
                ? "bg-nvidia-green text-white"
                : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-nvidia-green/10 dark:hover:bg-nvidia-green/20"
            }`}
          >
            📊 Benchmarks
          </TabsTrigger>
          <TabsTrigger            value="video"
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "video"
                ? "bg-asu-gold text-black"
                : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-asu-gold/10 dark:hover:bg-asu-gold/20"
            }`}
          >
            🎥 Video
          </TabsTrigger>
          <TabsTrigger
            value="tutor"
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "tutor"
                ? "bg-asu-maroon text-white"
                : "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-asu-maroon/10 dark:hover:bg-asu-maroon/20"
            }`}
          >
            🤖 Tutor
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="benchmarks" className="p-0 h-[550px]">
        <ScrollArea className="h-full p-6">
          <Benchmarks executionResult={executionResult} />
        </ScrollArea>
      </TabsContent>
      <TabsContent value="video" className="p-0 h-[550px]">
        <ScrollArea className="h-full p-6">
          <VideoSimulation executionResult={executionResult} />
        </ScrollArea>
      </TabsContent>      <TabsContent value="tutor" className="p-0 h-[550px]">
        <div className="h-full p-6 flex flex-col">
          <LLMChatbot 
            executionResult={executionResult}
            codeContext={currentCode}
            chatState={chatState}
            onChatStateChange={onChatStateChange}
            onResetChat={onResetChat}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default WorkspaceTabs;