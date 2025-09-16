import React, { useEffect, useState } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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

const ForecastBarChart: React.FC = () => {
  const [data, setData] = useState<Array<{ month: string; actual?: number; forecast?: number }>>([]);
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
        if (!res.ok) throw new Error(json.error || json.message || 'Failed to fetch forecast');

        // Build bar series: actual bars per month, plus one forecast bar
        const map = new Map<string, { month: string; actual?: number; forecast?: number }>();
        (json.history || []).forEach(h => {
          map.set(h.month, { month: h.month, actual: h.expense });
        });
        if (json.forecast) {
          const key = `${json.forecast.month} (F)`;
          map.set(key, { month: key, forecast: json.forecast.expense });
        }
        setData(Array.from(map.values()));
        // Do not treat informational messages as errors
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load forecast');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">Budget Forecast (Bar)</Typography>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={260}>
            <CircularProgress />
          </Box>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
        {error && (
          <Box mt={2}>
            <Typography variant="caption" color="error">{error}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ForecastBarChart;
