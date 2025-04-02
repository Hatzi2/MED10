// Autocheck.tsx
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
    const [progressValue, setProgressValue] = useState(0);
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
        setProgressValue(0);

        // 🔧 Reset progress file BEFORE polling begins
        await fetch("http://localhost:5000/reset-progress", {
            method: "POST",
        });

        const pollProgress = async () => {
            try {
                const res = await fetch("http://localhost:5000/progress");
                const data = await res.json();
                setProgressValue(Math.round(data.progress * 100));
                if (data.progress < 1) {
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
            console.log("Updated rows with fetched data:", updatedRows);
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
                        onClick={() => navigate("/revision")}
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

            <Backdrop open={isLoading} sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: "column" }}>
                <Box position="relative" display="inline-flex">
                    <CircularProgress size={100} thickness={5} />
                    <Box
                        top={0}
                        left={0}
                        bottom={0}
                        right={0}
                        position="absolute"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Typography variant="h6" component="div" sx={{ color: "#ffffff" }}>
                            {`${progressValue}%`}
                        </Typography>
                    </Box>
                </Box>
            </Backdrop>
        </div>
    );
};

export default Home;