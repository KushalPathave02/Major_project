import { createTheme } from '@mui/material/styles';

export const dashboardTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#181c2a',
      paper: '#23263a',
    },
    primary: { main: '#7c3aed' },
    secondary: { main: '#ff5c8a' },
    text: { primary: '#fff', secondary: '#b0b8d1' },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
  },
});

export const lightDashboardTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f4f6fa',
      paper: '#fff',
    },
    primary: { main: '#7c3aed' },
    secondary: { main: '#ff5c8a' },
    text: { primary: '#23263a', secondary: '#5d5d7c' },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
  },
});
