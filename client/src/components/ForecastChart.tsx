import React, { useEffect, useState } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useCurrency } from '../CurrencyContext';

interface ForecastPoint {
  month: string;
  expense: number;
}

interface ForecastResponse {
  history: ForecastPoint[];
  forecast: ForecastPoint | null;
  message?: string;
  error?: string;
}

const ForecastChart: React.FC = () => {
  const [data, setData] = useState<Array<ForecastPoint & { type: 'Actual' | 'Forecast' }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL;
    if (!API_URL) {
      setError('API URL not set');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/forecast`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        const json: ForecastResponse = await res.json();
        if (!res.ok) {
          throw new Error(json.error || json.message || 'Failed to fetch forecast');
        }

        const series: Array<ForecastPoint & { type: 'Actual' | 'Forecast' }> = [];
        (json.history || []).forEach(h => series.push({ ...h, type: 'Actual' }));
        if (json.forecast) {
          series.push({ ...json.forecast, month: `${json.forecast.month} (Forecast)`, type: 'Forecast' });
        }
        setData(series);
        setError(json.message || null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load forecast');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">Budget Forecast (Detailed)</Typography>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={320}>
            <CircularProgress />
          </Box>
        ) : (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v).replace(/[^0-9.,-]/g, '')} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Expense']} labelFormatter={(l) => `Month: ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {error && (
          <Box mt={2}>
            <Typography variant="caption" color="textSecondary">{error}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ForecastChart;
