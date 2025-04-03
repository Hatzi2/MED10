import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import logo from "./assets/logo.png";
import "./RevisionPage.css";

// Define the type for each row
interface RowData {
  id: string;
  expected: string;
  received: string;
  confidence: string;
}

const RevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Extract filename and rows from the navigation state
  const { filename, rows } = location.state || {};

  // Use the passed rows if available, otherwise fallback to default values
  const displayRows: RowData[] =
    rows && rows.length > 0
      ? rows
      : [
          { id: "Adresse:", expected: "N/A", received: "N/A", confidence: "N/A" },
          { id: "Areal:", expected: "N/A", received: "N/A", confidence: "N/A" },
          { id: "By:", expected: "N/A", received: "N/A", confidence: "N/A" },
        ];

  // Construct the PDF URL using the provided filename
  const pdfPath = filename
    ? `http://localhost:5000/pdf/${filename}`
    : "https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf";

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
                {displayRows.map((row: RowData) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ fontWeight: "bold" }}>{row.id}</TableCell>
                    <TableCell>{row.expected}</TableCell>
                    <TableCell>{row.received}</TableCell>
                    <TableCell>{row.confidence}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        className="table-action-button"
                        onClick={() => console.log(`Action triggered for ${row.id}`)}
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
            title="Selected PDF"
            type="application/pdf"
            data={pdfPath}
            width="100%"
            height="600px"
          >
            Din browser understøtter ikke PDF preview.{" "}
            <a href={pdfPath} download={filename || "file.pdf"}>
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
