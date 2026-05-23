import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";

import api from "../api/api";

function StudentExam() {
  const navigate = useNavigate();

  const [examData] = useState(() => {
    const storedExam = localStorage.getItem("student_exam");
    return storedExam ? JSON.parse(storedExam) : null;
  });

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!examData) {
      navigate("/student/login");
    }
  }, [examData, navigate]);

  useEffect(() => {
    if (!examData?.attempt?.id) return;

    let isMounted = true;

    const checkTimer = async () => {
      try {
        const response = await api.get(
          `/student/exam-timer/${examData.attempt.id}`
        );

        if (!isMounted) return;

        setRemainingSeconds(response.data.remaining_seconds);

        if (response.data.expired) {
          localStorage.setItem(
            "student_result",
            JSON.stringify({
              success: false,
              message: "Temps écoulé. Examen expiré.",
              status: "expired",
            })
          );

          localStorage.removeItem("student_exam");
          navigate("/student/result");
        }
      } catch (err) {
        console.error("Erreur chrono :", err);
      }
    };

    checkTimer();

    const interval = setInterval(checkTimer, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [examData, navigate]);

  useEffect(() => {
    if (!examData?.attempt?.id) return;

    let eventAlreadySent = false;

    const handleBlur = async () => {
      if (eventAlreadySent) return;

      eventAlreadySent = true;

      try {
        const response = await api.post("/student/security-event", {
          attempt_id: examData.attempt.id,
          event_type: "WINDOW_BLUR",
          description: "L’étudiant a quitté la fenêtre de l’examen",
        });

        localStorage.setItem(
          "student_result",
          JSON.stringify({
            success: false,
            message: response.data.message,
            status: "stopped",
            cheating_detected: 1,
          })
        );

        localStorage.removeItem("student_exam");
        navigate("/student/result");
      } catch (err) {
        console.error("Erreur événement sécurité :", err);
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [examData, navigate]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  const handleSelectAnswer = (questionId, answerId) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const handleSubmitExam = async () => {
    setError("");

    if (!examData) return;

    const answers = examData.questions.map((question) => ({
      question_id: question.id,
      answer_id: selectedAnswers[question.id],
    }));

    const unanswered = answers.some((item) => !item.answer_id);

    if (unanswered) {
      setError("Veuillez répondre à toutes les questions avant de soumettre");
      return;
    }

    const confirmSubmit = window.confirm(
      "Voulez-vous vraiment soumettre votre examen ?"
    );

    if (!confirmSubmit) return;

    try {
      const response = await api.post("/student/submit-exam", {
        attempt_id: examData.attempt.id,
        answers,
      });

      localStorage.setItem("student_result", JSON.stringify(response.data));
      localStorage.removeItem("student_exam");

      navigate("/student/result");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la soumission de l’examen"
      );

      console.error("Erreur soumission :", err);
    }
  };

  if (!examData) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
        p: 3,
      }}
    >
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {examData.session.title}
            </Typography>

            <Typography color="text.secondary">
              Étudiant : {examData.student.first_name}{" "}
              {examData.student.last_name} — {examData.student.matricule}
            </Typography>

            <Typography color="text.secondary">
              Questions : {examData.questions.length} | Durée :{" "}
              {examData.session.duration_minutes} min | Seuil :{" "}
              {examData.session.success_percentage}%
            </Typography>
          </Box>

          <Chip
            label={`Temps restant : ${formatTime(remainingSeconds)}`}
            color={
              remainingSeconds !== null && remainingSeconds < 60
                ? "error"
                : "primary"
            }
            sx={{
              fontSize: 18,
              fontWeight: 700,
              p: 2,
            }}
          />
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Alert severity="warning" sx={{ mb: 3 }}>
        Ne quittez pas la fenêtre de l’examen. Tout changement de fenêtre peut
        arrêter automatiquement la tentative.
      </Alert>

      <Stack spacing={3}>
        {examData.questions.map((question, index) => (
          <Paper key={question.id} sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Question {index + 1}
                </Typography>

                <Typography>{question.question_text}</Typography>

                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {question.points} point(s)
                </Typography>
              </Box>

              <RadioGroup
                value={selectedAnswers[question.id] || ""}
                onChange={(e) =>
                  handleSelectAnswer(question.id, Number(e.target.value))
                }
              >
                {question.answers.map((answer) => (
                  <FormControlLabel
                    key={answer.id}
                    value={answer.id}
                    control={<Radio />}
                    label={answer.answer_text}
                  />
                ))}
              </RadioGroup>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          fullWidth
          onClick={handleSubmitExam}
        >
          Soumettre l’examen
        </Button>
      </Paper>
    </Box>
  );
}

export default StudentExam;