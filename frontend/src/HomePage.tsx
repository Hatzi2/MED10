import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "./assets/logo.png";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import "./HomePage.css";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve accepted/rejected files coming in from navigation state (if any)
  const acceptedFilesFromNav: string[] = location.state?.acceptedFiles || [];
  const rejectedFilesFromNav: string[] = location.state?.rejectedFiles || [];

  // Initialize acceptedFiles state from localStorage or navigation state.
  const [acceptedFiles, setAcceptedFiles] = useState<string[]>(() => {
    const stored = localStorage.getItem("acceptedFiles");
    return stored ? JSON.parse(stored) : acceptedFilesFromNav;
  });

  // Initialize rejectedFiles state from localStorage or navigation state.
  const [rejectedFiles, setRejectedFiles] = useState<string[]>(() => {
    const stored = localStorage.getItem("rejectedFiles");
    return stored ? JSON.parse(stored) : rejectedFilesFromNav;
  });

  // Merge new accepted files coming via navigation state.
  useEffect(() => {
    if (acceptedFilesFromNav.length > 0) {
      const merged = Array.from(
        new Set([...acceptedFiles, ...acceptedFilesFromNav])
      );
      setAcceptedFiles(merged);
      localStorage.setItem("acceptedFiles", JSON.stringify(merged));
    }
  }, [acceptedFilesFromNav]);

  // Merge new rejected files coming via navigation state.
  useEffect(() => {
    if (rejectedFilesFromNav.length > 0) {
      const merged = Array.from(
        new Set([...rejectedFiles, ...rejectedFilesFromNav])
      );
      setRejectedFiles(merged);
      localStorage.setItem("rejectedFiles", JSON.stringify(merged));
    }
  }, [rejectedFilesFromNav]);

  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch the list of files from the backend.
  useEffect(() => {
    fetch("http://localhost:5000/list-files")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFiles(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch file list:", err);
        setLoading(false);
      });
  }, []);

  // Reset accepted and rejected files
  const handleResetAcceptedFiles = () => {
    localStorage.removeItem("acceptedFiles");
    localStorage.removeItem("rejectedFiles");
    setAcceptedFiles([]);
    setRejectedFiles([]);
    // Clear navigation state so old data isn't merged back in.
    navigate(location.pathname, { replace: true, state: {} });
  };

  return (
    <div className="home-container">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
      </div>

      {/* Reset button container above the table (left-aligned) */}
      <div
        className="reset-button-container"
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginBottom: "10px",
        }}
      >
        <Tooltip title="Reset accepted and rejected files">
          <IconButton onClick={handleResetAcceptedFiles} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </div>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} className="home-table-container">
          <Table className="home-table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Filnavn</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Status:
                  <Tooltip
                    title={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          padding: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <div
                            className="red-indicator"
                            style={{ margin: 0 }}
                          />
                          <span>Ikke accepteret</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <div
                            className="yellow-indicator"
                            style={{ margin: 0 }}
                          />
                          <span>Endnu ikke tjekket</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <div
                            className="green-indicator"
                            style={{ margin: 0 }}
                          />
                          <span>Accepteret</span>
                        </div>
                      </div>
                    }
                    componentsProps={{
                      tooltip: {
                        sx: {
                          whiteSpace: "nowrap",
                          maxWidth: "calc(100vw - 20px)",
                          bgcolor: "rgba(97, 97, 97, 0.7)", // change this value for more transparency
                        },
                      },
                    }}
                    PopperProps={{
                      modifiers: [
                        {
                          name: "preventOverflow",
                          enabled: true,
                          options: {
                            boundary: "window",
                          },
                        },
                      ],
                    }}
                  >
                    <HelpOutlineIcon
                      fontSize="small"
                      sx={{ ml: 0.5, verticalAlign: "middle", color: "gray" }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{file}</TableCell>
                  <TableCell>
                    {rejectedFiles.includes(file) ? (
                      <div className="red-indicator" />
                    ) : acceptedFiles.includes(file) ? (
                      <div className="green-indicator" />
                    ) : (
                      <div className="yellow-indicator" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      className="table-action-button"
                      onClick={() =>
                        navigate("/main", { state: { filename: file } })
                      }
                    >
                      Gå til sag
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

export default HomePage;
