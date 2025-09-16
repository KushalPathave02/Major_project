import React, { useEffect, useState } from 'react';
import { useCurrency } from '../CurrencyContext';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import LineChartInfographic from '../components/LineChartInfographic';

import { TextField, MenuItem, IconButton, Button, Menu, MenuItem as MuiMenuItem, ToggleButtonGroup, ToggleButton, Grid } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import ForecastBarChart from '../components/ForecastBarChart';

interface Transaction {
  _id: string;
  date: string;
  amount: number;
  category: string;
  status: string;
  [key: string]: any;
}

const Dashboard: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const theme = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, savings: 0, balance: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');

  const [page, setPage] = useState(1);
  const rowsPerPage = 8;
  const [sortBy, setSortBy] = useState<'date'|'amount'|'category'|'status'>('date');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  // Currency formatting comes from CurrencyContext and includes conversion.
  // --- Graph Filter State ---
  const [graphFilterAnchor, setGraphFilterAnchor] = useState<null | HTMLElement>(null);
  const [graphCategoryFilter, setGraphCategoryFilter] = useState('');
  const [graphStatusFilter, setGraphStatusFilter] = useState('');
  const [graphFilterType, setGraphFilterType] = useState<'all' | 'category' | 'status'>('all');
  // Define interface for line chart data
  interface LineChartData {
    month: string;
    revenue: number;
    expenses: number;
  }

  const [monthlyLineData, setMonthlyLineData] = useState<LineChartData[]>([]);

    useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL;
    const fetchSummary = async () => {
      if (!API_URL) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/dashboard/summary`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        const data = await res.json();
        if (res.ok) {
          setSummary(data);
        }
      } catch (err) {
        console.error('Failed to fetch summary');
      }
    };

        fetchSummary();
  }, []);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL;
    const fetchLineChartData = async () => {
      if (!API_URL) return;
      const params = new URLSearchParams();
      if (graphCategoryFilter) params.append('category', graphCategoryFilter);
      if (graphStatusFilter) params.append('status', graphStatusFilter);

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/dashboard/line-chart?${params.toString()}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        const data = await res.json();
        if (res.ok) {
          setMonthlyLineData(data);
        }
      } catch (err) {
        console.error('Failed to fetch line chart data');
      }
    };

    fetchLineChartData();
  }, [graphCategoryFilter, graphStatusFilter]);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL;
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      if (!API_URL) {
        setError('API URL not set. Please configure REACT_APP_API_URL in your .env file.');
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/transactions?page=1&pageSize=10000`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.transactions)) {
          // Normalize Mongo Extended JSON to plain JS values
          const normalized = data.transactions.map((t: any) => {
            const id = t._id?.$oid ?? t._id ?? undefined;
            const dateVal = t.date?.$date ?? t.date ?? null;
            const amountNum = typeof t.amount === 'number' ? t.amount : Number(t.amount ?? 0);
            return {
              ...t,
              _id: id,
              date: dateVal,
              amount: isNaN(amountNum) ? 0 : amountNum,
              category: t.category ?? 'other',
              status: t.status ?? 'completed',
            } as any;
          });
          setTransactions(normalized);
        } else {
          setError(data.message || 'Failed to fetch transactions');
        }
      } catch (err) {
        setError('Network error');
      }
      setLoading(false);
    };
    fetchTransactions();
  }, []);

  // Generate line chart data from filtered transactions
  useEffect(() => {
    const expenseCategories = new Set([
      'rent', 'bills', 'groceries', 'travel', 'others', 'shopping', 'food',
      'utilities', 'transport', 'medical', 'entertainment', 'subscriptions',
      'education', 'emi', 'loan', 'insurance', 'tax', 'fuel', 'misc', 'expense'
    ]);

    const byMonth: Record<string, { revenue: number; expenses: number }> = {};
    const monthLabel = (d: Date) => {
      const months = [ '', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec' ];
      return `${months[d.getMonth()+1]} ${d.getFullYear()}`;
    };

    // Apply graph filters to transactions
    const filtered = transactions.filter(t => {
      const matchesCategory = !graphCategoryFilter || t.category === graphCategoryFilter;
      const matchesStatus = !graphStatusFilter || t.status === graphStatusFilter;
      return matchesCategory && matchesStatus;
    });

    for (const t of filtered) {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()+1}`;
      if (!byMonth[key]) byMonth[key] = { revenue: 0, expenses: 0 };
      if (expenseCategories.has((t.category || '').toLowerCase())) {
        byMonth[key].expenses += t.amount || 0;
      } else {
        byMonth[key].revenue += t.amount || 0;
      }
    }

    const entries = Object.keys(byMonth)
      .map(k => {
        const [y, m] = k.split('-').map(Number);
        const d = new Date(y, (m||1)-1, 1);
        return { 
          key: k, 
          d, 
          month: monthLabel(d), 
          revenue: byMonth[k].revenue, 
          expenses: Math.abs(byMonth[k].expenses) // Make expenses positive for the chart
        };
      })
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .map(({ month, revenue, expenses }) => ({ month, revenue, expenses }));

    // Cast the entries to LineChartData[] to ensure type safety
    const lineChartData: LineChartData[] = entries.length > 0 
      ? entries 
      : [{ month: 'No Data', revenue: 0, expenses: 0 }];
    
    setMonthlyLineData(lineChartData);
  }, [transactions, graphCategoryFilter, graphStatusFilter]);

  

  // Apply graph filters to transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesCategory = !graphCategoryFilter || t.category === graphCategoryFilter;
    const matchesStatus = !graphStatusFilter || t.status === graphStatusFilter;
    return matchesCategory && matchesStatus;
  });

  // Category totals for chart based on filtered transactions
  const categoryTotals = Object.values(filteredTransactions.reduce((acc, t) => {
    const cat = t.category || 'Other';
    acc[cat] = acc[cat] || 0;
    acc[cat] += t.amount || 0;
    return acc;
  }, {} as Record<string, number>)).length > 0
    ? Object.entries(filteredTransactions.reduce((acc, t) => {
        const cat = t.category || 'Other';
        acc[cat] = acc[cat] || 0;
        acc[cat] += t.amount || 0;
        return acc;
      }, {} as Record<string, number>)).map(([category, amount]) => ({ category, amount }))
    : [];

  // Pie chart data for income/expenses based on filtered data
  const pieData = [
    { 
      name: 'Revenue', 
      value: filteredTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + (t.amount || 0), 0) 
    },
    { 
      name: 'Expenses', 
      value: Math.abs(filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + (t.amount || 0), 0))
    }
  ];
  const pieColors = ['#7c3aed', '#ff5c8a'];

  // Filters
  const categories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean);
  const statuses = Array.from(new Set(transactions.map(t => t.status))).filter(Boolean);

  // Filtered, searched, sorted, paginated data
  let filtered = transactions.filter(t =>
    (!categoryFilter || t.category === categoryFilter) &&
    (!statusFilter || t.status === statusFilter) &&
    (!search || t.category?.toLowerCase().includes(search.toLowerCase()) || t.status?.toLowerCase().includes(search.toLowerCase())) &&
    (!dateFrom || new Date(t.date) >= new Date(dateFrom)) &&
    (!dateTo || new Date(t.date) <= new Date(dateTo)) &&
    (!amountMin || t.amount >= parseFloat(amountMin)) &&
    (!amountMax || t.amount <= parseFloat(amountMax))
  );
  filtered = filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'amount') cmp = (a.amount - b.amount);
    else if (sortBy === 'date') cmp = (new Date(a.date).getTime() - new Date(b.date).getTime());
    else cmp = (a[sortBy] || '').localeCompare(b[sortBy] || '');
    return sortDir === 'asc' ? cmp : -cmp;
  });
  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  

  return (
    <DashboardLayout>
      <h2 style={{ marginBottom: 16 }}>Dashboard</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && (
        <>
          {/* Revenue & Expenses Line Chart */}
          <div style={{ marginBottom: 0 }}>
            <LineChartInfographic data={monthlyLineData} />
          </div>
          {/* Graph Filters below the chart */}
          <div style={{ display: 'flex', gap: 16, margin: '16px 0 36px 0', justifyContent: 'center', alignItems: 'center' }}>
            <TextField
              select
              label="Category Filter"
              value={graphCategoryFilter}
              onChange={e => setGraphCategoryFilter(e.target.value)}
              size="small"
              style={{ minWidth: 160, background: '#181c2a', borderRadius: 6 }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Status Filter"
              value={graphStatusFilter}
              onChange={e => setGraphStatusFilter(e.target.value)}
              size="small"
              style={{ minWidth: 160, background: '#181c2a', borderRadius: 6 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {statuses.map(st => <MenuItem key={st} value={st}>{st}</MenuItem>)}
            </TextField>
          </div>
          {/* Summary Cards - Modern, Figma-inspired */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6} lg={8}>
              <div style={{ display: 'flex', gap: 32, marginBottom: 36, flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'center' }}>
            {/* Balance */}
            <div
              style={{
                background: 'linear-gradient(90deg, #223b64 0%, #3a8dde 100%)',
                color: '#fff',
                borderRadius: 18,
                padding: '28px 32px',
                boxShadow: '0 4px 24px rgba(44, 62, 80, 0.10)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 260,
                minHeight: 132,
                flex: '0 1 270px',
                maxWidth: 320,
                marginRight: 32
              }}
              className="dashboard-animated-card"
            >
              <span style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span role="img" aria-label="balance">💰</span> Balance
              </span>
              <span style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, marginTop: 12, textAlign: 'left', wordBreak: 'break-all', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(summary.balance)}</span>
            </div>
            {/* Revenue */}
            <div
              style={{
                background: 'linear-gradient(90deg, #181c2a 0%, #00ffae 100%)',
                color: '#00ffae',
                borderRadius: 18,
                padding: '28px 32px',
                boxShadow: '0 4px 24px rgba(44, 62, 80, 0.10)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 260,
                minHeight: 132,
                flex: '0 1 270px',
                maxWidth: 320,
                marginRight: 32
              }}
              className="dashboard-animated-card"
            >
              <span style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span role="img" aria-label="revenue">🟢</span> Revenue
              </span>
              <span style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, marginTop: 12, textAlign: 'left', wordBreak: 'break-all', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(summary.revenue)}</span>
            </div>
            {/* Expenses */}
            <div
              style={{
                background: 'linear-gradient(90deg, #181c2a 0%, #ffe066 100%)',
                color: '#ffe066',
                borderRadius: 18,
                padding: '28px 32px',
                boxShadow: '0 4px 24px rgba(44, 62, 80, 0.10)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 260,
                minHeight: 132,
                flex: '0 1 270px',
                maxWidth: 320,
                marginRight: 32
              }}
              className="dashboard-animated-card"
            >
              <span style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span role="img" aria-label="expenses">🟡</span> Expenses
              </span>
              <span style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, marginTop: 12, textAlign: 'left', wordBreak: 'break-all', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(Math.abs(summary.expenses))}</span>
            </div>
            {/* Savings */}
            <div
              style={{
                background: 'linear-gradient(90deg, #23263a 0%, #7c3aed 100%)',
                color: '#bda6ff',
                borderRadius: 18,
                padding: '28px 32px',
                boxShadow: '0 4px 24px rgba(44, 62, 80, 0.10)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 260,
                minHeight: 132,
                flex: '0 1 270px',
                maxWidth: 320,
                marginRight: 32
              }}
              className="dashboard-animated-card"
            >
              <span style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span role="img" aria-label="savings">💜</span> Savings
              </span>
              <span style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, marginTop: 12, textAlign: 'left', wordBreak: 'break-all', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(summary.savings)}</span>
            </div>
            {/* Transaction Count */}
            <div
              style={{
                background: 'linear-gradient(90deg, #23263a 0%, #2af598 100%)',
                color: '#2af598',
                borderRadius: 18,
                padding: '28px 32px',
                boxShadow: '0 4px 24px rgba(44, 62, 80, 0.10)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 260,
                minHeight: 132,
                flex: '0 1 270px',
                maxWidth: 320
              }}
              className="dashboard-animated-card"
            >
              <span style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span role="img" aria-label="transactions">🔢</span> Transactions
              </span>
              <span style={{ fontSize: 36, fontFamily: 'monospace', fontWeight: 700, marginTop: 12, textAlign: 'left', wordBreak: 'break-all', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary.transactionCount}</span>
            </div>
          </div>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <ForecastBarChart />
          </Grid>
          </Grid>


          {/* Animation styles for dashboard cards */}
          <style>
            {`
              .dashboard-animated-card {
                opacity: 0;
                transform: translateY(32px) scale(0.96);
                animation: dashboardCardFadeIn 0.75s cubic-bezier(0.39, 0.575, 0.565, 1) forwards;
                will-change: opacity, transform;
                transition: transform 0.18s cubic-bezier(0.39, 0.575, 0.565, 1);
              }
              .dashboard-animated-card:hover {
                transform: translateY(0) scale(1.03);
                box-shadow: 0 8px 32px rgba(44, 62, 80, 0.18);
                z-index: 2;
              }
              @keyframes dashboardCardFadeIn {
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}
          </style>


          {/* Analytics Charts */}
          

          

          {/* Filters and Search */}
           <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            <TextField
              select
              label="Category"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              size="small"
              style={{ minWidth: 140 }}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              size="small"
              style={{ minWidth: 140 }}
            >
              <MenuItem value="">All</MenuItem>
              {statuses.map(st => <MenuItem key={st} value={st}>{st}</MenuItem>)}
            </TextField>
            <TextField
              label="Date From"
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 140,
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  filter: 'invert(1)',
                },
              }}
            />
            <TextField
              label="Date To"
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 140,
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  filter: 'invert(1)',
                },
              }}
            />
            <TextField
              label="Min Amount"
              type="number"
              value={amountMin}
              onChange={e => { setAmountMin(e.target.value); setPage(1); }}
              size="small"
              style={{ minWidth: 120 }}
            />
            <TextField
              label="Max Amount"
              type="number"
              value={amountMax}
              onChange={e => { setAmountMax(e.target.value); setPage(1); }}
              size="small"
              style={{ minWidth: 120 }}
            />

            <TextField
              label="Search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              size="small"
              style={{ minWidth: 180 }}
              InputProps={{ endAdornment: <IconButton size="small"><SearchIcon /></IconButton> }}
            />
          </div>

          {/* Transactions Table with Sorting and Pagination */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #eee', padding: 8, cursor: 'pointer' }} onClick={() => { setSortBy('date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Date {sortBy==='date' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                <th style={{ border: '1px solid #eee', padding: 8, cursor: 'pointer' }} onClick={() => { setSortBy('amount'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Amount {sortBy==='amount' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                <th style={{ border: '1px solid #eee', padding: 8, cursor: 'pointer' }} onClick={() => { setSortBy('category'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Category {sortBy==='category' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                <th style={{ border: '1px solid #eee', padding: 8, cursor: 'pointer' }} onClick={() => { setSortBy('status'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>Status {sortBy==='status' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(t => (
                <tr key={t._id}>
                  <td style={{ border: '1px solid #eee', padding: 8 }}>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={{ border: '1px solid #eee', padding: 8 }}>{formatCurrency(t.amount)}</td>
                  <td style={{ border: '1px solid #eee', padding: 8 }}>{t.category}</td>
                  <td style={{ border: '1px solid #eee', padding: 8 }}>{t.status}</td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#999' }}>No transactions found.</td></tr>}
            </tbody>
          </table>
          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: page === 1 ? '#23263a' : 'linear-gradient(90deg, #7c3aed 0%, #7c3aed 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.6 : 1
              }}
            >Previous</button>
            <span style={{ color: '#b0b8d1', fontSize: 16, fontWeight: 500 }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: page === totalPages ? '#23263a' : 'linear-gradient(90deg, #7c3aed 0%, #7c3aed 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.6 : 1
              }}
            >Next</button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
