import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Typography, Button, TextField } from '@mui/material';

import DashboardLayout from '../components/DashboardLayout';

const API_URL = process.env.REACT_APP_API_URL;

const UploadTransactions: React.FC = () => {
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setJsonText(evt.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleRemove = () => {
    setJsonText('');
    setStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    let transactions;
    try {
      transactions = JSON.parse(jsonText);
    } catch {
      setStatus('Invalid JSON');
      setLoading(false);
      return;
    }
    // Accepts either an array or an object with a transactions array
    const body = Array.isArray(transactions)
      ? transactions
      : transactions.transactions;
    if (!Array.isArray(body)) {
      setStatus('JSON must be an array or contain a transactions array');
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/transactions/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('Upload successful! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        setStatus(data.message || 'Upload failed');
      }
    } catch (err) {
      setStatus('Network error');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <Box maxWidth={900} mx="auto" mt={4} bgcolor="#23263a" borderRadius={4} p={4}>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={() => navigate(-1)}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ ml: 1 }}>
            Upload Transactions
          </Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <Box mb={2}>
            <Button variant="contained" component="label">
              Choose JSON File
              <input type="file" accept=".json" hidden onChange={handleFileChange} />
            </Button>
            {jsonText && (
              <Button onClick={handleRemove} sx={{ ml: 2 }} color="secondary">Remove</Button>
            )}
          </Box>
          <TextField
            label="Paste JSON here"
            multiline
            minRows={6}
            fullWidth
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Box sx={{ position: 'sticky', bottom: 0, left: 0, bgcolor: '#23263a', pt: 2, pb: 2, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
            {status && (
              <Typography color={status.includes('success') ? 'green' : 'error'} sx={{ mt: 2 }}>
                {status}
              </Typography>
            )}
          </Box>
        </form>
      </Box>
    </DashboardLayout>
  );
};

export default UploadTransactions;
