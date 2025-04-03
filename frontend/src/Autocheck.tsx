// Autocheck.tsx
import CheckIcon from "@mui/icons-material/Check";
import { Fade } from "@mui/material";
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
    Backdrop
} from "@mui/material";
import logo from "./assets/logo.png";

const Home: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrStatus, setOcrStatus] = useState("");
    const [mainProgress, setMainProgress] = useState(0);
    const [mainStatus, setMainStatus] = useState("");
    const [circleStates, setCircleStates] = useState<boolean[]>([true, true, true, true, true, false]);
    const [rows, setRows] = useState([
        { id: "Adresse:", expected: "", received: "", confidence: "" },
        { id: "Areal:", expected: "", received: "", confidence: "" },
        { id: "By:", expected: "", received: "", confidence: "" },
    ]);

    const navigate = useNavigate();
    const location = useLocation();
    const { filename } = location.state || {};

    const handleAccept = () => {
        setCircleStates(prev => prev.map((state, index) => index === 5 ? true : state));
        setOpen(false);
    };

    const handleDialogOpen = async () => {
        setIsLoading(true);
        setOcrProgress(0);
        setMainProgress(0);
        setOcrStatus("Starter...");
        setMainStatus("Venter på scanning...");

        await fetch("http://localhost:5000/reset-progress", { method: "POST" });

        const pollProgress = async () => {
            try {
                const res = await fetch(`http://localhost:5000/progress?filename=${filename}`);
                const data = await res.json();
                setOcrProgress(Math.round((data.ocr?.progress || 0) * 100));
                setOcrStatus(data.ocr?.status || "");
                setMainProgress(Math.round((data.main?.progress || 0) * 100));
                setMainStatus(data.main?.status || "");

                if ((data.main?.progress || 0) < 1) {
                    setTimeout(pollProgress, 200);
                }
            } catch (err) {
                console.error("Error polling progress:", err);
            }
        };

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

            const updatedRows = rows.map((row) => {
                const match = data.find((item: any) => item.id === row.id);
                return match ? { ...row, ...match } : row;
            });

            setRows(updatedRows);
            setOpen(true);
        } catch (error) {
            console.error("Failed to trigger Python script:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="app-container">
            <div className="logo-container">
                <img src={logo} alt="Logo" className="logo" />
            </div>

            <Container maxWidth="lg" className="content-container">
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
                                            onClick={() => index === 5 && handleDialogOpen()}
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

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Brandpolice for: {filename}</DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell></TableCell>
                                    <TableCell>Forventet:</TableCell>
                                    <TableCell>Modtaget:</TableCell>
                                    <TableCell>Sikkerhed:</TableCell>
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
                        onClick={() => navigate("/revision", { state: { filename, rows } })}
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ marginTop: "10px", color: "white" }}
                        >
                        Revidér
                    </Button>

                    <Button
                        onClick={handleAccept}
                        fullWidth
                        variant="contained"
                        color="success"
                        sx={{ marginTop: "10px" }}
                    >
                        Acceptér
                    </Button>
                </DialogContent>
            </Dialog>

            <Backdrop open={isLoading} sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Box display="flex" gap={6} justifyContent="center">
                    {[
                        {
                            // OCR circle configuration
                            label: "OCR",
                            progress: ocrProgress,
                            status: ocrStatus,
                            type: "ocr"
                        },
                        {
                            // Analyse circle configuration
                            label: "Analyse",
                            progress: mainProgress,
                            status: mainStatus,
                            type: "main"
                        }
                    ].map(({ label, progress, status, type }, index) => {
                        // Determine if the current circle is complete (progress equals 100)
                        const isComplete = progress === 100;
                        // Fixed circle dimensions and text container height
                        const circleHeight = 100;
                        const textContainerHeight = 40;

                        // Compute variant, value, and overlay text based on type and progress:
                        let variant, computedValue, computedText;

                        if (type === "ocr") {
                            // OCR circle:
                            if (ocrProgress < 100) {
                                variant = "indeterminate"; // while not finished, show indeterminate
                                computedText = `${ocrProgress}%`;
                            } else {
                                variant = "determinate"; // when finished, show determinate with value 100
                                computedValue = ocrProgress; // 100
                                computedText = `${ocrProgress}%`;
                            }
                        } else if (type === "main") {
                            // Analyse circle:
                            if (ocrProgress < 100) {
                                // While OCR is running, force the circle to be fully drawn (100)
                                // but overlay text shows "0%"
                                variant = "determinate";
                                computedValue = 100;
                                computedText = "0%";
                            } else {
                                // Once OCR is finished:
                                if (mainProgress < 100) {
                                    variant = "indeterminate"; // show as indeterminate while analysis is running
                                    computedText = `${mainProgress}%`;
                                } else {
                                    variant = "determinate"; // when analysis is finished, show determinate
                                    computedValue = mainProgress; // 100
                                    computedText = `${mainProgress}%`;
                                }
                            }
                        }

                        return (
                            <Box key={index} width={150} position="relative" textAlign="center">
                                {/* Absolutely positioned circle container at the top */}
                                <Box
                                    position="absolute"
                                    top={0}
                                    left="50%"
                                    sx={{ transform: "translateX(-50%)" }}
                                >
                                    <Box position="relative" display="inline-flex" width={100} height={circleHeight}>
                                        {/* Green overlay when complete */}
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

                                        {/* Render the CircularProgress based on variant */}
                                        {variant === "indeterminate" ? (
                                            <CircularProgress
                                                variant="indeterminate"
                                                size={100}
                                                thickness={5}
                                                sx={{
                                                    width: 100,
                                                    height: circleHeight,
                                                    color: "inherit"
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
                                                    color: isComplete ? "transparent" : "inherit"
                                                }}
                                            />
                                        )}

                                        {/* Overlay percentage text */}
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
                                                    {`${computedText}`}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Overlay check icon when complete */}
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

                                {/* Spacer to reserve fixed space for the circle */}
                                <Box sx={{ height: circleHeight }} />

                                {/* Fixed-height text container with overflow visible */}
                                <Box
                                    mt={2}
                                    width="100%"
                                    sx={{
                                        height: textContainerHeight,
                                        overflow: "visible"
                                    }}
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
                                            textOverflow: "unset"
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