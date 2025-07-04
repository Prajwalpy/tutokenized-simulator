
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WorkingCodeEditor from '../components/WorkingCodeEditor';
import WorkspaceTabs from '../components/WorkspaceTabs';
import StatusBar from '../components/StatusBar';

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

const Index = () => {
  console.log('Index page rendering...');
  
  const [activeTab, setActiveTab] = useState('benchmarks');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [currentCode, setCurrentCode] = useState<string>('');
  
  // Persistent chat state - this will survive tab switches
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    contextData: ""
  });

  const handleExecutionResult = (result: any) => {
    console.log('Handling execution result:', result);
    setExecutionResult(result);
    // Update current code from execution result
    if (result.code) {
      setCurrentCode(result.code);
    }
    // Automatically switch to video tab when code is executed
    setActiveTab('video');
  };

  const handleCodeChange = (code: string) => {
    setCurrentCode(code);
  };

  const handleChatStateChange = (newState: ChatState) => {
    setChatState(newState);
  };

  const resetChat = () => {
    setChatState({
      messages: [],
      contextData: ""
    });
  };

  console.log('Index page about to render JSX...');
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-yellow-100/40 to-red-900/10 flex flex-col font-inter">
      <Header />
      <main className="flex-1 flex gap-8 p-8">{/* Left Panel - Code Editor */}
        <div className="w-1/3 hover-lift">
          <WorkingCodeEditor 
            onExecutionResult={handleExecutionResult}
            onCodeChange={handleCodeChange}
          />
        </div>
          {/* Center Workspace */}
        <div className="flex-1 hover-lift">
          <WorkspaceTabs 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            executionResult={executionResult}
            currentCode={currentCode}
            chatState={chatState}
            onChatStateChange={handleChatStateChange}
            onResetChat={resetChat}
          />
        </div>
      </main>
        <StatusBar />
      <Footer />
    </div>
  );
};

export default Index;
