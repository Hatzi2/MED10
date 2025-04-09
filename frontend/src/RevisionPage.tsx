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
                { id: "Adresse:", expected: "N/A", received: "N/A", confidence: "N/A" },
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

    return (
        <div className="revision-container">
            <div className="logo-container">
                <img src={logo} alt="Logo" className="logo" />
            </div>

            <div className="content-container">
                <TableContainer component={Paper} className="revision-table-container" sx={{ backgroundColor: "#fafafa" }}>
                    <div className="table-inner-padding">
                        <Table className="revision-table">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: "bold" }}></TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        Forventet:
                                        <Tooltip title="Den værdi vi forventer at se ifølge vores data">
                                            <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        Modtaget:
                                        <Tooltip title="Den værdi fundet i dokumentet">
                                            <HelpOutlineIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }} />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        Sikkerhed:
                                        <Tooltip title="Hvor sikker modellen er på matchet (%)">
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

                <div className="pdf-preview-container" style={{ height: "600px", width: "100%", marginTop: "20px" }}>
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.0.279/build/pdf.worker.min.js">
                        <Viewer fileUrl={pdfPath} plugins={[searchPluginInstance]} />
                    </Worker>
                </div>
            </div>

            <Button
                onClick={() => navigate("/")}
                variant="contained"
                color="primary"
                className="back-button"
                sx={{ marginTop: "20px" }}
            >
                Tilbage
            </Button>
        </div>
    );
};

export default RevisionPage;
