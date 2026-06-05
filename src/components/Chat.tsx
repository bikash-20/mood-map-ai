// src/components/Chat.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import './Chat.css'; // optional additional styles

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Optional: fetch a greeting on mount (empty message triggers AI greeting)
  useEffect(() => {
    // In a real app, you would send a special init flag.
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const resp = await axios.post('/api/chat', { message: userMsg.content });
      const data = resp.data; // { mood_score, reply }
      const aiMsg: Message = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const errMsg: Message = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={msg.role === 'assistant' ? 'ai-bubble' : 'user-bubble'}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="ai-bubble">
            <em>Thinking...</em>
          </div>
        )}
      </div>
      <div className="p-4 flex space-x-2">
        <input
          type="text"
          className="flex-1 glass-input"
          placeholder="Type your thoughts..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') sendMessage();
          }}
          disabled={loading}
        />
        <button
          className="px-4 py-2 bg-accentPositive text-primaryText rounded-lg shadow-md"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
