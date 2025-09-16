import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthData {
  month: string;
  revenue: number;
  expenses: number;
}

interface LineChartInfographicProps {
  data: MonthData[];
}

const LineChartInfographic: React.FC<LineChartInfographicProps> = ({ data }) => {
  // Compute max to avoid a [0,0] Y-axis domain (which renders nothing)
  const maxVal = data.reduce((m, d) => Math.max(m, d.revenue || 0, d.expenses || 0), 0);
  const yDomain: [number, number | 'dataMax'] = [0, maxVal === 0 ? 1 : 'dataMax'];

  return (
    <div style={{
      width: '100%',
      height: 360,
      background: '#181c2a', // dark background
      borderRadius: 20,
      padding: 24,
      color: '#fff', // white text
      boxShadow: '0 4px 24px rgba(44, 62, 80, 0.18)'
    }}>
      <h2 style={{
        textAlign: 'center',
        fontWeight: 700,
        marginBottom: 0,
        fontSize: 28,
        letterSpacing: 1,
        color: '#fff'
      }}>
        REVENUE & EXPENSES
      </h2>
      {data.length === 0 ? (
        <div style={{
          height: 260,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#b0b8d1'
        }}>
          No data available yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#23263a" />
            <XAxis dataKey="month" style={{ fontWeight: 600, fontSize: 16, fill: '#fff' }} tick={{ fill: '#b0b8d1' }} />
            <YAxis domain={yDomain} style={{ fontWeight: 600, fontSize: 16, fill: '#fff' }} tick={{ fill: '#b0b8d1' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#23263a', borderRadius: 10, border: 'none', color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend verticalAlign="top" height={36} iconType="rect"
              wrapperStyle={{ fontWeight: 600, fontSize: 16, color: '#fff' }} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ff5c8a" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default LineChartInfographic;
