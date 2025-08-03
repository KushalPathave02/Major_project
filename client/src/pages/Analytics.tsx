import React, { useEffect, useState } from 'react';
import { useCurrency } from '../CurrencyContext';
import DashboardLayout from '../components/DashboardLayout';
import { Box, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import ChatBot from '../components/ChatBot';

// Utility to export a chart as PNG
const exportChart = (id: string) => {
  const svg = document.getElementById(id)?.querySelector('svg');
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new window.Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    const png = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = png;
    a.download = `${id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
};

const COLORS = ['#7c3aed', '#00ffae', '#ff5c8a', '#ffe066', '#3a8dde', '#bda6ff', '#2af598', '#ff1744', '#23263a', '#223b64'];

const Analytics: React.FC = () => {
  const { currency } = useCurrency();
  const formatCurrency = (amount: number) => {
    if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
    if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
    if (currency === 'EUR') return `€${amount.toLocaleString('en-EU')}`;
    return `${amount}`;
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL;
const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      if (!API_URL) {
        setError('API URL not set. Please configure REACT_APP_API_URL in your .env file.');
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/analytics`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        const json = await res.json();
        if (res.ok) setData(json);
        else setError(json.message || 'Failed to fetch analytics');
      } catch (err) {
        setError('Network error');
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (loading) return <DashboardLayout><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /><Typography>Loading analytics...</Typography></Box></DashboardLayout>;
  if (error) return <DashboardLayout><Box sx={{ textAlign: 'center', mt: 8, color: 'error.main' }}>{error}</Box></DashboardLayout>;
  if (!data) return null;

  // Assume backend returns:
  // data.monthlyTrend: [{month, revenue, expense}]
  // data.categoryBreakdown: [{category, amount}]
  // data.topExpenses: [{category, amount}]
  // data.spendChange: {percent, more}

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1080, mx: 'auto', mt: 4, p: 2, position: 'relative' }}>
        <IconButton
          aria-label="cancel"
          onClick={() => window.history.back()}
          sx={{ position: 'absolute', top: 16, right: 16, color: '#b0b8d1', zIndex: 2 }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>📊 Analytics</Typography>
        {/* Monthly Revenue vs Expense Line Chart */}
        <Box sx={{ background: 'rgba(44,62,80,0.17)', borderRadius: 3, p: 3, mb: 4, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Monthly Revenue vs Expense</Typography>
            <Button startIcon={<DownloadIcon />} onClick={() => exportChart('monthly-line')}>Export</Button>
          </Box>
          <div id="monthly-line">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.monthlyTrend} margin={{ top: 12, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23263a" />
                <XAxis dataKey="month" stroke="#b0b8d1" />
                <YAxis stroke="#b0b8d1" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#00ffae" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="expense" stroke="#ff5c8a" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Box>
        {/* Category Breakdown Pie Chart */}
        <Box sx={{ background: 'rgba(44,62,80,0.17)', borderRadius: 3, p: 3, mb: 4, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Category Breakdown</Typography>
            <Button startIcon={<DownloadIcon />} onClick={() => exportChart('category-pie')}>Export</Button>
          </Box>
          <div id="category-pie">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.categoryBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ value }: any) => formatCurrency(value)}>
                  {data.categoryBreakdown.map((entry: any, idx: number) => (
                    <Cell key={entry.category} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Box>
        {/* Top 5 Expense Categories */}
        <Box sx={{ background: 'rgba(44,62,80,0.17)', borderRadius: 3, p: 3, mb: 4, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Top 5 Expense Categories (This Month)</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topExpenses} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23263a" />
              <XAxis dataKey="category" stroke="#b0b8d1" />
              <YAxis stroke="#b0b8d1" />
              <Tooltip />
              <Bar dataKey="amount" fill="#ff5c8a" radius={[8, 8, 0, 0]} label={({ value, x, y, width, height }) => (
  <text
    x={x! + width! / 2}
    y={y! - 8}
    textAnchor="middle"
    fill="#b0b8d1"
    fontSize={14}
    fontWeight={700}
  >
    {formatCurrency(value)}
  </text>
)} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        {/* Spend Insights */}
        <Box sx={{ background: 'rgba(44,62,80,0.17)', borderRadius: 3, p: 3, mb: 4, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>User Spend Insights</Typography>
          {data.spendChange && (
            <Typography>
              {data.spendChange.more
                ? `You spent ${Math.abs(data.spendChange.percent)}% more than last month.`
                : `You spent ${Math.abs(data.spendChange.percent)}% less than last month.`}
            </Typography>
          )}
        </Box>
      </Box>
      <ChatBot />
    </DashboardLayout>
  );
};

export default Analytics;
