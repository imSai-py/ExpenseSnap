import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';
import { chatApi, type ChatResponse } from './chatService';
import { useExpenses } from '../../shared/context/ExpenseContext';

interface Message {
    id: string;
    role: 'user' | 'bot';
    text: string;
    expenseAdded?: ChatResponse['expense_added'];
    timestamp: Date;
}

const QUICK_ACTIONS = [
    { label: '💰 This week\'s spending', message: 'How much did I spend this week?' },
    { label: '🏆 Top expenses', message: 'Show me my top 3 expenses this month' },
    { label: '📊 Spending insights', message: 'Give me spending insights' },
];

export function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { refreshData } = useExpenses();

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Add welcome message on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'bot',
                text: "Hey! I'm **SnapBot** 🤖 — your AI finance assistant.\n\nI can help you:\n• Add expenses by just typing (e.g., *\"spent 200 on uber\"*)\n• Answer questions about your spending\n• Give smart financial insights\n\nTry one of the suggestions below or just type away!",
                timestamp: new Date(),
            }]);
        }
    }, [isOpen]);

    const addMessage = (role: 'user' | 'bot', text: string, expenseAdded?: ChatResponse['expense_added']) => {
        const msg: Message = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            role,
            text,
            expenseAdded,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, msg]);
        return msg;
    };

    const handleSend = async (messageText?: string) => {
        const text = (messageText || input).trim();
        if (!text || isLoading) return;

        setInput('');
        addMessage('user', text);
        setIsLoading(true);

        try {
            const response = await chatApi.sendMessage(text);

            if (response.success) {
                addMessage('bot', response.reply, response.expense_added);

                // If an expense was added, refresh the dashboard data
                if (response.expense_added) {
                    refreshData();
                }
            } else {
                addMessage('bot', response.error || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            addMessage('bot', 'Sorry, I couldn\'t connect right now. Please check if the backend is running. 😅');
            console.error('SnapBot error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatMessageText = (text: string) => {
        // Simple markdown-like formatting
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                id="snapbot-toggle"
                onClick={() => setIsOpen(!isOpen)}
                className="fixed right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 md:right-8"
                style={{
                    bottom: 'calc(var(--navbar-height, 70px) + 16px + env(safe-area-inset-bottom, 0px))',
                    background: isOpen
                        ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                        : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label={isOpen ? 'Close SnapBot' : 'Open SnapBot'}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <X size={24} color="white" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="open"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Sparkles size={24} color="white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="snapbot-panel"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border flex flex-col overflow-hidden md:right-8"
                        style={{
                            backgroundColor: 'var(--color-bg-card)',
                            borderColor: 'var(--color-border-light)',
                            bottom: 'calc(var(--navbar-height, 70px) + 16px + 56px + 16px + env(safe-area-inset-bottom, 0px))',
                            height: 'min(520px, calc(100vh - 10rem))',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-5 py-4 shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                    <Sparkles size={18} color="white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-sm">SnapBot</h3>
                                    <p className="text-white/70 text-xs">AI Financial Assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                                aria-label="Close chat"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" id="snapbot-messages">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-indigo-500 text-white rounded-br-md'
                                            : 'rounded-bl-md'
                                            }`}
                                        style={
                                            msg.role === 'user'
                                                ? undefined
                                                : { backgroundColor: 'var(--color-chat-bot-bg)', color: 'var(--color-chat-bot-text)' }
                                        }
                                    >
                                        <div
                                            dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }}
                                        />
                                        {/* Expense Added Card */}
                                        {msg.expenseAdded && (
                                            <div className="mt-2 p-2.5 bg-white/20 rounded-xl border border-white/10 text-xs">
                                                <div className="flex items-center gap-1.5 font-medium mb-1">
                                                    <ArrowUpRight size={12} />
                                                    <span>Added to Dashboard</span>
                                                </div>
                                                <div className="opacity-80">
                                                    {msg.expenseAdded.item_name} — {msg.expenseAdded.currency}{' '}
                                                    {msg.expenseAdded.amount.toLocaleString()} ({msg.expenseAdded.category})
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ backgroundColor: 'var(--color-chat-bot-bg)' }}>
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions — shown only when no user messages yet */}
                        {messages.filter(m => m.role === 'user').length === 0 && (
                            <div className="px-4 pb-2 shrink-0">
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_ACTIONS.map((action) => (
                                        <button
                                            key={action.message}
                                            onClick={() => handleSend(action.message)}
                                            disabled={isLoading}
                                            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: 'var(--color-border-light)' }}>
                            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ backgroundColor: 'var(--color-chat-input-bg)' }}>
                                <input
                                    ref={inputRef}
                                    id="snapbot-input"
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder='Try "spent 200 on uber"...'
                                    disabled={isLoading}
                                    className="flex-1 bg-transparent text-sm placeholder-gray-400 outline-none disabled:opacity-50"
                                    style={{ color: 'var(--color-text-primary)' }}
                                />
                                <button
                                    id="snapbot-send"
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className="p-1.5 rounded-lg bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-600 transition-colors disabled:hover:bg-indigo-500"
                                    aria-label="Send message"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
