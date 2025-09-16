import React, { useState, useRef, useEffect } from 'react';
import { IconButton, Box, Paper, CircularProgress, Button, Stack } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

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

type AnalyticsResponse = {
  monthlyTrend?: { month: string; revenue: number; expense: number }[];
  categoryBreakdown?: { category: string; amount: number }[];
  topExpenses?: { category: string; amount: number }[];
  spendChange?: { percent: number; more: boolean } | null;
  error?: string;
};

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{from: 'user'|'bot', text: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Show default greeting and suggestions when opened the first time
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ from: 'bot', text: 'Of course. What do you need help with?' }]);
      setSuggestions([
        'How much did I spend this month?',
        'How am I doing on my budget?',
        'Give me a saving tip',
        'Help with the app',
      ]);
    }
  }, [open]);

  const resetToMainSuggestions = () =>
    setSuggestions([
      'How much did I spend this month?',
      'How am I doing on my budget?',
      'Give me a saving tip',
      'Help with the app',
    ]);

  const addBot = (text: string) => setMessages((m) => [...m, { from: 'bot', text }]);
  const addUser = (text: string) => setMessages((m) => [...m, { from: 'user', text }]);

  const handleClear = () => {
    setLoading(false);
    setMessages([{ from: 'bot', text: 'Of course. What do you need help with?' }]);
    resetToMainSuggestions();
    // Scroll to bottom after a short tick
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const fetchAnalytics = async (): Promise<AnalyticsResponse | null> => {
    try {
      const API_URL = process.env.REACT_APP_API_URL;
      if (!API_URL) return null;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/analytics`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const json: AnalyticsResponse = await res.json();
      if (!res.ok) return null;
      return json;
    } catch {
      return null;
    }
  };

  const handleSuggestion = async (label: string) => {
    addUser(label);
    setSuggestions([]);
    setLoading(true);
    try {
      if (label === 'How much did I spend this month?') {
        const data = await fetchAnalytics();
        if (!data || !data.monthlyTrend || data.monthlyTrend.length === 0) {
          addBot('I could not fetch analytics right now. Please try again later.');
        } else {
          const last = data.monthlyTrend[data.monthlyTrend.length - 1];
          const total = last.expense || 0;
          addBot(`You spent ${total.toLocaleString()} this month.`);
        }
        resetToMainSuggestions();
      } else if (label === 'How am I doing on my budget?') {
        const data = await fetchAnalytics();
        if (!data || !data.monthlyTrend || data.monthlyTrend.length === 0) {
          addBot('I could not compute your budget status. Please try again later.');
        } else {
          const last = data.monthlyTrend[data.monthlyTrend.length - 1];
          const diff = (last.revenue || 0) - (last.expense || 0);
          if (diff >= 0) {
            addBot(`You are within budget with a surplus of ${diff.toLocaleString()} this month.`);
          } else {
            addBot(`You are over budget by ${(Math.abs(diff)).toLocaleString()} this month.`);
          }
        }
        resetToMainSuggestions();
      } else if (label === 'Give me a saving tip') {
        // Lightweight static tip rotation
        const tips = [
          'Automate a weekly transfer of 5–10% of income into savings.',
          'Review subscriptions—cancel anything you haven’t used in the last 30 days.',
          'Set category caps (e.g., dining, shopping) and track weekly, not monthly.',
          'Batch errands to cut fuel and impulse purchases.',
        ];
        const pick = tips[Math.floor(Math.random() * tips.length)];
        addBot(pick);
        resetToMainSuggestions();
      } else if (label === 'Help with the app') {
        addBot('Of course. What do you need help with?');
        setSuggestions(['How to add transaction', 'How to view analytics', 'Troubleshooting']);
      } else if (label === 'How to add transaction') {
        addBot("Go to 'Transactions' → Click 'Add' → Enter details → Save.");
        resetToMainSuggestions();
      } else if (label === 'How to view analytics') {
        addBot("Go to 'Dashboard' → Select 'Analytics' → Choose your chart type.");
        resetToMainSuggestions();
      } else if (label === 'Troubleshooting') {
        addBot('Try refreshing the page, checking your network, and re-logging in. If the issue persists, contact support.');
        resetToMainSuggestions();
      } else {
        addBot('Please choose one of the options below.');
        resetToMainSuggestions();
      }
    } finally {
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, borderBottom: '1px solid #333', fontWeight: 700, fontSize: 18, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {botAvatar}
              <span style={{ marginLeft: 8 }}>AI Assistant</span>
            </Box>
            <IconButton aria-label="Clear chat" onClick={handleClear} size="small" sx={{ color: '#b0b8d1' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
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
          {/* Footer suggestions (anchored at bottom) */}
          {suggestions.length > 0 && (
            <Box sx={{ p: 1.5, borderTop: '1px solid #333', background: 'none' }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    variant="outlined"
                    size="small"
                    onClick={() => handleSuggestion(s)}
                    sx={{
                      color: '#b0b8d1',
                      borderColor: '#3a3f55',
                      borderRadius: 999,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { borderColor: '#7c3aed', background: 'rgba(124,58,237,0.08)' },
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
};

export default ChatBot;
