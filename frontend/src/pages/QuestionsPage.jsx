import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import api from "../api/api";

function QuestionsPage() {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answersByQuestion, setAnswersByQuestion] = useState({});

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("single_choice");
  const [points, setPoints] = useState(1);

  const [answerForms, setAnswerForms] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchExams = async () => {
      try {
        const response = await api.get("/exams");

        if (isMounted) {
          setExams(response.data.exams || []);
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

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const loadQuestions = async (examId) => {
    try {
      const response = await api.get(`/questions/exam/${examId}`);
      const loadedQuestions = response.data.questions || [];

      const answersMap = {};

      for (const question of loadedQuestions) {
        const answersResponse = await api.get(
          `/answers/question/${question.id}`
        );

        answersMap[question.id] = answersResponse.data.answers || [];
      }

      setQuestions(loadedQuestions);
      setAnswersByQuestion(answersMap);
    } catch (err) {
      setError("Erreur pendant le chargement des questions");
      console.error(err);
    }
  };

  const handleSelectExam = async (e) => {
    const examId = e.target.value;

    setSelectedExamId(examId);
    setQuestions([]);
    setAnswersByQuestion({});
    resetMessages();

    if (examId) {
      await loadQuestions(examId);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!selectedExamId) {
      setError("Veuillez sélectionner un examen");
      return;
    }

    if (!questionText.trim()) {
      setError("Le texte de la question est obligatoire");
      return;
    }

    try {
      await api.post("/questions", {
        exam_id: Number(selectedExamId),
        question_text: questionText,
        question_type: questionType,
        points: Number(points),
        is_active: 1,
      });

      setQuestionText("");
      setQuestionType("single_choice");
      setPoints(1);

      setMessage("Question ajoutée avec succès");
      await loadQuestions(selectedExamId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la création de la question"
      );
    }
  };

  const handleAnswerChange = (questionId, field, value) => {
    setAnswerForms((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }));
  };

  const handleCreateAnswer = async (questionId) => {
    resetMessages();

    const form = answerForms[questionId] || {};
    const answerText = form.answer_text || "";
    const isCorrect = form.is_correct || 0;

    if (!answerText.trim()) {
      setError("Le texte de la réponse est obligatoire");
      return;
    }

    try {
      await api.post("/answers", {
        question_id: questionId,
        answer_text: answerText,
        is_correct: Number(isCorrect),
      });

      setAnswerForms((prev) => ({
        ...prev,
        [questionId]: {
          answer_text: "",
          is_correct: 0,
        },
      }));

      setMessage("Réponse ajoutée avec succès");
      await loadQuestions(selectedExamId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la création de la réponse"
      );
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    resetMessages();

    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer cette question ?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/questions/${questionId}`);
      setMessage("Question supprimée avec succès");
      await loadQuestions(selectedExamId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la suppression de la question"
      );
    }
  };

  const handleDeleteAnswer = async (answerId) => {
    resetMessages();

    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer cette réponse ?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/answers/${answerId}`);
      setMessage("Réponse supprimée avec succès");
      await loadQuestions(selectedExamId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la suppression de la réponse"
      );
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      <Typography variant="h4" gutterBottom>
        Gestion des questions
      </Typography>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4, width: "100%", borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sélectionner un examen
        </Typography>

        <FormControl fullWidth>
          <InputLabel>Examen</InputLabel>
          <Select
            label="Examen"
            value={selectedExamId}
            onChange={handleSelectExam}
          >
            {exams.map((exam) => (
              <MenuItem key={exam.id} value={exam.id}>
                {exam.title} — {exam.module_name || "Module non défini"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, mb: 4, width: "100%", borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Ajouter une question
        </Typography>

        <Box component="form" onSubmit={handleCreateQuestion}>
          <Stack spacing={2}>
            <TextField
              label="Texte de la question"
              fullWidth
              multiline
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Type de question</InputLabel>
                <Select
                  label="Type de question"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  <MenuItem value="single_choice">Choix unique</MenuItem>
                  <MenuItem value="multiple_choice">Choix multiple</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Points"
                type="number"
                fullWidth
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </Stack>

            <Button type="submit" variant="contained" startIcon={<AddIcon />}>
              Ajouter la question
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, width: "100%", borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Questions de l’examen
        </Typography>

        {!selectedExamId && (
          <Alert severity="info">
            Veuillez sélectionner un examen pour afficher ses questions.
          </Alert>
        )}

        {selectedExamId && questions.length === 0 && (
          <Alert severity="warning">
            Aucune question trouvée pour cet examen.
          </Alert>
        )}

        <Stack spacing={3}>
          {questions.map((question, index) => {
            const answers = answersByQuestion[question.id] || [];
            const form = answerForms[question.id] || {
              answer_text: "",
              is_correct: 0,
            };

            return (
              <Paper
                key={question.id}
                variant="outlined"
                sx={{ p: 3, borderRadius: 2 }}
              >
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Question {index + 1}
                      </Typography>

                      <Typography sx={{ mt: 1 }}>
                        {question.question_text}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          label={`${question.points} point(s)`}
                          size="small"
                        />

                        <Chip
                          label={
                            question.question_type === "single_choice"
                              ? "Choix unique"
                              : "Choix multiple"
                          }
                          size="small"
                          color="primary"
                        />

                        {question.is_active === 1 ? (
                          <Chip label="Active" size="small" color="success" />
                        ) : (
                          <Chip label="Inactive" size="small" color="warning" />
                        )}
                      </Stack>
                    </Box>

                    <IconButton
                      color="error"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  <Divider />

                  <Typography variant="subtitle2">
                    Réponses proposées
                  </Typography>

                  {answers.length === 0 && (
                    <Alert severity="warning">
                      Aucune réponse ajoutée pour cette question.
                    </Alert>
                  )}

                  <Stack spacing={1}>
                    {answers.map((answer) => (
                      <Box
                        key={answer.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          border: "1px solid #e0e0e0",
                          borderRadius: 2,
                          p: 1.5,
                        }}
                      >
                        <Box>
                          <Typography>{answer.answer_text}</Typography>

                          {answer.is_correct === 1 ? (
                            <Chip
                              label="Bonne réponse"
                              color="success"
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          ) : (
                            <Chip
                              label="Mauvaise réponse"
                              color="default"
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>

                        <IconButton
                          color="error"
                          onClick={() => handleDeleteAnswer(answer.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>

                  <Divider />

                  <Typography variant="subtitle2">
                    Ajouter une réponse
                  </Typography>

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                      label="Texte de la réponse"
                      fullWidth
                      value={form.answer_text}
                      onChange={(e) =>
                        handleAnswerChange(
                          question.id,
                          "answer_text",
                          e.target.value
                        )
                      }
                    />

                    <FormControl sx={{ minWidth: 180 }}>
                      <InputLabel>Correcte ?</InputLabel>
                      <Select
                        label="Correcte ?"
                        value={form.is_correct}
                        onChange={(e) =>
                          handleAnswerChange(
                            question.id,
                            "is_correct",
                            e.target.value
                          )
                        }
                      >
                        <MenuItem value={0}>Non</MenuItem>
                        <MenuItem value={1}>Oui</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      onClick={() => handleCreateAnswer(question.id)}
                    >
                      Ajouter
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </Box>
  );
}

export default QuestionsPage;