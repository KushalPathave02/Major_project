import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress, Tabs, Tab } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { useCurrency } from '../CurrencyContext';

interface ForecastPoint { month: string; expense: number; }
interface ForecastResponse {
  history: ForecastPoint[];
  forecast: ForecastPoint | null;
  message?: string;
  error?: string;
}

const ForecastCombinedCard: React.FC = () => {
  const [series, setSeries] = useState<Array<ForecastPoint & { type: 'Actual' | 'Forecast' }>>([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState(0); // 0: Line, 1: Bar
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL;
    if (!API_URL) { setInfo('API URL not set'); setLoading(false); return; }
    const run = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/forecast`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const json: ForecastResponse = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Failed to fetch forecast');
        const s: Array<ForecastPoint & { type: 'Actual' | 'Forecast' }> = [];
        (json.history || []).forEach(h => s.push({ ...h, type: 'Actual' }));
        if (json.forecast) s.push({ ...json.forecast, month: `${json.forecast.month} (Forecast)`, type: 'Forecast' });
        setSeries(s);
        setInfo(json.message || null);
      } catch (e: any) { setInfo(e?.message || 'Failed to load forecast'); }
      finally { setLoading(false); }
    };
    run();
  }, []);

  const barData = useMemo(() => {
    const map = new Map<string, { month: string; actual?: number; forecast?: number }>();
    series.forEach(p => {
      if (p.type === 'Actual') {
        map.set(p.month, { month: p.month, actual: p.expense, ...(map.get(p.month) || {}) });
      } else {
        map.set(p.month, { month: p.month, forecast: p.expense, ...(map.get(p.month) || {}) });
      }
    });
    return Array.from(map.values());
  }, [series]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" component="h2">Budget Forecast</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="secondary" indicatorColor="secondary">
            <Tab label="Line" />
            <Tab label="Bar" />
          </Tabs>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={280}>
            <CircularProgress />
          </Box>
        ) : tab === 0 ? (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v).replace(/[^0-9.,-]/g, '')} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Expense']} />
                <Legend />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v).replace(/[^0-9.,-]/g, '')} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number, name: any) => [formatCurrency(v), name === 'actual' ? 'Actual' : 'Forecast']} />
                <Legend />
                <Bar dataKey="actual" name="Actual" fill="#7c3aed" radius={[6,6,0,0]} />
                <Bar dataKey="forecast" name="Forecast" fill="#ff7300" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {info && (
          <Box mt={1}>
            <Typography variant="caption" color="textSecondary">{info}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ForecastCombinedCard;
