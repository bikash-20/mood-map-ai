// src/components/Chat.tsx
import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { api } from '../lib/axios';
import './Chat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  moodScore?: number;
}

interface ChatReply {
  reply: string;
  mood_score: number;
}

const MAX_MESSAGE_LEN = 2000;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    if (trimmed.length > MAX_MESSAGE_LEN) {
      setError(`Message too long (max ${MAX_MESSAGE_LEN} characters).`);
      return;
    }
    setError(null);
    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const resp = await api.post<ChatReply>('/chat', { message: trimmed });
      const { reply, mood_score } = resp.data;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, moodScore: mood_score },
      ]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error ?? err.message ?? 'Network error';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not reply right now. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-secondaryText mt-12">
            <p className="text-lg">How are you feeling today?</p>
            <p className="text-sm mt-2">Share a thought, and I'll reflect it back as a mood score.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              msg.role === 'assistant'
                ? 'ai-bubble flex flex-col gap-1'
                : 'user-bubble'
            }
          >
            <div>{msg.content}</div>
            {msg.role === 'assistant' && typeof msg.moodScore === 'number' && (
              <div className="text-xs opacity-70 mt-1">mood score: {msg.moodScore}/10</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="ai-bubble">
            <em>Thinking…</em>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mx-4 mb-2 p-2 rounded bg-red-500/20 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="p-4 flex space-x-2">
        <input
          type="text"
          className="flex-1 glass-input"
          placeholder="Type your thoughts…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={loading}
          maxLength={MAX_MESSAGE_LEN}
          aria-label="Message input"
        />
        <button
          className="px-4 py-2 bg-accentPositive text-primaryText rounded-lg shadow-md disabled:opacity-50"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
