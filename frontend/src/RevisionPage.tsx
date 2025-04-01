import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "./RevisionPage.css"; // Ensure CSS file is applied

const RevisionPage: React.FC = () => {
  const navigate = useNavigate();

  const rows = [
    { id: "Adresse:", expected: "Urbansgade 26", received: "Urbansgade 26", confidence: "99%" },
    { id: "Areal:", expected: "50m2", received: "50m2", confidence: "99%" },
    { id: "By:", expected: "Aalborg", received: "Aalborg", confidence: "99%" },
  ];

  const handleAction = (id: string) => {
    console.log(`Action triggered for ${id}`);
  };

  return (
    <div className="revision-container">
      <Typography variant="h4" gutterBottom>
        Revision Page
      </Typography>

      <TableContainer component={Paper} className="revision-table-container">
  <Table className="revision-table">
    <TableHead>
      <TableRow>
        <TableCell sx={{ fontWeight: "bold" }}></TableCell>
        <TableCell sx={{ fontWeight: "bold" }}>Forventet:</TableCell>
        <TableCell sx={{ fontWeight: "bold" }}>Modtaget:</TableCell>
        <TableCell sx={{ fontWeight: "bold" }}>Sikkerhed:</TableCell>
        <TableCell sx={{ fontWeight: "bold" }}>Handling</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell sx={{ fontWeight: "bold" }}>{row.id}</TableCell>
          <TableCell>{row.expected}</TableCell>
          <TableCell>{row.received}</TableCell>
          <TableCell>{row.confidence}</TableCell>
          <TableCell>
            <Button 
              variant="contained" 
              className="table-action-button" 
              onClick={() => handleAction(row.id)}
            >
              Revidér
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>


      <Button
        onClick={() => navigate("/")}
        variant="contained"
        color="primary"
        className="back-button"
      >
        Tilbage
      </Button>
    </div>
  );
};

export default RevisionPage;
