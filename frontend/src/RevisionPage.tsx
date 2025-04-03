import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.png";
import "./RevisionPage.css";

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
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
      </div>

      <div className="content-container">
        <TableContainer component={Paper} className="revision-table-container" sx={{ backgroundColor: '#fafafa' }}>
          <div className="table-inner-padding">
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
                        Hop til
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TableContainer>

        <div className="pdf-preview-container">
          <object
            title="Eksempel PDF"
            type="application/pdf"
            data="https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf"
          >
            Din browser understøtter ikke PDF preview.{" "}
            <a
              href="https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf"
              download="sample.pdf"
            >
              Download PDF
            </a>
          </object>
        </div>
      </div>

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
