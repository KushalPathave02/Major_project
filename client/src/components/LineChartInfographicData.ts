// Local Transaction interface (copied from Dashboard.tsx)
interface Transaction {
  _id: string;
  date: string;
  amount: number;
  category: string;
  status: string;
  [key: string]: any;
}

// Helper to group transactions by month and calculate revenue/expenses
export function getMonthlyRevenueExpenses(transactions: Transaction[]) {
  // Group by year-month
  const monthly: Record<string, { revenue: number; expenses: number }> = {};

  const expenseCategories = [
    'rent','bills','groceries','travel','others','shopping','food','utilities','transport','medical',
    'entertainment','subscriptions','education','emi','loan','insurance','tax','fuel','misc','expense'
  ];
  const isExpense = (t: Transaction) =>
    expenseCategories.includes((t.category || '').toLowerCase()) || (t.type?.toLowerCase() === 'expense');

  transactions.forEach(t => {
    const dateObj = new Date(t.date);
    const month = `${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2,'0')}`;
    if (!monthly[month]) monthly[month] = { revenue: 0, expenses: 0 };
    if (isExpense(t)) {
      monthly[month].expenses += t.amount || 0;
    } else {
      monthly[month].revenue += t.amount || 0;
    }
  });

  // Convert to array and sort by date
  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { revenue, expenses }]) => ({
      month,
      revenue,
      expenses
    }));
}
