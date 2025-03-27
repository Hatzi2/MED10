import React from "react";
import { Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";

const TablePage: React.FC = () => {
  const rows = [
    { id: 1, name: "John Doe", age: 30 },
    { id: 2, name: "Jane Smith", age: 28 },
    { id: 3, name: "Michael Johnson", age: 35 },
  ];

  return (
    <Container maxWidth="md">
      <Typography variant="h4" align="center" gutterBottom>
        Placeholder Table
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Age</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.age}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Link back to home */}
      <Typography align="center" marginTop={2}>
        <Link to="/" style={{ textDecoration: "none", color: "blue" }}>
          Go Back
        </Link>
      </Typography>
    </Container>
  );
};

export default TablePage;
