import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, CircularProgress, IconButton, Collapse, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Badge
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MarkAsReadIcon from '@mui/icons-material/Done';
import HelpIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';

interface Message {
  _id: string;
  type: 'system' | 'support' | 'broadcast';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const API_URL = process.env.REACT_APP_API_URL;

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [supportDialog, setSupportDialog] = useState(false);
  const [supportTitle, setSupportTitle] = useState('');
  const [supportBody, setSupportBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      setMessages(data);
    } catch {
      setFeedback('Failed to load messages.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line
  }, []);

  const handleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
    // Mark as read if unread
    const msg = messages.find(m => m._id === id);
    if (msg && !msg.read) {
      fetch(`${API_URL}/api/messages/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      }).then(() => fetchMessages());
    }
  };

  const handleSupportSubmit = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_URL}/api/messages/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ title: supportTitle, body: supportBody }),
      });
      if (res.ok) {
        setSupportDialog(false);
        setSupportTitle('');
        setSupportBody('');
        setFeedback('Support request sent!');
        fetchMessages();
      } else {
        setFeedback('Failed to send support request.');
      }
    } catch {
      setFeedback('Failed to send support request.');
    }
    setSubmitting(false);
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 6, p: { xs: 1, sm: 4 }, position: 'relative' }}>
      <IconButton
        aria-label="cancel"
        onClick={() => window.history.back()}
        sx={{ position: 'absolute', top: 10, right: 10, color: '#b0b8d1', zIndex: 2 }}
      >
        <CloseIcon />
      </IconButton>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="#f0f0f0">Messages</Typography>
        <Badge badgeContent={unreadCount} color="secondary" invisible={unreadCount === 0}>
          <HelpIcon sx={{ color: '#a78bfa', fontSize: 32 }} />
        </Badge>
        <Button variant="contained" onClick={() => setSupportDialog(true)} sx={{ ml: 2, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', color: '#fff', fontWeight: 700 }}>New Support Request</Button>
      </Box>
      {feedback && <Box sx={{ mb: 2, color: '#ff1744', fontWeight: 600 }}>{feedback}</Box>}
      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : messages.length === 0 ? (
        <Typography sx={{ color: '#b0b8d1', textAlign: 'center', mt: 4 }}>No messages yet.</Typography>
      ) : (
        messages.map(msg => (
          <Card key={msg._id} sx={{ mb: 3, background: msg.read ? '#23263a' : 'rgba(124,58,237,0.12)', borderRadius: 3, boxShadow: 2 }}>
            <CardContent sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => handleExpand(msg._id)}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color={msg.type === 'broadcast' ? '#7c3aed' : '#a78bfa'}>
                  {msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}
                </Typography>
                <Typography variant="h6" color="#f0f0f0">{msg.title}</Typography>
                <Typography variant="caption" color="#b0b8d1">{new Date(msg.createdAt).toLocaleString()}</Typography>
              </Box>
              <Box>
                {!msg.read && <MarkAsReadIcon sx={{ color: '#16ff7c', mr: 1 }} />}
                <IconButton>{expanded === msg._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
              </Box>
            </CardContent>
            <Collapse in={expanded === msg._id} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, background: '#181a29', borderRadius: 2 }}>
                <Typography sx={{ color: '#f0f0f0' }}>{msg.body}</Typography>
              </Box>
            </Collapse>
          </Card>
        ))
      )}

      {/* Support Request Dialog */}
      <Dialog open={supportDialog} onClose={() => setSupportDialog(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          New Support Request
          <IconButton aria-label="close" onClick={() => setSupportDialog(false)} size="small" sx={{ ml: 2 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={supportTitle}
            onChange={e => setSupportTitle(e.target.value)}
            variant="outlined"
          />
          <TextField
            margin="dense"
            label="Message"
            fullWidth
            multiline
            minRows={3}
            value={supportBody}
            onChange={e => setSupportBody(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupportDialog(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSupportSubmit} disabled={submitting || !supportTitle || !supportBody} sx={{ background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }}>
            {submitting ? <CircularProgress size={20} /> : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Messages;
