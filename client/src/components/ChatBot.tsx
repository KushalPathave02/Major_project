import React, { useState, useRef, useEffect } from 'react';
import { IconButton, Box, Paper, InputBase, CircularProgress } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';

const botAvatar = (
  <Box sx={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#00ffae)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22 }}>
    <ChatIcon fontSize="medium" />
  </Box>
);

type GeminiChatResponse = {
  text?: string;
  error?: string;
  [key: string]: any;
};

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{from: 'user'|'bot', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { from: 'user', text: input }]);
    setInput('');
    setLoading(true);
    try {
      // Call backend Gemini API
      const API_URL = process.env.REACT_APP_API_URL;
      const res = await fetch(`${API_URL}/gemini-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });
      let data: GeminiChatResponse;
      try {
        data = await res.json();
      } catch (jsonErr) {
        // Try to read as text for debugging
        const text = await res.text();
        console.error('Failed to parse JSON from /api/gemini-chat:', text);
        setMessages(msgs => [...msgs, { from: 'bot', text: 'Error: Received invalid response from server.' }]);
        setLoading(false);
        return;
      }
      if (res.ok && data.text) {
        setMessages(msgs => [...msgs, { from: 'bot', text: data.text ?? '' }]);
      } else {
        setMessages(msgs => [...msgs, { from: 'bot', text: data.error ?? 'No response from Gemini AI.' }]);
      }
      setLoading(false);
    } catch (err) {
      setMessages(msgs => [...msgs, { from: 'bot', text: 'Sorry, something went wrong.' }]);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chatbot Button */}
      <IconButton
        onClick={() => setOpen(o => !o)}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 2000,
          background: 'linear-gradient(135deg,#7c3aed,#00ffae)',
          boxShadow: '0 4px 16px rgba(44,62,80,0.22)',
          color: '#fff',
          width: 64,
          height: 64,
          '&:hover': { background: 'linear-gradient(135deg,#00ffae,#7c3aed)' },
          transition: 'background 0.2s',
        }}
        size="large"
        aria-label="Open Chatbot"
      >
        <ChatIcon sx={{ fontSize: 36 }} />
      </IconButton>
      {/* Chatbot Popup */}
      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 112,
            right: 32,
            zIndex: 2100,
            width: 350,
            maxWidth: '90vw',
            height: 440,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(44,62,80,0.18)',
            background: 'linear-gradient(135deg,#23263a 0%,#181c2a 100%)',
            color: '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, borderBottom: '1px solid #333', fontWeight: 700, fontSize: 18 }}>
            {botAvatar}
            <span style={{ marginLeft: 8 }}>AI Assistant</span>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, background: 'none' }}>
            {messages.length === 0 && (
              <Box sx={{ color: '#b0b8d1', textAlign: 'center', mt: 6 }}>Ask me anything about your analytics!</Box>
            )}
            {messages.map((msg, idx) => (
              <Box key={idx} sx={{ mb: 2, display: 'flex', flexDirection: msg.from === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{
                  px: 2, py: 1.2, borderRadius: 3, maxWidth: '78%',
                  background: msg.from === 'user' ? 'linear-gradient(135deg,#7c3aed,#00ffae)' : '#23263a',
                  color: msg.from === 'user' ? '#fff' : '#b0b8d1',
                  fontWeight: 500,
                  fontSize: 15,
                  boxShadow: msg.from === 'user' ? '0 2px 8px rgba(124,58,237,0.08)' : 'none',
                  wordBreak: 'break-word',
                }}>{msg.text}</Box>
              </Box>
            ))}
            {loading && <Box sx={{ textAlign: 'center', mt: 2 }}><CircularProgress size={22} /></Box>}
            <div ref={chatEndRef} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderTop: '1px solid #333', background: 'none' }}>
            <InputBase
              inputRef={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              sx={{ flex: 1, color: '#fff', fontSize: 15, px: 1.5, background: 'none' }}
              disabled={loading}
            />
            <IconButton onClick={handleSend} disabled={loading || !input.trim()} sx={{ color: '#7c3aed', ml: 1 }}>
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default ChatBot;
