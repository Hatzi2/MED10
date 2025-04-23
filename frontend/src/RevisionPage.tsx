import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Tooltip } from "@mui/material";
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
          { id: "Adresse:", expected: "N/A", received: "N/A", confidence: "N/A" },
          { id: "Areal:", expected: "N/A", received: "N/A", confidence: "N/A" },
          { id: "By:", expected: "N/A", received: "N/A", confidence: "N/A" },
        ];

  const pdfPath = filename ? `http://localhost:5000/pdf/${filename}` : "https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf";

  const searchPluginInstance = searchPlugin();
  const { highlight, jumpToNextMatch, clearHighlights } = searchPluginInstance;

  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [lastSearchTerm, setLastSearchTerm] = useState<string | null>(null);

  // --- Timer helper functions (same as in Autocheck.tsx) ---
  const getFinalElapsed = (): number => {
    const startStr = sessionStorage.getItem("timetracker_start");
    const accumulated = parseFloat(sessionStorage.getItem("timetracker_accumulated") || "0");
    if (!startStr) return accumulated / 1000;
    const startTime = parseInt(startStr, 10);
    return (Date.now() - startTime + accumulated) / 1000;
  };

  const clearTimer = () => {
    sessionStorage.removeItem("timetracker_start");
    sessionStorage.removeItem("timetracker_accumulated");
  };

  const recordTimerFinal = (action: string) => {
    const finalTime = getFinalElapsed();
    clearTimer();
    fetch("http://localhost:5000/save-timetrack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, time: finalTime, action }),
    })
      .then((res) => {
        if (res.ok) {
          console.log("Timer recorded successfully.");
        } else {
          console.error("Error recording timer.");
        }
      })
      .catch((err) => console.error("Timer record error:", err));
  };
  // --- End timer helpers ---

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

  // Handler for the "Afvis" button
  const handleReject = () => {
    recordTimerFinal("afvis");
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejectedFiles: string[] = storedRejected ? JSON.parse(storedRejected) : [];
    if (filename && !rejectedFiles.includes(filename)) {
      rejectedFiles.push(filename);
    }
    localStorage.setItem("rejectedFiles", JSON.stringify(rejectedFiles));
    navigate("/", { state: { rejectedFiles } });
  };

  // Handler for the "Acceptér" button
  const handleAccept = () => {
    recordTimerFinal("accepter");
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
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" style={{ cursor: "pointer" }} onClick={() => navigate("/")} />
      </div>

      <div className="content-container">
        <TableContainer component={Paper} className="revision-table-container" sx={{ backgroundColor: "#fafafa", borderRadius: "12px", boxShadow: "0px 4px 6px rgba(0,0,0,0.1)" }}>
          <div className="table-inner-padding">
            <Table className="revision-table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}></TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Forventet:
                    <Tooltip title="Informationen fundet i databasen omkring sagen">
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Modtaget:
                    <Tooltip title="Programmet har lavet en avanceret FAISS AI søgning efter det forventede resultat, og viser her det tætteste match, som det kunne finde">
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Sikkerhed:
                    <Tooltip title="Hvor ens (%) det forventede og fundne information er">
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Handling</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row: RowData) => {
                  const isActive = activeRowId === row.id && lastSearchTerm === row.received;
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
                      <TableCell sx={{ fontWeight: "bold" }}>{row.id}</TableCell>
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

      <div style={{ display: "flex", gap: "12px", marginTop: "20px", justifyContent: "center", alignItems: "center" }}>
        <Button onClick={handleReject} variant="contained" color="error" sx={{ width: "200px", height: "40px", color: "white" }}>
          Afvis dokument
        </Button>

        <Button onClick={handleAccept} variant="contained" color="success" sx={{ width: "200px", height: "40px", color: "white" }}>
          Acceptér dokument
        </Button>
      </div>
    </div>
  );
};

export default RevisionPage;
