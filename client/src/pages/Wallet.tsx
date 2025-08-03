import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Paper, Divider, List, ListItem, ListItemText, CircularProgress, Alert, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardLayout from '../components/DashboardLayout';

const API_URL = process.env.REACT_APP_API_URL;
const Wallet: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    if (!API_URL) {
      setError('API URL not set. Please configure REACT_APP_API_URL in your .env file.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/wallet/${userId}/balance`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      setBalance(data.walletBalance);
    } catch {
      setError('Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!API_URL) {
      setError('API URL not set. Please configure REACT_APP_API_URL in your .env file.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/wallet/${userId}/history`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      setHistory(data.transactions || []);
    } catch {
      setError('Failed to fetch history');
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchHistory();
    // eslint-disable-next-line
  }, []);

  const handleAction = async (type: 'add' | 'withdraw') => {
    const API_URL = process.env.REACT_APP_API_URL;
    setError(null);
    setSuccess(null);
    setLoading(true);
    if (!API_URL) {
      setError('API URL not set. Please configure REACT_APP_API_URL in your .env file.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/wallet/${userId}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ amount: Number(amount) })
      });
      const data = await res.json();
      if (res.ok) {
        setBalance(data.walletBalance);
        setSuccess(type === 'add' ? 'Money added!' : 'Money withdrawn!');
        fetchHistory();
      } else {
        setError(data.error || 'Action failed');
      }
    } catch {
      setError('Action failed');
    } finally {
      setLoading(false);
      setAmount('');
    }
  };

  return (
    <DashboardLayout>
      <Box maxWidth={900} mx="auto" mt={4} bgcolor="#23263a" borderRadius={4} p={4} sx={{ position: 'relative' }}>
        <IconButton
          aria-label="cancel"
          onClick={() => window.history.back()}
          sx={{ position: 'absolute', top: 16, right: 16, color: '#b0b8d1', zIndex: 2 }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700} gutterBottom color="#fff">
          Wallet
        </Typography>
        <Divider sx={{ mb: 2, bgcolor: '#444' }} />
        {loading && <CircularProgress size={24} sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Typography variant="h6" sx={{ mb: 2 }} color="#fff">
          Balance: ₹{balance !== null ? balance.toFixed(2) : '--'}
        </Typography>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            size="small"
          />
          <Button
            variant="contained"
            color="primary"
            disabled={loading || !amount}
            onClick={() => handleAction('add')}
          >
            Add
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            disabled={loading || !amount}
            onClick={() => handleAction('withdraw')}
          >
            Withdraw
          </Button>
        </Box>
        <Divider sx={{ my: 2, bgcolor: '#444' }} />
        <Typography variant="subtitle1" fontWeight={700} gutterBottom color="#fff">
          Transaction History
        </Typography>
        <List>
          {history.length === 0 && (
            <ListItem>
              <ListItemText primary="No wallet transactions yet." />
            </ListItem>
          )}
          {history.map((tx, idx) => (
            <ListItem key={tx._id || idx}>
              <ListItemText
                primary={`${tx.category}: ₹${tx.amount}`}
                secondary={new Date(tx.date).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </DashboardLayout>
  );
};

export default Wallet;
