import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";
import AppRoutes from "./AppRoutes";
import "./App.css";

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  );
};

export default App;