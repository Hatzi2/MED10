import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { Container, Grid, Box, Typography, Dialog, DialogTitle, DialogContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, ThemeProvider } from "@mui/material";
import theme from "./theme";
import logo from "./assets/logo.png";
import RevisionPage from "./RevisionPage";
import "./App.css";

const Home: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [circleStates, setCircleStates] = useState<boolean[]>([true, true, true, true, true, false]);
  const navigate = useNavigate();

  const [rows, setRows] = useState([
    { id: "Adresse:", expected: "", received: "", confidence: "" },
    { id: "Areal:", expected: "", received: "", confidence: "" },
    { id: "By:", expected: "", received: "", confidence: "" },
  ]);
  

  const handleAccept = () => {
    setCircleStates((prev) => prev.map((state, index) => (index === 5 ? true : state)));
    setOpen(false);
  };

  const handleDialogOpen = async () => {
    try {
      const response = await fetch("http://localhost:5000/run-script", {
        method: "POST",
      });
  
      const data = await response.json();
  
      const updatedRows = rows.map((row) => {
        const match = data.find((item: any) => item.id === row.id);
        return match ? { ...row, ...match } : row;
      });
  
      setRows(updatedRows);
      console.log("Updated rows with fetched data:", updatedRows);
    } catch (error) {
      console.error("Failed to trigger Python script:", error);
    }
  
    setOpen(true);
  };
  

  return (
    <div className="app-container">
      {/* Logo */}
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
      </div>

      <Container maxWidth="lg" className="content-container">
        <Grid container spacing={3}>
          <Grid item xs={12} sm={8}>
            <Grid container spacing={3}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Box className="placeholder-box">
                    <Typography variant="h6">Placeholder {index + 1}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box className="new-component-box">
              <Grid container direction="column" spacing={1} style={{ height: "100%" }}>
                {circleStates.map((isGreen, index) => (
                  <Grid item key={index} style={{ flex: 1 }}>
                    <Box
                      className="slice-box"
                      onClick={() => index === 5 && handleDialogOpen()}
                      style={{ cursor: index === 5 ? "pointer" : "default" }}
                    >
                      <Typography variant="h6">
                        {index === 5 ? "Brandpolice" : `Autocheck ${index + 1}`}
                      </Typography>

                      <div className="circle-container">
                        <div className={isGreen ? "green-circle" : "red-circle"}></div>
                      </div>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Dialog for MUI Table */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Brandpolice</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>Forventet:</TableCell>
                  <TableCell>Modtaget:</TableCell>
                  <TableCell>Sikkerhed:</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.expected}</TableCell>
                    <TableCell>{row.received}</TableCell>
                    <TableCell>{row.confidence}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Navigate to Revision Page */}
          <Button 
            onClick={() => navigate("/revision")} 
            fullWidth 
            variant="contained" 
            color="primary" 
            style={{ marginTop: "10px" }}
            sx={{ color: 'white' }}
          >
            Revidér
          </Button>

          {/* Close Button */}
          <Button 
            onClick={handleAccept} 
            fullWidth 
            variant="contained" 
            color="success"
            style={{ marginTop: "10px" }}
          >
            Acceptér
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/revision" element={<RevisionPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
