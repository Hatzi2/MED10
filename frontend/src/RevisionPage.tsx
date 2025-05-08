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
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { yellow } from "@mui/material/colors";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import BugReportIcon from "@mui/icons-material/BugReport";
import CloseIcon from "@mui/icons-material/Close";
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
  
  // State for debug image dialog
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugImagePath, setDebugImagePath] = useState("");

  // Process rows to handle Areal units formatting
  const processRows = (inputRows: RowData[]): RowData[] => {
    if (!inputRows) return [];
    
    return inputRows.map(row => {
      // Only process Areal rows
      if (row.id === "Areal:") {
        // Check if received value contains unit markers
        const received = row.received;
        if (received && received !== "N/A") {
          const expected = row.expected;
          
          // Extract numeric part from expected value
          const expectedNumMatch = expected.match(/(\d+)/);
          const expectedNum = expectedNumMatch ? expectedNumMatch[0] : "";
          
          // Check for unit position in received value
          if (received.match(/^m2|^kvm/i)) {
            // Unit is at the beginning
            const unitMatch = received.match(/^(m2|kvm)/i);
            const unit = unitMatch ? unitMatch[0] : "m2";
            return {
              ...row,
              expected: `${unit} ${expectedNum}`
            };
          } else if (received.match(/m2$|m²$|kvm$/i)) {
            // Unit is at the end
            const unitMatch = received.match(/(m2|m²|kvm)$/i);
            const unit = unitMatch ? unitMatch[0] : "m2";
            return {
              ...row,
              expected: `${expectedNum} ${unit}`
            };
          }
        }
      }
      return row;
    });
  };

  // Default rows if none are provided
  const defaultRows: RowData[] = [
    { id: "Adresse:", expected: "N/A", received: "N/A", confidence: "N/A" },
    { id: "By:", expected: "N/A", received: "N/A", confidence: "N/A" },
    { id: "Areal:", expected: "N/A", received: "N/A", confidence: "N/A" },
  ];

  // Process rows with unit handling
  const displayRows: RowData[] = rows && rows.length > 0 
    ? processRows(rows) 
    : defaultRows;

  // PDF file path
  const pdfPath = filename
    ? `http://localhost:5000/pdf/${filename}`
    : "https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf";

  // Generate debug image path based on PDF filename
  useEffect(() => {
    if (filename) {
      // Extract just the base filename without extension
      const baseFilename = filename.replace(/\.[^/.]+$/, "");
      setDebugImagePath(`http://localhost:5000/debug/${baseFilename}_page1_debug.png`);
    }
  }, [filename]);

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
      const cleanedValue = value.replace(/m²|m2|kvm/gi, "").trim();
      
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

  /**
   * Opens the debug image dialog
   */
  const handleOpenDebugDialog = () => {
    setDebugDialogOpen(true);
  };

  /**
   * Closes the debug image dialog
   */
  const handleCloseDebugDialog = () => {
    setDebugDialogOpen(false);
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

        <div className="pdf-preview-container" style={{ position: "relative" }}>
          {/* Debug button in top right corner */}
          <Tooltip title="Vis pre-processeret billede">
            <IconButton
              onClick={handleOpenDebugDialog}
              sx={{
                position: "absolute",
                top: "5px",
                right: "18px",
                zIndex: 10,
                width: 37,
                height: 37,
                backgroundColor: "#ff8308",
                color: "white",
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
                "&:hover": {
                  backgroundColor: "#aa5807",
                },
                // Increase icon size
                '& .MuiSvgIcon-root': {
                  fontSize: '1.75rem'
                }
              }}
            >
              <BugReportIcon />
            </IconButton>
          </Tooltip>
          
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

      {/* Debug Image Dialog */}
      <Dialog
        open={debugDialogOpen}
        onClose={handleCloseDebugDialog}
        maxWidth="lg"
        fullWidth
      >
      <DialogTitle>
        Ignoreret indhold:
        &nbsp;<span className="red-indicator" />&nbsp;
        Typisk logo og firmanavn,
        &nbsp;<span className="yellow-indicator" />&nbsp;
        Formodet tilsendingsadresse.
        <IconButton onClick={handleCloseDebugDialog} size="small" sx={{ position: "absolute", right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
        <DialogContent>
          {debugImagePath && (
            <img 
              src={debugImagePath} 
              alt="Debug visualisering" 
              style={{ width: "100%", height: "auto" }}
              onError={(e) => {
                // If image fails to load, show a placeholder with error message
                const imgElement = e.currentTarget;
                imgElement.onerror = null; // Prevent infinite error loop
                imgElement.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23ccc' d='M21 5v6.59l-3-3.01-4 4.01-4-4-4 4-3-3.01V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2zm-3 6.42l3 3.01V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6.58l3 2.99 4-4 4 4 4-4z'/%3E%3C/svg%3E";
                imgElement.alt = "Kunne ikke indlæse debug billede";
                imgElement.style.backgroundColor = "#f0f0f0";
                imgElement.style.padding = "100px";
                imgElement.style.boxSizing = "border-box";
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RevisionPage;