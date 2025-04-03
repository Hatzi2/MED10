import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import "./HomePage.css";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="home-container">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
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
                <TableCell sx={{ fontWeight: "bold" }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{file}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      className="table-action-button"
                      onClick={() =>
                        navigate("/main", { state: { filename: file } })
                      }
                    >
                      Gå til Autocheck
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
