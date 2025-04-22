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
  Tooltip,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import logo from "./assets/logo.png";
import "./RevisionPage.css";

import { Viewer, Worker } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";

interface RowData {
  id: string;
  expected: string;
}

const RevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { filename, rows } = location.state || {};

  const displayRows: RowData[] =
    rows && rows.length > 0
      ? rows.map((row: any) => ({ id: row.id, expected: row.expected }))
      : [
          { id: "Adresse:", expected: "N/A" },
          { id: "Areal:", expected: "N/A" },
          { id: "By:", expected: "N/A" },
        ];

  const pdfPath = filename
    ? `http://localhost:5000/pdf/${filename}`
    : "https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf";

  // The searchPlugin is used by the PDF viewer.
  const searchPluginInstance = searchPlugin();

  // Record the start time when the page loads.
  const [startTime, setStartTime] = React.useState<number | null>(null);
  React.useEffect(() => {
    setStartTime(Date.now());
  }, []);

  // Function to send the recorded duration and action to the backend.
  const recordTime = async (duration: number, action: string) => {
    try {
      await fetch("http://localhost:5000/timetrack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, duration, action }),
      });
    } catch (error) {
      console.error("Failed to record time", error);
    }
  };

  // Handler for the "Afvis" (reject) button.
  const handleReject = () => {
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000; // duration in seconds
      recordTime(duration, "afvis");
    }
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejectedFiles: string[] = storedRejected ? JSON.parse(storedRejected) : [];
    if (filename && !rejectedFiles.includes(filename)) {
      rejectedFiles.push(filename);
    }
    localStorage.setItem("rejectedFiles", JSON.stringify(rejectedFiles));
    navigate("/", { state: { rejectedFiles } });
  };

  // Handler for the "Acceptér" (accept) button.
  const handleAccept = () => {
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000; // duration in seconds
      recordTime(duration, "accepter");
    }
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejectedFiles = storedRejected ? JSON.parse(storedRejected) : [];
    rejectedFiles = rejectedFiles.filter((item: string) => item !== filename);
    localStorage.setItem("rejectedFiles", JSON.stringify(rejectedFiles));

    const storedAccepted = localStorage.getItem("acceptedFiles");
    let acceptedFiles = storedAccepted ? JSON.parse(storedAccepted) : [];
    if (filename && !acceptedFiles.includes(filename)) {
      acceptedFiles.push(filename);
    }
    localStorage.setItem("acceptedFiles", JSON.stringify(acceptedFiles));

    navigate("/", { state: { acceptedFiles } });
  };

  return (
    <div className="revision-container">
      {/* Clickable logo navigates back to the homepage */}
      <div className="logo-container">
        <img
          src={logo}
          alt="Logo"
          className="logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        />
      </div>

      <div className="content-container">
        <TableContainer
          component={Paper}
          className="revision-table-container"
          sx={{
            backgroundColor: "#fafafa",
            borderRadius: "12px",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <div className="table-inner-padding">
            <Table className="revision-table">
              <TableHead>
                <TableRow>
                  {/* This column displays the field names (e.g., Adresse:, Areal:, By:) */}
                  <TableCell sx={{ fontWeight: "bold" }}></TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Forventet:
                    <Tooltip title="Informationen fundet i databasen omkring sagen">
                      <HelpOutlineIcon
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row: RowData) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ fontWeight: "bold" }}>{row.id}</TableCell>
                    <TableCell>{row.expected}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TableContainer>

        <div className="pdf-preview-container">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.0.279/build/pdf.worker.min.js">
            <Viewer fileUrl={pdfPath} plugins={[searchPluginInstance]} />
          </Worker>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "20px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Button
          onClick={handleReject}
          variant="contained"
          color="error"
          sx={{
            width: "150px",
            height: "40px",
            color: "white",
          }}
        >
          Afvis
        </Button>

        <Button
          onClick={handleAccept}
          variant="contained"
          color="success"
          sx={{
            width: "150px",
            height: "40px",
            color: "white",
          }}
        >
          Acceptér
        </Button>
      </div>
    </div>
  );
};

export default RevisionPage;
