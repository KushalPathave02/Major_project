import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'INR' | 'USD' | 'EUR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  // Convert a numeric value from base currency (INR) to the current currency
  convert: (value: number) => number;
  // Format a numeric value using the current currency (includes conversion)
  formatCurrency: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'INR',
  setCurrency: () => {},
  convert: (v: number) => v,
  formatCurrency: () => '',
});

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>(() => {
    const stored = localStorage.getItem('currency');
    return (stored as Currency) || 'INR';
  });

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // Simple static rates relative to INR (base). Update as needed or wire an API.
  const rates: Record<Currency, number> = {
    INR: 1,
    USD: 1 / 83, // approx: 1 USD = 83 INR
    EUR: 1 / 90, // approx: 1 EUR = 90 INR
  };

  const convert = (value: number): number => {
    const rate = rates[currency] ?? 1;
    return value * rate;
  };

  const formatCurrency = (value: number): string => {
    const converted = convert(value);
    const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
