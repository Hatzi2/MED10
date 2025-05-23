import CheckIcon from "@mui/icons-material/Check";
import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Backdrop,
  Fade,
} from "@mui/material";
import logo from "./assets/logo.png";
import "./App.css";

const Home: React.FC = () => {
  // Local state for progress and data
  const [isLoading, setIsLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [mainProgress, setMainProgress] = useState(0);
  const [mainStatus, setMainStatus] = useState("");

  // Data rows from backend
  const [rows, setRows] = useState([
    { id: "Adresse:", expected: "", received: "", confidence: "" },
    { id: "By:", expected: "", received: "", confidence: "" },
    { id: "Areal:", expected: "", received: "", confidence: "" },
  ]);

  // Keep a ref to the latest rows for navigation
  const updatedRowsRef = useRef(rows);
  const navigate = useNavigate();
  const location = useLocation();
  const { filename } = location.state || {};

  const stored = localStorage.getItem("acceptedFiles");
  const acceptedFiles: string[] = stored ? JSON.parse(stored) : [];
  const brandpoliceIsGreen = Boolean(filename && acceptedFiles.includes(filename));

  // All other slices stay true (green), but index 5 is dynamic
  const circleStates = [
    brandpoliceIsGreen, true, true, true, true, true
  ];

  // Poll progress from backend, then navigate with data when done
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
          const finalRows = updatedRowsRef.current;
          navigate("/revision", { state: { filename, rows: finalRows } });
        }, 1000);
      } else {
        setTimeout(pollProgress, 200);
      }
    } catch (err) {
      console.error("Error polling progress:", err);
    }
  };

  // Start the Brandpolice process
  const handleBrandpolice = async () => {
    setIsLoading(true);
    setOcrProgress(0);
    setMainProgress(0);
    setOcrStatus("Starter...");
    setMainStatus("Venter på scanning...");

    await fetch("http://localhost:5000/reset-progress", { method: "POST" });
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

      // Update rows and ref based on data from the backend
      const updatedRows = rows.map((row) => {
        const match = data.find((item: any) => item.id === row.id);
        return match ? { ...row, ...match } : row;
      });
      setRows(updatedRows);
      updatedRowsRef.current = updatedRows;
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

      {/* Filename display */}
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
                    <Typography variant="h6">Placeholder {index + 1}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box className="new-component-box">
              <Grid container direction="column" spacing={1} style={{ height: "100%" }}>
                {circleStates.map((isGreen, index) => (
                  <Grid item key={index} style={{ flex: 1 }}>
                    <Box
                      className="slice-box"
                      onClick={() => index === 0 && handleBrandpolice()}
                      style={{ cursor: index === 0 ? "pointer" : "default" }}
                    >
                      <Typography variant="h6">
                        {index === 0 ? "Brandpolice" : `Autocheck ${index + 1}`}
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

      {/* Loading backdrop */}
      <Backdrop open={isLoading} sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Box display="flex" gap={6} justifyContent="center">
          {[
            { label: "Scanner dokument", progress: ocrProgress, status: ocrStatus, type: "ocr" },
            { label: "Analyse", progress: mainProgress, status: mainStatus, type: "main" },
          ].map(({ label, progress, status, type }, index) => {
            const isComplete = progress === 100;
            const circleHeight = 100;
            const textContainerHeight = 40;
            let variant: any, computedValue: number | undefined, computedText: string;

            if (type === "ocr") {
              if (ocrProgress < 100) {
                variant = "indeterminate";
                computedText = `${ocrProgress}%`;
              } else {
                variant = "determinate";
                computedValue = ocrProgress;
                computedText = `${ocrProgress}%`;
              }
            } else {
              if (ocrProgress < 100) {
                variant = "determinate";
                computedValue = 100;
                computedText = "0%";
              } else if (mainProgress < 100) {
                variant = "indeterminate";
                computedText = `${mainProgress}%`;
              } else {
                variant = "determinate";
                computedValue = mainProgress;
                computedText = `${mainProgress}%`;
              }
            }

            return (
              <Box key={index} width={150} position="relative" textAlign="center">
                <Box position="absolute" top={0} left="50%" sx={{ transform: "translateX(-50%)" }}>
                  <Box position="relative" display="inline-flex" width={100} height={circleHeight}>
                    {isComplete && (
                      <Fade in timeout={400}>
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            backgroundColor: "success.main",
                            zIndex: 1,
                          }}
                        />
                      </Fade>
                    )}
                    {variant === "indeterminate" ? (
                      <CircularProgress
                        variant="indeterminate"
                        size={100}
                        thickness={5}
                        sx={{ width: 100, height: circleHeight, color: "inherit" }}
                      />
                    ) : (
                      <CircularProgress
                        variant="determinate"
                        value={computedValue}
                        size={100}
                        thickness={5}
                        sx={{ width: 100, height: circleHeight, color: isComplete ? "transparent" : "inherit" }}
                      />
                    )}
                    {!isComplete && (
                      <Box
                        top={0}
                        left={0}
                        bottom={0}
                        right={0}
                        position="absolute"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        zIndex={2}
                      >
                        <Typography variant="h6" sx={{ color: "#fff", minWidth: 40, textAlign: "center" }}>
                          {computedText}
                        </Typography>
                      </Box>
                    )}
                    {isComplete && (
                      <Fade in timeout={400}>
                        <Box
                          top={0}
                          left={0}
                          bottom={0}
                          right={0}
                          position="absolute"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          zIndex={3}
                        >
                          <CheckIcon sx={{ fontSize: 40, color: "#fff" }} />
                        </Box>
                      </Fade>
                    )}
                  </Box>
                </Box>
                <Box sx={{ height: circleHeight }} />
                <Box mt={2} width="100%" sx={{ height: textContainerHeight, overflow: "visible" }}>
                  <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "normal", overflow: "visible", textOverflow: "unset" }}>
                    {status}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Backdrop>
    </div>
  );
};

export default Home;
