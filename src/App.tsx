import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  Trash2, 
  PlusCircle, 
  MessageSquare,
  ChevronRight,
  Sparkles,
  Terminal,
  Heart
} from 'lucide-react';

const ButterflyIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 19c0-4.5 3-9 3-9s3 4.5 3 9-3 2-3 2-3-2.5-3-2z" />
    <path d="M12 19c0-4.5-3-9-3-9s-3 4.5-3 9 3 2 3 2 3-2.5 3-2z" />
    <path d="M12 10c0-3 1.5-5 3-5s3 2 3 5-3 2-3 2-3-2-3-2z" />
    <path d="M12 10c0-3-1.5-5-3-5s-3 2-3 5 3 2 3 2 3-2-3-2z" />
    <path d="M12 7v12" />
  </svg>
);

import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { sendMessageStream, Message, AgentConfig, DEFAULT_CONFIG } from './services/geminiService';
import { cn } from './lib/utils';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages');
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', content: input };
    
    // Optimistically update UI
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Save user message to DB
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage),
      });

      const history = messages;
      let assistantContent = '';
      
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      const stream = sendMessageStream(history, input, config);
      
      for await (const chunk of stream) {
        assistantContent += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'model', 
            content: assistantContent 
          };
          return newMessages;
        });
      }

      // Save assistant message to DB after stream completes
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'model', content: assistantContent }),
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error.message || 'An unexpected error occurred.';
      setMessages(prev => [
        ...prev, 
        { role: 'model', content: `**Error:** ${errorMessage}\n\nPlease ensure your API key is correct and you have clicked "Apply changes" in the Secrets panel.` }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch('/api/messages', { method: 'DELETE' });
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-soft-bg font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white border-r border-blush/20 flex flex-col shadow-sm z-10"
      >
        <div className="p-6 border-b border-blush/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-blush rounded-2xl flex items-center justify-center text-white shadow-md">
            <ButterflyIcon size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-800">Nexus AI</h1>
            <p className="text-[10px] text-baby-blue font-bold uppercase tracking-widest">Butterfly Edition</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-blush uppercase tracking-wider px-2">Conversation</label>
            <button 
              onClick={clearChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-blush/5 rounded-xl transition-colors group"
            >
              <Trash2 size={18} className="group-hover:text-pink-400 transition-colors" />
              Clear History
            </button>
            <button 
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-baby-blue/5 rounded-xl transition-colors"
            >
              <PlusCircle size={18} />
              New Session
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-blush/10">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-bold text-blush uppercase tracking-wider">Agent Settings</label>
              <Settings size={14} className="text-blush" />
            </div>
            
            <div className="space-y-4 px-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Agent Name</label>
                <input 
                  type="text" 
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-blush/5 border border-blush/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blush/20 focus:border-blush transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">System Instruction</label>
                <textarea 
                  rows={6}
                  value={config.systemInstruction}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                  className="w-full px-3 py-2 bg-blush/5 border border-blush/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blush/20 focus:border-blush transition-all resize-none"
                  placeholder="Define the agent's behavior..."
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-xs font-semibold text-slate-700">Creativity</label>
                  <span className="text-xs font-mono text-blush">{config.temperature}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-blush"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-blush/10 bg-blush/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-white border border-blush/20 flex items-center justify-center">
              <Heart size={16} className="text-blush" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-slate-700">Nexus User</p>
              <p className="text-[10px] text-baby-blue font-bold truncate">Premium Access</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-white">
        {/* Header */}
        <header className="h-16 border-b border-blush/10 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blush animate-pulse shadow-[0_0_8px_rgba(244,194,194,0.8)]" />
            <h2 className="font-semibold text-slate-700">{config.name} is ready</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-blush/60 hover:text-blush transition-colors">
              <ButterflyIcon size={20} />
            </button>
            <button className="p-2 text-baby-blue/60 hover:text-baby-blue transition-colors">
              <Sparkles size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 lg:px-24 space-y-8">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-blush/10 rounded-3xl flex items-center justify-center text-blush"
              >
                <ButterflyIcon size={48} />
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">Hello, Beautiful</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  I'm your Nexus agent, reimagined in soft blush and baby blue. How can I help you flutter through your tasks today?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {['Write a poem', 'Plan a self-care day', 'Creative ideas', 'Soft coding'].map((suggestion) => (
                  <button 
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-3 text-xs font-bold text-slate-600 bg-white hover:bg-blush/5 rounded-2xl border border-blush/10 transition-all text-left shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={index} 
                className={cn(
                  "flex gap-4 md:gap-6",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-110",
                  message.role === 'user' ? "bg-baby-blue text-white" : "bg-blush text-white"
                )}>
                  {message.role === 'user' ? <User size={18} /> : <ButterflyIcon size={18} />}
                </div>
                <div className={cn(
                  "max-w-[85%] md:max-w-[75%] space-y-2",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-5 py-3.5 rounded-3xl text-sm md:text-base leading-relaxed shadow-sm",
                    message.role === 'user' 
                      ? "bg-baby-blue text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-blush/10 rounded-tl-none"
                  )}>
                    <div className="prose prose-pink max-w-none prose-sm md:prose-base">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                    {message.role === 'user' ? 'You' : config.name}
                  </span>
                </div>
              </motion.div>
            ))
          )}
          {isTyping && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-4 md:gap-6">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-blush/10 flex items-center justify-center shrink-0">
                <ButterflyIcon size={18} className="text-blush animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blush/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-blush/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-blush/30 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-white border-t border-blush/5">
          <div className="max-w-4xl mx-auto relative">
            <div className="relative flex items-end gap-2 bg-soft-bg border border-blush/20 rounded-3xl p-2.5 focus-within:border-blush focus-within:ring-4 focus-within:ring-blush/5 transition-all shadow-inner">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Flutter a message..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base py-3 px-4 resize-none max-h-48 text-slate-700"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={cn(
                  "p-3.5 rounded-2xl transition-all shrink-0",
                  input.trim() && !isTyping 
                    ? "bg-blush text-white hover:bg-pink-300 shadow-lg shadow-blush/20" 
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                )}
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
              Nexus AI • Butterfly Edition • Powered by Gemini
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
