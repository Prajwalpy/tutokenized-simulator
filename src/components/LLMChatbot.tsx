import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, RotateCcw, Paperclip } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface ChatState {
  messages: Message[];
  contextData: string;
}

interface LLMChatbotProps {
  executionResult?: any;
  codeContext?: string;
  chatState?: ChatState;
  onChatStateChange?: (newState: ChatState) => void;
  onResetChat?: () => void;
}

const LLMChatbot: React.FC<LLMChatbotProps> = ({ 
  executionResult, 
  codeContext, 
  chatState, 
  onChatStateChange, 
  onResetChat 
}) => {
  // Use persistent state if provided, otherwise fall back to local state
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localContextData, setLocalContextData] = useState<string>("");
  
  const messages = chatState?.messages || localMessages;
  const contextData = chatState?.contextData || localContextData;
  
  const updateChatState = (newMessages: Message[], newContextData: string) => {
    if (onChatStateChange) {
      onChatStateChange({
        messages: newMessages,
        contextData: newContextData
      });
    } else {
      setLocalMessages(newMessages);
      setLocalContextData(newContextData);
    }
  };

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBotMessage, setPendingBotMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Update context when execution result changes
  useEffect(() => {
    if (executionResult) {
      const contextInfo = `
## Recent Code Execution Context:
**Execution Status:** ${executionResult.success ? '✅ Success' : '❌ Failed'}
**Execution Time:** ${executionResult.execution_time?.toFixed(2) || 'N/A'}s
**Timestamp:** ${new Date(executionResult.timestamp).toLocaleString()}
**Executor:** ${executionResult.executor_type || 'Unknown'}

**Code Executed:**
\`\`\`python
${executionResult.code || 'No code available'}
\`\`\`

**Output:**
\`\`\`
${executionResult.output || 'No output'}
\`\`\`

${executionResult.error ? `**Error:**
\`\`\`
${executionResult.error}
\`\`\`` : ''}

${executionResult.system_metrics ? `**System Metrics:**
- CPU Usage: ${executionResult.system_metrics.cpu_percent || 'N/A'}%
- Memory Usage: ${executionResult.system_metrics.memory_percent || 'N/A'}%
- GPU Utilization: ${executionResult.system_metrics.gpu_utilization || 'N/A'}%` : ''}

${executionResult.benchmarks ? `**Benchmarks:**
- Matrix Multiplication: ${executionResult.benchmarks.matrix_multiplication?.time || 'N/A'}s (Score: ${executionResult.benchmarks.matrix_multiplication?.score || 'N/A'})
- Memory Access: ${executionResult.benchmarks.memory_access?.time || 'N/A'}s (Score: ${executionResult.benchmarks.memory_access?.score || 'N/A'})
- CPU Intensive: ${executionResult.benchmarks.cpu_intensive?.time || 'N/A'}s (Score: ${executionResult.benchmarks.cpu_intensive?.score || 'N/A'})` : ''}
      `;
        updateChatState(messages, contextInfo);
      
      // Only auto-update if there are less than 2 messages (to avoid spam in active conversations)
      if (messages.length < 2 && (executionResult.success || executionResult.error)) {
        const autoMessage = `I just executed some code. ${executionResult.success ? 'It ran successfully!' : 'It encountered an error.'} Can you help me understand the results and suggest improvements?`;
        setTimeout(() => handleAutoContextUpdate(autoMessage, contextInfo), 1000); // Delay to avoid race conditions
      }
    }
  }, [executionResult, messages.length]);

  // Update context with code from editor
  useEffect(() => {
    if (codeContext) {
      const editorContext = `
## Current Code in Editor:
\`\`\`python
${codeContext}
\`\`\`
      `;
      updateChatState(messages, contextData + editorContext);
    }
  }, [codeContext]);// Auto-scroll chat to bottom when messages or loading changes
  useEffect(() => {
    if (messagesEndRef.current) {
      // Find the scrollable chat container more reliably
      let chatContainer = messagesEndRef.current.parentElement;
      
      // Walk up the DOM tree to find the scrollable container
      while (chatContainer) {
        const computedStyle = window.getComputedStyle(chatContainer);
        if (computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll') {
          // Found the scrollable container, scroll to bottom
          chatContainer.scrollTop = chatContainer.scrollHeight;
          return;
        }
        chatContainer = chatContainer.parentElement;
      }
      
      // If no scrollable container found, try the fallback
      const parent = messagesEndRef.current.parentElement;
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [messages, isLoading, pendingBotMessage]);

  // Auto-resize textarea and scroll to caret
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px"; // 5 lines max (approx 120px)
      inputRef.current.scrollTop = inputRef.current.scrollHeight;
    }
  }, [inputMessage]);

  const API_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0X2lkIjoiNmNhMGI4NjlhYTJkNDY2MmJiMWYxZWM2NDJkMzljZjQiLCJzZXJ2aWNlX2FwcCI6ImtlLXNvbF9oYWNrYXRob25fMTciLCJrZXlfaWQiOiI4NWM4ZWFiMi0zYzQ1LTRiOTItYmZhNy05NzJlNTllNjI0ODAiLCJ0eXBlIjoic2VydmljZSIsImFwaSI6Im1haW4iLCJpYXQiOjE3NTA2MzYxMDEsImlzcyI6ImFkbWluLWJldGEifQ.yf2H-jZxX1zWOpl-a33j6bY8u7ojr9DCXs4V7S1tmek";
  const sendApiQuery = async (query: string, includeContext: boolean = true): Promise<string> => {
    // Enhance the query with context if available
    const enhancedQuery = includeContext && contextData ? 
      `${contextData}\n\n## User Question:\n${query}` : 
      query;

    const body = {
      query: enhancedQuery,
      endpoint: "queryV2",
      model_provider: "openai",
      model_name: "gpt4o",
      model_params: {
        temperature: 0.5,
        max_tokens: 2000,
        top_p: 0.9,
        top_k: 3,
      },
      enable_search: false,
      enable_history: true,
      semantic_caching: false,
      response_format: { type: "text" },
      enhance_prompt: {
        timezone: "MST",
        time: false,
        date: false,
        verbosity: "none",
      },
    };

    try {
      const res = await fetch("https://api-main-beta.aiml.asu.edu/query", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("API error");
      }
      const data = await res.json();
      // Only return the 'response' field as markdown
      return data.response || "No response from model.";
    } catch (err) {
      return "Sorry, there was an error fetching the response.";
    }
  };

  // Handle automatic context updates
  const handleAutoContextUpdate = async (message: string, context: string) => {
    // Only send automatic updates if there are no pending messages to avoid spam
    if (isLoading || pendingBotMessage) return;

    // Add system message
    const systemMessage: Message = {
      id: Date.now(),
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    updateChatState([...messages, systemMessage], contextData);
    setIsLoading(true);

    try {
      const botReply = await sendApiQuery(message, true);
      await animateBotMessage(botReply);
    } catch (error) {
      console.error('Auto context update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Typing animation for bot response (word by word)
  const animateBotMessage = async (fullText: string) => {
    setPendingBotMessage("");
    setIsLoading(true);
    const words = fullText.split(" ");
    let current = "";
    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? "" : " ") + words[i];
      setPendingBotMessage(current);
      await new Promise((res) => setTimeout(res, 30)); // 30ms per word
    }    setPendingBotMessage("");
    updateChatState([
      ...messages,
      {
        id: Date.now() + 1,
        type: "bot",
        content: fullText,
        timestamp: new Date(),
      },
    ], contextData);
    setIsLoading(false);  };

  // Manual context attachment function
  const handleAttachContext = () => {
    let manualContext = '';
    
    // Add current code context if available
    if (codeContext) {
      manualContext += `
## Current Code in Editor:
\`\`\`python
${codeContext}
\`\`\`
`;
    }
    
    // Add execution result context if available
    if (executionResult) {
      manualContext += `
## Latest Execution Results:
**Status:** ${executionResult.success ? '✅ Success' : '❌ Failed'}
**Execution Time:** ${executionResult.execution_time?.toFixed(2) || 'N/A'}s
**Timestamp:** ${new Date(executionResult.timestamp).toLocaleString()}
**Executor:** ${executionResult.executor_type || 'Unknown'}

**Output:**
\`\`\`
${executionResult.output || 'No output'}
\`\`\`

${executionResult.error ? `**Error:**
\`\`\`
${executionResult.error}
\`\`\`` : ''}

${executionResult.system_metrics ? `**System Metrics:**
- CPU Usage: ${executionResult.system_metrics.cpu_percent || 'N/A'}%
- Memory Usage: ${executionResult.system_metrics.memory_percent || 'N/A'}%
- GPU Utilization: ${executionResult.system_metrics.gpu_utilization || 'N/A'}%` : ''}

${executionResult.benchmarks ? `**Performance Benchmarks:**
- Matrix Multiplication: ${executionResult.benchmarks.matrix_multiplication?.time || 'N/A'}s (Score: ${executionResult.benchmarks.matrix_multiplication?.score || 'N/A'})
- Memory Access: ${executionResult.benchmarks.memory_access?.time || 'N/A'}s (Score: ${executionResult.benchmarks.memory_access?.score || 'N/A'})
- CPU Intensive: ${executionResult.benchmarks.cpu_intensive?.time || 'N/A'}s (Score: ${executionResult.benchmarks.cpu_intensive?.score || 'N/A'})` : ''}
`;
    }

    // Update context with manually attached context
    updateChatState(messages, contextData + manualContext);
    
    // Show a visual confirmation that context was attached
    if (manualContext.trim()) {
      const contextMessage: Message = {
        id: Date.now(),
        type: "user",
        content: "📎 Context attached (Code + Execution Results)",
        timestamp: new Date(),
      };
      updateChatState([...messages, contextMessage], contextData + manualContext);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };
    updateChatState([...messages, userMessage], contextData);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Send query with context if available
      const botReply = await sendApiQuery(userMessage.content, true);
      await animateBotMessage(botReply);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full shadow-lg flex flex-col">      <CardHeader className="bg-asu-maroon-dark text-white rounded-t-lg flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          SparkyGPT
          <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
            {isLoading ? "Thinking..." : "Online"}
          </Badge>
          {contextData && (
            <Badge variant="secondary" className="bg-green-500/20 text-white border-green-300">
              Context Active
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onResetChat) {
                onResetChat();
              } else {
                updateChatState([], "");
              }
            }}
            className="text-white hover:bg-white/20 p-1 h-8 w-8"
            title="Reset Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Fixed height, scrollable chat area */}
        <div
          className="flex-1"
          style={{
            maxHeight: 400,
            minHeight: 200,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "1rem",
          }}
        >
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === "user"
                      ? "bg-asu-maroon text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {message.type === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                <div
                  className={`flex-1 max-w-[80%] ${
                    message.type === "user" ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.type === "user"
                        ? "bg-asu-maroon text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                    style={{
                      wordBreak: "break-word",
                      overflowX: "auto",
                      maxWidth: "100%",
                    }}
                  >
                    <div
                      className="text-sm leading-relaxed break-words"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        overflowX: "auto",
                        maxWidth: "100%",
                      }}
                    >
                      {message.type === "bot" ? (
                        <ReactMarkdown
                          components={{
                            code({ inline, className, children, ...props }: any) {
                              return (
                                <code
                                  className={`bg-gray-200 px-1 py-0.5 rounded text-xs font-mono ${className || ""}`}
                                  style={{
                                    wordBreak: "break-word",
                                    overflowX: "auto",
                                    display: inline ? "inline" : "block",
                                  }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {/* Typing animation for bot */}
            {pendingBotMessage && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 max-w-[80%]">
                  <div className="inline-block p-3 rounded-lg bg-gray-100 text-gray-800 rounded-bl-sm">
                    <div
                      className="text-sm"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        overflowX: "auto",
                        maxWidth: "100%",
                      }}
                    >
                      <ReactMarkdown>{pendingBotMessage}</ReactMarkdown>
                      <span className="animate-pulse">|</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isLoading && !pendingBotMessage && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 max-w-[80%]">
                  <div className="inline-block p-3 rounded-lg bg-gray-100 text-gray-800 rounded-bl-sm">
                    <div className="text-sm">Thinking...</div>
                  </div>
                </div>
              </div>
            )}
            {/* This div is used for scrolling to bottom */}
            <div ref={messagesEndRef} />
          </div>
        </div>        {/* Input area */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Button
              onClick={handleAttachContext}
              variant="outline"
              size="icon"
              disabled={isLoading || (!codeContext && !executionResult)}
              title="Attach current code and execution results as context"
              className="flex-shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about GPU programming..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 resize-none rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-asu-maroon disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isLoading}
              rows={1}
              style={{
                maxHeight: 120,
                minHeight: 40,
                overflowY: "auto",
              }}
            />
            <Button
              onClick={handleSendMessage}
              className="bg-asu-maroon hover:bg-asu-maroon-dark"
              size="icon"
              disabled={isLoading || !inputMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-gray-50"
              onClick={() => setInputMessage("Explain the CUDA programming model and its benefits for parallel computing.")}
            >
              CUDA basics
            </Badge>
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-gray-50"
              onClick={() => setInputMessage("How can I optimize memory usage in GPU programming?")}
            >
              Memory optimization
            </Badge>
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-gray-50"
              onClick={() => setInputMessage("What are best practices for GPU performance tuning?")}
            >
              Performance tuning
            </Badge>
            {(codeContext || executionResult) && (
              <Badge
                variant="outline"
                className="text-xs cursor-pointer hover:bg-blue-50 border-blue-300 text-blue-700"
                onClick={handleAttachContext}
              >
                📎 Attach Context
              </Badge>
            )}
            {contextData && (
              <Badge
                variant="outline"
                className="text-xs cursor-pointer hover:bg-green-50 border-green-300 text-green-700"
                onClick={() => setInputMessage("Analyze my recent code execution and suggest improvements.")}
              >
                📊 Analyze Results
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LLMChatbot;