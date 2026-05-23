import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
} from "@mui/material";

import api from "../api/api";

function TrainerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("formateur@example.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/trainer/login", {
        email,
        password,
      });

      localStorage.setItem("trainer", JSON.stringify(response.data.trainer));
      navigate("/trainer/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Erreur pendant la connexion"
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f5",
      }}
    >
      <Paper sx={{ width: 400, padding: 4 }}>
        <Typography variant="h5" gutterBottom>
          Connexion formateur
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Mot de passe"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
          >
            Se connecter
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default TrainerLogin;