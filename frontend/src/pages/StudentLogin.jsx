import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import api from "../api/api";

function StudentLogin() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [matricule, setMatricule] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [examId, setExamId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchExams = async () => {
      try {
        const response = await api.get("/exams");

        if (isMounted) {
          const publishedExams = (response.data.exams || []).filter(
            (exam) => exam.is_published === 1
          );

          setExams(publishedExams);
        }
      } catch (err) {
        if (isMounted) {
          setError("Erreur pendant le chargement des examens");
        }

        console.error(err);
      }
    };

    fetchExams();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartExam = async (e) => {
    e.preventDefault();
    setError("");

    if (!matricule || !secretCode || !examId) {
      setError("Matricule, code secret et examen sont obligatoires");
      return;
    }

    try {
      const response = await api.post("/student/start-exam", {
        matricule,
        secret_code: secretCode,
        exam_id: Number(examId),
      });

      localStorage.setItem("student_exam", JSON.stringify(response.data));

      navigate("/student/exam");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Impossible de démarrer l’examen"
      );
    }
  };

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
      <Paper sx={{ width: 460, p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Connexion étudiant
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Saisissez vos informations pour commencer l’examen.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleStartExam}>
          <Stack spacing={2}>
            <TextField
              label="Matricule"
              fullWidth
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
            />

            <TextField
              label="Code secret"
              type="password"
              fullWidth
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Examen</InputLabel>
              <Select
                label="Examen"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
              >
                {exams.map((exam) => (
                  <MenuItem key={exam.id} value={exam.id}>
                    {exam.title} — {exam.module_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" size="large">
              Commencer l’examen
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

export default StudentLogin;