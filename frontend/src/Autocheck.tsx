import CheckIcon from "@mui/icons-material/Check";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Fade, Tooltip } from "@mui/material";
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Grid,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import logo from "./assets/logo.png";
import "./App.css";

const Home: React.FC = () => {
  // Local state for dialog & progress
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [mainProgress, setMainProgress] = useState(0);
  const [mainStatus, setMainStatus] = useState("");

  // Circle state array – index 5 is used for "Brandpolice"
  const [circleStates] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    false,
  ]);

  // Data rows from backend (for demonstration)
  const [rows, setRows] = useState([
    { id: "Adresse:", expected: "", received: "", confidence: "" },
    { id: "Areal:", expected: "", received: "", confidence: "" },
    { id: "By:", expected: "", received: "", confidence: "" },
  ]);

  const navigate = useNavigate();
  const location = useLocation();
  // Retrieve the filename passed from Homepage
  const { filename } = location.state || {};

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

  // Poll progress from backend, and wait 2s after both circles are 100%
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

      // If both are 100%, wait 2s then open the dialog
      if (ocrProg === 100 && mainProg === 100) {
        setTimeout(() => {
          setIsLoading(false);
          setOpen(true);
        }, 1000);
      } else {
        setTimeout(pollProgress, 200);
      }
    } catch (err) {
      console.error("Error polling progress:", err);
    }
  };

  // Function to start the process and poll for backend progress
  const handleDialogOpen = async () => {
    setIsLoading(true);
    setOcrProgress(0);
    setMainProgress(0);
    setOcrStatus("Starter...");
    setMainStatus("Venter på scanning...");

    await fetch("http://localhost:5000/reset-progress", { method: "POST" });

    // Begin polling progress
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

      // Update rows based on data from the backend
      const updatedRows = rows.map((row) => {
        const match = data.find((item: any) => item.id === row.id);
        return match ? { ...row, ...match } : row;
      });
      setRows(updatedRows);

      // Don't open the dialog here; we do it after the 2-second delay in pollProgress
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
                      onClick={() => index === 5 && handleDialogOpen()}
                      style={{ cursor: index === 5 ? "pointer" : "default" }}
                    >
                      <Typography variant="h6">
                        {index === 5 ? "Brandpolice" : `Autocheck ${index + 1}`}
                      </Typography>
                      <div className="circle-container">
                        <div
                          className={isGreen ? "green-circle" : "red-circle"}
                        ></div>
                      </div>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Autocheck dialog showing details */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Brandpolice for: {filename}</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>
                    Forventet:
                    <Tooltip title="Informationen fundet i databasen omkring sagen">
                      <HelpOutlineIcon
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    Modtaget:
                    <Tooltip title="Programmet har lavet en avanceret FAISS AI søgning efter det forventede resultat, og viser her det tætteste match, som det kunne finde">
                      <HelpOutlineIcon
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    Sikkerhed:
                    <Tooltip title="Hvor ens (%) det forventede og fundne information er">
                      <HelpOutlineIcon
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.expected}</TableCell>
                    <TableCell>{row.received}</TableCell>
                    <TableCell>{row.confidence}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            onClick={handleReject}
            fullWidth
            variant="contained"
            color="error"
            sx={{ marginTop: "10px", color: "white" }}
          >
            Afvis dokument
          </Button>

          <Button
            onClick={() => navigate("/revision", { state: { filename, rows } })}
            fullWidth
            variant="contained"
            color="primary"
            sx={{ marginTop: "10px", color: "white" }}
          >
            Revidér dokument
          </Button>

          <Button
            onClick={handleAccept}
            fullWidth
            variant="contained"
            color="success"
            sx={{ marginTop: "10px" }}
          >
            Acceptér dokument
          </Button>
        </DialogContent>
      </Dialog>

      <Backdrop
        open={isLoading}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Box display="flex" gap={6} justifyContent="center">
          {[
            {
              label: "OCR",
              progress: ocrProgress,
              status: ocrStatus,
              type: "ocr",
            },
            {
              label: "Analyse",
              progress: mainProgress,
              status: mainStatus,
              type: "main",
            },
          ].map(({ label, progress, status, type }, index) => {
            const isComplete = progress === 100;
            const circleHeight = 100;
            const textContainerHeight = 40;
            let variant, computedValue, computedText;

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
              // For "Analyse," only start animating after OCR is complete
              if (ocrProgress < 100) {
                variant = "determinate";
                computedValue = 100;
                computedText = "0%";
              } else {
                if (mainProgress < 100) {
                  variant = "indeterminate";
                  computedText = `${mainProgress}%`;
                } else {
                  variant = "determinate";
                  computedValue = mainProgress;
                  computedText = `${mainProgress}%`;
                }
              }
            }

            return (
              <Box
                key={index}
                width={150}
                position="relative"
                textAlign="center"
              >
                <Box
                  position="absolute"
                  top={0}
                  left="50%"
                  sx={{ transform: "translateX(-50%)" }}
                >
                  <Box
                    position="relative"
                    display="inline-flex"
                    width={100}
                    height={circleHeight}
                  >
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
                        sx={{
                          width: 100,
                          height: circleHeight,
                          color: "inherit",
                        }}
                      />
                    ) : (
                      <CircularProgress
                        variant="determinate"
                        value={computedValue}
                        size={100}
                        thickness={5}
                        sx={{
                          width: 100,
                          height: circleHeight,
                          color: isComplete ? "transparent" : "inherit",
                        }}
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
                        <Typography
                          variant="h6"
                          sx={{
                            color: "#fff",
                            minWidth: 40,
                            textAlign: "center",
                          }}
                        >
                          {computedText}
                        </Typography>
                      </Box>
                    )}

                    <Fade in={isComplete} timeout={400}>
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
                        <CheckIcon sx={{ color: "#fff", fontSize: 40 }} />
                      </Box>
                    </Fade>
                  </Box>
                </Box>

                <Box sx={{ height: circleHeight }} />

                <Box
                  mt={2}
                  width="100%"
                  sx={{ height: textContainerHeight, overflow: "visible" }}
                >
                  <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                    {label}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#ccc",
                      whiteSpace: "normal",
                      overflow: "visible",
                      textOverflow: "unset",
                    }}
                  >
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
