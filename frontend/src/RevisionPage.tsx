import React, { useState } from "react";
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
  received: string;
  confidence: string;
}

const RevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { filename, rows } = location.state || {};

  const displayRows: RowData[] =
    rows && rows.length > 0
      ? rows
      : [
          {
            id: "Adresse:",
            expected: "N/A",
            received: "N/A",
            confidence: "N/A",
          },
          { id: "Areal:", expected: "N/A", received: "N/A", confidence: "N/A" },
          { id: "By:", expected: "N/A", received: "N/A", confidence: "N/A" },
        ];

  const pdfPath = filename
    ? `http://localhost:5000/pdf/${filename}`
    : "https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf";

  const searchPluginInstance = searchPlugin();
  const { highlight, jumpToNextMatch, clearHighlights } = searchPluginInstance;

  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [lastSearchTerm, setLastSearchTerm] = useState<string | null>(null);

  const handleSearchClick = async (rowId: string, value: string) => {
    if (!value || value === "N/A") return;

    if (activeRowId === rowId && lastSearchTerm === value) {
      jumpToNextMatch();
    } else {
      clearHighlights();
      setActiveRowId(rowId);
      setLastSearchTerm(value);
      await highlight(value);
      jumpToNextMatch();
    }
  };

  // Handler for the "Afvis" button (revision rejection).
  const handleReject = () => {
    // Retrieve current rejected files from localStorage, or initialize an empty array.
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejectedFiles: string[] = storedRejected
      ? JSON.parse(storedRejected)
      : [];
    // If the current file is not already marked as rejected, add it.
    if (filename && !rejectedFiles.includes(filename)) {
      rejectedFiles.push(filename);
    }
    // Persist the updated rejected files array.
    localStorage.setItem("rejectedFiles", JSON.stringify(rejectedFiles));
    // Navigate back to the homepage, passing the rejectedFiles via state.
    navigate("/", { state: { rejectedFiles } });
  };

  // Handler for the "Acceptér" button
  const handleAccept = () => {
    // Remove the file from the rejected list if it exists.
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejectedFiles = storedRejected ? JSON.parse(storedRejected) : [];
    rejectedFiles = rejectedFiles.filter((item: string) => item !== filename);
    localStorage.setItem("rejectedFiles", JSON.stringify(rejectedFiles));

    // Then add the file to the accepted list if not already present.
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
      {/* Clickable logo: when clicked, navigates back to homepage */}
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
                  <TableCell sx={{ fontWeight: "bold" }}></TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Forventet:
                    <Tooltip title="Den værdi vi forventer at se ifølge vores data">
                      <HelpOutlineIcon
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Modtaget:
                    <Tooltip title="Den værdi fundet i dokumentet">
                      <HelpOutlineIcon
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Sikkerhed:
                    <Tooltip title="Hvor sikker modellen er på matchet (%)">
                      <HelpOutlineIcon
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Handling</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row: RowData) => {
                  const isActive =
                    activeRowId === row.id && lastSearchTerm === row.received;
                  const isEnabled = row.confidence === "100.0%";

                  const buttonLabel = isActive ? "Næste" : "Hop til";

                  const button = (
                    <Button
                      variant="contained"
                      className="table-action-button"
                      onClick={() => handleSearchClick(row.id, row.received)}
                      disabled={!isEnabled}
                      sx={{
                        backgroundColor: !isEnabled ? "#ccc" : undefined,
                        color: !isEnabled ? "#666" : undefined,
                        pointerEvents: !isEnabled ? "none" : undefined,
                      }}
                    >
                      {buttonLabel}
                    </Button>
                  );

                  return (
                    <TableRow key={row.id}>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {row.id}
                      </TableCell>
                      <TableCell>{row.expected}</TableCell>
                      <TableCell>{row.received}</TableCell>
                      <TableCell>{row.confidence}</TableCell>
                      <TableCell>
                        {!isEnabled ? (
                          <Tooltip title="Kan kun bruges ved 100% sikkerhed">
                            <span>{button}</span>
                          </Tooltip>
                        ) : (
                          button
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            width: "150px", // fixed width
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
            width: "150px", // same fixed width
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
