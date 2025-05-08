import React, { useState, useEffect } from "react";
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
import { yellow } from "@mui/material/colors";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import CancelIcon from "@mui/icons-material/Cancel";
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

/**
 * RevisionPage component for reviewing document verification results
 * Allows users to review extracted data against expected values and navigate through PDF highlights
 */
const RevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { filename, rows } = location.state || {};

  // Default rows if none are provided
  const displayRows: RowData[] =
    rows && rows.length > 0
      ? rows
      : [
          { id: "Adresse:", expected: "N/A", received: "N/A", confidence: "N/A" },
          { id: "By:", expected: "N/A", received: "N/A", confidence: "N/A" },
          { id: "Areal:", expected: "N/A", received: "N/A", confidence: "N/A" },
        ];

  // PDF file path
  const pdfPath = filename
    ? `http://localhost:5000/pdf/${filename}`
    : "https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf";

  // PDF search plugin initialization
  const searchPluginInstance = searchPlugin();
  const { highlight, jumpToNextMatch, clearHighlights } = searchPluginInstance;
  
  // State for search and highlighting
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [lastSearchTerm, setLastSearchTerm] = useState<string | null>(null);

  /**
   * Extracts the search term from a value based on field type
   * For "Areal:" fields, only extracts the numeric part
   */
  const extractSearchTerm = (rowId: string, value: string): string => {
    if (rowId === "Areal:" && value !== "N/A") {
      // Remove any "m2" or "m²" text to avoid regex confusion
      const cleanedValue = value.replace(/m²|m2/gi, "").trim();
      
      // Extract the numeric part
      const numericMatch = cleanedValue.match(/(\d+)/);
      if (numericMatch && numericMatch[0]) {
        return numericMatch[0]; // Return just the numbers
      }
    }
    return value;
  };

  /**
   * Handles search button clicks
   * Either continues to next match or starts a new search
   */
  const handleSearchClick = async (rowId: string, value: string) => {
    if (!value || value === "N/A" || value === "-") return;

    const searchTerm = extractSearchTerm(rowId, value);
    
    if (activeRowId === rowId && lastSearchTerm === searchTerm) {
      // Continue to next match
      jumpToNextMatch();
    } else {
      // Start new search
      clearHighlights();
      setActiveRowId(rowId);
      setLastSearchTerm(searchTerm);
      
      // Wait for highlight to complete before moving to first match
      await highlight(searchTerm);
      jumpToNextMatch();
    }
  };

  /**
   * Handles document rejection
   * Adds file to rejected list in localStorage and navigates back
   */
  const handleReject = () => {
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejectedFiles: string[] = storedRejected ? JSON.parse(storedRejected) : [];
    if (filename && !rejectedFiles.includes(filename)) rejectedFiles.push(filename);
    localStorage.setItem("rejectedFiles", JSON.stringify(rejectedFiles));
    navigate("/", { state: { rejectedFiles } });
  };

  /**
   * Handles document acceptance
   * Removes file from rejected list, adds to accepted list, and navigates back
   */
  const handleAccept = () => {
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejectedFiles = storedRejected ? JSON.parse(storedRejected) : [];
    rejectedFiles = rejectedFiles.filter((item) => item !== filename);
    localStorage.setItem("rejectedFiles", JSON.stringify(rejectedFiles));

    const storedAccepted = localStorage.getItem("acceptedFiles");
    let acceptedFiles = storedAccepted ? JSON.parse(storedAccepted) : [];
    if (filename && !acceptedFiles.includes(filename)) acceptedFiles.push(filename);
    localStorage.setItem("acceptedFiles", JSON.stringify(acceptedFiles));

    navigate("/", { state: { acceptedFiles } });
  };

  // Common button style with fixed width
  const tableButtonStyle = {
    minWidth: "100px", // Fixed width for both "Hop til" and "Næste" buttons
    whiteSpace: "nowrap" as const,
  };

  return (
    <div className="revision-container">
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
          sx={{ backgroundColor: "#fafafa", borderRadius: "12px", boxShadow: "0px 4px 6px rgba(0,0,0,0.1)" }}
        >
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
                    Fundet:
                    <Tooltip title="Programmet har lavet en avanceret FAISS AI søgning efter det forventede resultat, og viser her det tætteste match, som det kunne finde">
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Match:
                    <Tooltip
                      componentsProps={{ tooltip: { sx: { maxWidth: 500 } } }}
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CancelIcon color="error" fontSize="small" />
                          Fandt intet match
                          <RemoveCircleIcon sx={{ color: yellow[700] }} fontSize="small" />
                          Fandt delvist match
                          <CheckCircleIcon color="success" fontSize="small" />
                          Fandt match
                        </span>
                      }
                    >
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Handling</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row) => {
                  const rawValue = parseFloat(row.confidence);
                  const isLowConfidence = !isNaN(rawValue) && rawValue < 80;
                  const isMidConfidence = !isNaN(rawValue) && rawValue >= 80 && rawValue < 100;

                  // Enable button only if confidence is above 80
                  const isEnabled = !isNaN(rawValue) && rawValue >= 80;
                  
                  const searchTerm = extractSearchTerm(row.id, row.received);
                  const isActive = activeRowId === row.id && lastSearchTerm === searchTerm;
                  const buttonLabel = isActive ? "Næste" : "Hop til";

                  // Determine confidence icon based on match percentage
                  let confidenceIcon: React.ReactNode;
                  if (!isNaN(rawValue)) {
                    if (rawValue === 100) confidenceIcon = <CheckCircleIcon color="success" />;
                    else if (rawValue > 80) confidenceIcon = <RemoveCircleIcon sx={{ color: yellow[700] }} />;
                    else confidenceIcon = <CancelIcon color="error" />;
                  } else {
                    confidenceIcon = row.confidence;
                  }
                  
                  // Show dash for low confidence matches
                  const receivedDisplay = (!isNaN(rawValue) && rawValue < 80) ? "-" : row.received;

                  const button = (
                    <Button
                      variant="contained"
                      className="table-action-button"
                      onClick={() => handleSearchClick(row.id, row.received)}
                      disabled={!isEnabled}
                      sx={{ 
                        ...tableButtonStyle,
                        backgroundColor: !isEnabled ? "#ccc" : undefined, 
                        color: !isEnabled ? "#666" : undefined, 
                        pointerEvents: !isEnabled ? "none" : undefined 
                      }}
                    >
                      {buttonLabel}
                    </Button>
                  );

                  // Determine if we need to show the partial match warning tooltip
                  const showPartialMatchWarning = isMidConfidence;
                  const buttonWithTooltip = showPartialMatchWarning ? (
                    <Tooltip title="Virker muligvis ikke ved delvist match">
                      <span>{button}</span>
                    </Tooltip>
                  ) : button;

                  return (
                    <TableRow
                      key={row.id}
                      sx={{ 
                        backgroundColor: isLowConfidence 
                          ? "rgba(255, 0, 0, 0.1)" 
                          : isMidConfidence 
                            ? "rgba(255, 255, 0, 0.1)" 
                            : undefined 
                      }}
                    >
                      <TableCell sx={{ fontWeight: "bold" }}>
                        {row.id}
                        {row.id === "Areal:" && (
                          <Tooltip title="Omfatter husets areal i kvadratmeter">
                            <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>{row.expected}</TableCell>
                      <TableCell>{receivedDisplay}</TableCell>
                      <TableCell>{confidenceIcon}</TableCell>
                      <TableCell>
                        {!isEnabled ? (
                          <Tooltip title="Knappen er kun aktiv fra delvist match">
                            <span>{button}</span>
                          </Tooltip>
                        ) : buttonWithTooltip}
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
            <Viewer 
              fileUrl={pdfPath} 
              plugins={[searchPluginInstance]}
            />
          </Worker>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px", justifyContent: "center", alignItems: "center" }}>
        <Button 
          onClick={handleReject} 
          variant="contained" 
          color="error" 
          sx={{ width: "200px", height: "40px", color: "white" }}
        >
          Afvis dokument
        </Button>
        <Button 
          onClick={handleAccept} 
          variant="contained" 
          color="success" 
          sx={{ width: "200px", height: "40px", color: "white" }}
        >
          Acceptér dokument
        </Button>
      </div>
    </div>
  );
};

export default RevisionPage;