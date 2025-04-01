// HomePage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
} from "@mui/material";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const rows = [
    { id: 1, name: "John Doe", value: "Placeholder 1" },
    { id: 2, name: "Jane Smith", value: "Placeholder 2" },
    { id: 3, name: "Alice Johnson", value: "Placeholder 3" },
  ];

  return (
    <Container maxWidth="md" style={{ marginTop: "2rem" }}>
      <Typography variant="h4" gutterBottom>
        Home Page Table
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Value</TableCell>
              <TableCell></TableCell> {/* Empty header for the button column */}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.value}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate("/main")}
                  >
                    Gå til Autocheck
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default HomePage;
