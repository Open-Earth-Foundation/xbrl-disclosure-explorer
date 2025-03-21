import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "./ui/card";
import LoadingDots from "./LoadingDots";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from "../hooks/use-toast";
import { getUserId } from '@/user-id';
import { Send } from "lucide-react";
import { Button } from "./ui/button";


interface Message {
  text: string;
  isUser: boolean;
}

// 1) Ensure we pick up the WS origin from config or default
const WS_ORIGIN = globalThis.config?.BACKEND_WS_ORIGIN || 'ws://localhost:8000';
const API_BASE_URL =
  globalThis?.config?.VITE_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [usingPreloaded, setUsingPreloaded] = useState(false);
  const { toast } = useToast();

  // 2) On mount, connect to WebSocket
  useEffect(() => {
    let userId = getUserId()
    const websocket = new WebSocket(`${WS_ORIGIN}/ws?user_id=${userId}`);

    websocket.onopen = () => {
      console.log('Connected to WebSocket');
    };

    websocket.onmessage = (event) => {
      setIsLoading(false);
      const message = event.data;
      let data: any = null;
      try {
        data = JSON.parse(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
        return;
      }
      switch (data.type) {
        case 'message':
          setMessages(prev => [...prev, { text: data.message, isUser: false }]);
          break;
        case 'user_id':
          localStorage.setItem('userId', data.user_id);
          break;
        case 'personal_message':
          toast({
            title: "Personal message from server",
            description: data.message,
            duration: 3000,
          });
          break;
        case 'error':
          console.error('Server error:', data.error);
          toast({
            title: "Server error",
            description: data.error,
            variant: "destructive",
          });
          break;
        default:
          console.error('Invalid message type:', data.type);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    // Clean up on unmount
    return () => {
      websocket.close();
    };
  }, [toast]);

  // 3) Function to send user message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws) return;

    setIsLoading(true);
    console.log('Sending message:', input);

    // 4) *** Include enhancedContext in the message payload ***
    ws.send(JSON.stringify({
      message: input,
    }));

    // Show user's own message in the UI
    setMessages(prev => [...prev, { text: input, isUser: true }]);
    setInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0]);
  };

  const handleJsonUpload = async (file: File) => {
    // Implement JSON upload logic here
    console.log("JSON file uploaded:", file);
    // ... (Add your backend interaction here) ...
  };


  // Keep scrolled to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5) Add a function to switch to preloaded
  async function switchToPreloaded() {
    const userId = getUserId()
    if (!userId) {
      console.error("No userId found in localStorage");
      return;
    }
    const formData = new FormData();
    formData.append('websocket_user_id', userId);
    formData.append('new_mode', 'preloaded');

    try {
      const resp = await fetch(API_BASE_URL + '/switch_mode', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Could not switch mode');
      }
      setUsingPreloaded(true);
      console.log("Switched to preloaded mode");
      toast({
        title: "Mode Switch",
        description: "Now using Preloaded Assistant"
      });
    } catch (err) {
      console.error("Failed to switch mode:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive"
      });
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Chat</h2>
          <div>
            {usingPreloaded || selectedFile ? (
              <p>Using: {usingPreloaded ? 'Preloaded Mockup File' : selectedFile?.name}</p>
            ) : null}
          </div>
        </div>

        <div className="h-[400px] overflow-y-auto mb-4 p-4 border rounded-lg">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                "mb-2 p-2 rounded-lg " +
                (message.isUser
                  ? "bg-blue-100 ml-auto max-w-[80%]"
                  : "bg-gray-100 mr-auto max-w-[80%]")
              }
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md my-2"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className={
                          inline
                            ? "bg-opacity-20 bg-gray-500 rounded px-1"
                            : "block bg-opacity-10 bg-gray-500 p-2 rounded-lg my-2"
                        }
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  a: ({ node, ...props }) => (
                    <a
                      className="text-blue-500 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc ml-4 my-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal ml-4 my-2" {...props} />
                  ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>

        {/* 7) The message input */}
        <div className="flex flex-wrap gap-2 mb-3 mt-2">
          <button onClick={() => setInput("What are the key climate targets in this ESRS filing?")} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">What are the key climate targets in this filing?</button>
          <button onClick={() => setInput("Explain ESRS E1 section and its requirements")} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">Explain ESRS E1 section and its requirements</button>
          <button onClick={() => setInput("Compare this company's social impact disclosures with industry standards")} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">Compare this company's social impact disclosures with industry standards</button>
          <button onClick={() => setInput("Summarize governance practices disclosed in this filing")} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors">Summarize governance practices disclosed in this filing</button>
        </div>

        <form onSubmit={sendMessage} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Type your message..."
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
            className="ml-2 bg-blue-700 hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}