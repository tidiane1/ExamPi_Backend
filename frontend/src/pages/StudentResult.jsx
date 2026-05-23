import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

function StudentResult() {
  const navigate = useNavigate();

  const [resultData] = useState(() => {
    const storedResult = localStorage.getItem("student_result");
    return storedResult ? JSON.parse(storedResult) : null;
  });

  const handleBack = () => {
    localStorage.removeItem("student_result");
    navigate("/student/login");
  };

  if (!resultData) {
    navigate("/student/login");
    return null;
  }

  const result = resultData.result;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Paper sx={{ width: 520, p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Résultat de l’examen
        </Typography>

        <Alert
          severity={
            result?.validation_status === "passed"
              ? "success"
              : resultData.status === "stopped"
              ? "error"
              : "warning"
          }
          sx={{ mb: 3 }}
        >
          {resultData.message || "Examen terminé"}
        </Alert>

        {result ? (
          <Stack spacing={2}>
            <Typography>
              <strong>Score :</strong> {result.score} / {result.totalPoints}
            </Typography>

            <Typography>
              <strong>Pourcentage :</strong> {result.percentage}%
            </Typography>

            <Typography>
              <strong>Bonnes réponses :</strong>{" "}
              {result.correctAnswersCount} / {result.totalQuestions}
            </Typography>

            <Typography>
              <strong>Seuil requis :</strong>{" "}
              {result.success_percentage_required}%
            </Typography>

            {result.validation_status === "passed" ? (
              <Chip label="Réussi" color="success" />
            ) : (
              <Chip label="Échec" color="error" />
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography>
              <strong>Statut :</strong> {resultData.status || "Non défini"}
            </Typography>

            {resultData.cheating_detected === 1 && (
              <Chip
                label="Examen arrêté pour événement de sécurité"
                color="error"
              />
            )}
          </Stack>
        )}

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 4 }}
          onClick={handleBack}
        >
          Retour à la connexion
        </Button>
      </Paper>
    </Box>
  );
}

export default StudentResult;