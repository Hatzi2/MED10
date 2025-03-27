import { createTheme, PaletteColor, PaletteColorOptions } from '@mui/material/styles';

// Extend the PaletteOptions interface
declare module '@mui/material/styles' {
  interface Palette {
    success: PaletteColor; // Add tertiary as a color
  }
  interface PaletteOptions {
    success?: PaletteColorOptions; // Allow tertiary to be optionally defined
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF8308', // Light orange
    },
    secondary: {
      main: '#FF4D00', // Dark orange
    },
    success: {
      main: '#1FA878', // Custom third color (e.g., blue)
    },
    background: {
      default: '#f5f5f5', // Light Gray
      paper: '#ffffff', // White for Paper components
    },
    text: {
      primary: '#000000', // Black for primary text
      secondary: '#666666', // Gray for secondary text
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 300,
    },
    body1: {
      fontSize: '1rem',
    },
  },
});

export default theme;
