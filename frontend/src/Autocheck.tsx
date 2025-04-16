import CheckIcon from "@mui/icons-material/Check";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Fade, Tooltip } from "@mui/material";
import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Grid,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import logo from "./assets/logo.png";
import "./App.css";

const Home: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [mainProgress, setMainProgress] = useState(0);
  const [mainStatus, setMainStatus] = useState("");

  // Circle state array – index 5 corresponds to "Brandpolice"
  const [circleStates] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    false,
  ]);

  // Initial rows data template.
  const [rows, setRows] = useState([
    { id: "Adresse:", expected: "", received: "", confidence: "" },
    { id: "Areal:", expected: "", received: "", confidence: "" },
    { id: "By:", expected: "", received: "", confidence: "" },
  ]);
  // Use a ref to store the most recent rows data for use in polling.
  const rowsRef = useRef(rows);

  const navigate = useNavigate();
  const location = useLocation();
  const { filename } = location.state || {};

  // Handler for the "Acceptér" button (if needed elsewhere)
  const handleAccept = () => {
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

  // Poll progress from backend.
  // When both OCR and main progress reach 100%, wait 1 second then navigate
  // to the revision page, passing the up-to-date rows from rowsRef.
  const pollProgress = async () => {
    try {
      const res = await fetch(`http://localhost:5000/progress?filename=${filename}`);
      const data = await res.json();

      const ocrProg = Math.round((data.ocr?.progress || 0) * 100);
      const mainProg = Math.round((data.main?.progress || 0) * 100);

      setOcrProgress(ocrProg);
      setOcrStatus(data.ocr?.status || "");
      setMainProgress(mainProg);
      setMainStatus(data.main?.status || "");

      if (ocrProg === 100 && mainProg === 100) {
        setTimeout(() => {
          setIsLoading(false);
          // Use the latest rows via rowsRef.current
          navigate("/revision", { state: { filename, rows: rowsRef.current } });
        }, 1000);
      } else {
        setTimeout(pollProgress, 200);
      }
    } catch (err) {
      console.error("Error polling progress:", err);
    }
  };

  // When "Brandpolice" is clicked, run the main.py script via /run-script
  // and then update the rows; polling then uses rowsRef to navigate.
  const handleBrandpoliceClick = async () => {
    setIsLoading(true);
    setOcrProgress(0);
    setMainProgress(0);
    setOcrStatus("Starter...");
    setMainStatus("Venter på scanning...");

    // Reset the backend progress indicator.
    await fetch("http://localhost:5000/reset-progress", { method: "POST" });

    // Begin polling progress.
    pollProgress();

    try {
      const response = await fetch("http://localhost:5000/run-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();
      if (data.error) {
        console.error("Backend error:", data.error);
        return;
      }

      // Update the rows data based on the response.
      const updatedRows = rows.map((row) => {
        const match = data.find((item: any) => item.id === row.id);
        return match ? { ...row, ...match } : row;
      });
      // Update both state and the ref.
      setRows(updatedRows);
      rowsRef.current = updatedRows;
    } catch (error) {
      console.error("Failed to trigger Python script:", error);
    }
  };

  return (
    <div className="app-container">
      <div className="logo-container">
        <img
          src={logo}
          alt="Logo"
          className="logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        />
      </div>

      {/* Display selected filename */}
      <div className="file-name-display">
        <Typography variant="h6">
          {filename ? `Valgt fil: ${filename}` : "Ingen fil valgt"}
        </Typography>
      </div>

      <Container
        maxWidth="lg"
        className="content-container"
        style={{ position: "relative", zIndex: 1 }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={8}>
            <Grid container spacing={3}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Box className="placeholder-box">
                    <Typography variant="h6">
                      {index === 5 ? "Placeholder 6" : `Placeholder ${index + 1}`}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box className="new-component-box">
              <Grid
                container
                direction="column"
                spacing={1}
                style={{ height: "100%" }}
              >
                {circleStates.map((isGreen, index) => (
                  <Grid item key={index} style={{ flex: 1 }}>
                    <Box
                      className="slice-box"
                      onClick={() => index === 5 && handleBrandpoliceClick()}
                      style={{ cursor: index === 5 ? "pointer" : "default" }}
                    >
                      <Typography variant="h6">
                        {index === 5 ? "Brandpolice" : `Autocheck ${index + 1}`}
                      </Typography>
                      <div className="circle-container">
                        <div className={isGreen ? "green-circle" : "red-circle"}></div>
                      </div>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Simple centered loading backdrop with a single CircularProgress indicator */}
      <Backdrop
        open={isLoading}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress color="inherit" size={80} />
      </Backdrop>
    </div>
  );
};

export default Home;
