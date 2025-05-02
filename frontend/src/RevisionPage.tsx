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
import { yellow } from "@mui/material/colors";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import logo from "./assets/logo.png";
import "./RevisionPage.css";

import { Viewer, Worker } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";
import type { Store } from "@react-pdf-viewer/core";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";

interface RowData {
  id: string;
  expected: string;
  received: string;
  confidence: string;
}

// OCR confusion mapping for fallback fuzzy
const OCR_FUZZY_MAP: Record<string, string[]> = {
  '0': ['O'], 'O': ['0'],
  '1': ['I', 'l'], 'I': ['1', 'l'], 'l': ['1', 'I'],
  '8': ['B'], 'B': ['8'],
  '5': ['S'], 'S': ['5'],
};

// Build character-class regex string for each char
const PATTERN_MAP: Record<string, string> = Object.entries(OCR_FUZZY_MAP).reduce(
  (acc, [char, alts]) => {
    const chars = Array.from(new Set([char, ...alts])).map(c => c.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join('');
    acc[char] = `[${chars}]`;
    return acc;
  }, {} as Record<string, string>
);

// Escape RegExp special chars
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build regex-class pattern for fuzzy matching
function buildRegexClass(text: string): string {
  return text
    .split('')
    .map(ch => PATTERN_MAP[ch] || escapeRegExp(ch))
    .join('');
}

// Generate simple fuzzy variants by one-char swaps
function generateFuzzyCandidates(text: string): string[] {
  const set = new Set<string>([text]);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const alts = OCR_FUZZY_MAP[ch];
    if (alts) {
      alts.forEach(alt => set.add(text.slice(0, i) + alt + text.slice(i + 1)));
    }
  }
  return Array.from(set);
}

// Delay helper to wait for plugin store
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const RevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { filename, rows } = location.state || {};

  const displayRows: RowData[] = rows && rows.length
    ? rows
    : [
        { id: "Adresse:", expected: "N/A", received: "N/A", confidence: "N/A" },
        { id: "By:", expected: "N/A", received: "N/A", confidence: "N/A" },
        { id: "Areal:", expected: "N/A", received: "N/A", confidence: "N/A" },
      ];

  const pdfPath = filename
    ? `http://localhost:5000/pdf/${filename}`
    : "https://dagrs.berkeley.edu/sites/default/files/2020-01/sample.pdf";

  // Plugin with dynamic regex support
  const searchPluginInstance = searchPlugin({
    keywordRegexp: (keyword: string) => new RegExp(keyword, 'gi'),
  });
  const { highlight, jumpToNextMatch, clearHighlights } = searchPluginInstance;
  const pluginStore = (searchPluginInstance as unknown as { store: Store }).store;

  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [lastSearchTerm, setLastSearchTerm] = useState<string | null>(null);

  // Direct DOM-based approach to detect highlights in the PDF viewer
  const detectHighlightsInDOM = async (): Promise<boolean> => {
    return new Promise(resolve => {
      // Give the viewer time to render highlights
      setTimeout(() => {
        try {
          // Look for highlight elements in the DOM
          const highlightElements = document.querySelectorAll('.rpv-search__highlight');
          const hasHighlights = highlightElements.length > 0;
          console.log(`DOM check found ${highlightElements.length} highlight elements`);
          resolve(hasHighlights);
        } catch (error) {
          console.error("Error checking for highlights in DOM:", error);
          resolve(false);
        }
      }, 10); // Wait 300ms for rendering
    });
  };

  // Try to search for a term with direct DOM observation
  const safeSearch = async (term: string): Promise<boolean> => {
    try {
      console.log(`Trying search term: "${term}"`);
      clearHighlights();
      
      // Perform the search
      await highlight(term);
      
      // Check if any highlights appear in the DOM
      const hasHighlights = await detectHighlightsInDOM();
      
      if (hasHighlights) {
        console.log(`Term "${term}" produced visible highlights`);
        return true;
      }
      
      console.log(`Term "${term}" did not produce any visible highlights`);
      return false;
    } catch (error) {
      console.error(`Error searching for "${term}":`, error);
      return false;
    }
  };

  // Try all candidates in sequence until one succeeds
  const tryFuzzySearch = async (candidates: string[]): Promise<string | null> => {
    for (const term of candidates) {
      if (await safeSearch(term)) {
        return term;
      }
    }
    return null;
  };

  const handleSearchClick = async (rowId: string, value: string) => {
    if (!value || value === "N/A") return;

    console.log(`Button clicked for "${rowId}" with value: "${value}"`);

    // strip units for Areal
    let baseTerm = value;
    if (rowId === "Areal:") {
      // 1) strip out the units "kvm" and "m2"
      const cleaned = value.replace(/\b(?:kvm|m2)\b/gi, "").trim();
      // 2) grab the first numeric sequence (e.g. "198")
      const m = cleaned.match(/\d+(?:[.,]\d+)?/);
      baseTerm = m ? m[0] : value;
    }    
    console.log(`Base search term: "${baseTerm}"`);

    // Repeat click: next match
    if (activeRowId === rowId && lastSearchTerm === baseTerm) {
      console.log(`Jumping to next match for: "${baseTerm}"`);
      jumpToNextMatch();
      return;
    }

    // Generate all possible fuzzy variants
    const variants = generateFuzzyCandidates(baseTerm);
    console.log(`Generated ${variants.length} fuzzy variants:`, variants);
    
    // Try to find a successful match
    const matchedTerm = await tryFuzzySearch(variants);
    
    if (matchedTerm) {
      console.log(`Successfully found match for: "${matchedTerm}"`);
      setActiveRowId(rowId);
      setLastSearchTerm(baseTerm); // Keep the original term for next button
      jumpToNextMatch();
    } else {
      clearHighlights();
      setActiveRowId(null);
      setLastSearchTerm(null);
      console.log("Search failed: No matches found for any variant");
      
      // Additional fallback - try a direct regex search as last resort
      try {
        const regexPattern = buildRegexClass(baseTerm);
        console.log(`Trying fallback regex pattern: ${regexPattern}`);
        await highlight(regexPattern);
        
        // Check for visible highlights in the DOM
        const hasHighlights = await detectHighlightsInDOM();
        if (hasHighlights) {
          console.log(`Fallback regex produced visible highlights`);
          setActiveRowId(rowId);
          setLastSearchTerm(baseTerm);
          jumpToNextMatch();
        }
      } catch (error) {
        console.error("Fallback regex search failed:", error);
      }
    }
  };

  const handleReject = () => {
    const stored = localStorage.getItem("rejectedFiles");
    const rejected: string[] = stored ? JSON.parse(stored) : [];
    if (filename && !rejected.includes(filename)) rejected.push(filename);
    localStorage.setItem("rejectedFiles", JSON.stringify(rejected));
    navigate("/", { state: { rejectedFiles: rejected } });
  };

  const handleAccept = () => {
    const storedRejected = localStorage.getItem("rejectedFiles");
    let rejected: string[] = storedRejected ? JSON.parse(storedRejected) : [];
    rejected = rejected.filter((f) => f !== filename);
    localStorage.setItem("rejectedFiles", JSON.stringify(rejected));

    const storedAccepted = localStorage.getItem("acceptedFiles");
    const accepted: string[] = storedAccepted ? JSON.parse(storedAccepted) : [];
    if (filename && !accepted.includes(filename)) accepted.push(filename);
    localStorage.setItem("acceptedFiles", JSON.stringify(accepted));

    navigate("/", { state: { acceptedFiles: accepted } });
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
                  <TableCell />
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Forventet:
                    <Tooltip title="Informationen fundet i databasen omkring sagen"> 
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Fundet:
                    <Tooltip title="Programmet har lavet en avanceret FAISS AI søgning">
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Match:
                    <Tooltip componentsProps={{ tooltip: { sx: { maxWidth: 500 } } }} title={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CancelIcon color="error" fontSize="small" /> Intet match<RemoveCircleIcon sx={{ color: yellow[700] }} fontSize="small" /> Delvist match<CheckCircleIcon color="success" fontSize="small" /> Fuld match</span>}>
                      <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Handling</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {displayRows.map((row) => {
                  const raw = parseFloat(row.confidence);
                  const isLow = !isNaN(raw) && raw < 80;
                  const isMid = !isNaN(raw) && raw >= 80 && raw < 100;
                  const isEnabled = !isNaN(raw) && raw >= 80;
                  const isActive = activeRowId === row.id;
                  const buttonLabel = isActive ? "Næste" : "Hop til";

                  let confidenceIcon: React.ReactNode;
                  if (!isNaN(raw)) {
                    if (raw === 100) confidenceIcon = <CheckCircleIcon color="success" />;
                    else if (raw > 80) confidenceIcon = <RemoveCircleIcon sx={{ color: yellow[700] }} />;
                    else confidenceIcon = <CancelIcon color="error" />;
                  } else {
                    confidenceIcon = row.confidence;
                  }

                  const button = (
                    <Button
                      variant="contained"
                      className="table-action-button"
                      onClick={() => handleSearchClick(row.id, row.received)}
                      disabled={!isEnabled}
                      sx={{ backgroundColor: !isEnabled ? "#ccc" : undefined, color: !isEnabled ? "#666" : undefined }}
                    >
                      {buttonLabel}
                    </Button>
                  );

                  return (
                  <TableRow key={row.id} sx={{ backgroundColor: isLow ? "rgba(255,0,0,0.1)" : isMid ? "rgba(255,255,0,0.1)" : undefined }}>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      {row.id}
                      {row.id === "Areal:" && (
                        <Tooltip title="Kvadratmeter på ejendommen">
                          <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>{row.expected}</TableCell>
                    <TableCell>{isLow ? "–" : row.received}</TableCell>
                    <TableCell>{confidenceIcon}</TableCell>
                    <TableCell>{!isEnabled ? <Tooltip title="Min. 80% sikkerhed kræves"><span>{button}</span></Tooltip> : button}</TableCell>
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
        <Button onClick={handleReject} variant="contained" color="error" sx={{ width: 200, height: 40 }}>
          Afvis dokument
        </Button>
        <Button onClick={handleAccept} variant="contained" color="success" sx={{ width: 200, height: 40 }}>
          Acceptér dokument
        </Button>
      </div>
    </div>
  );
};

export default RevisionPage;