import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";

import api from "../api/api";

function ExamsPage() {
  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    module_id: "",
    trainer_id: 1,
    title: "",
    description: "",
    duration_minutes: 30,
    number_of_questions: 5,
    success_percentage: 60,
    random_questions: 1,
    random_answers: 1,
    is_published: 1,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const modulesRes = await api.get("/modules");
        const examsRes = await api.get("/exams");

        if (isMounted) {
          setModules(modulesRes.data.modules || []);
          setExams(examsRes.data.exams || []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Erreur pendant le chargement des examens");
        }

        console.error(err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadExams = async () => {
    try {
      const examsRes = await api.get("/exams");
      setExams(examsRes.data.exams || []);
    } catch (err) {
      setError("Erreur pendant le rechargement des examens");
      console.error(err);
    }
  };

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!form.module_id || !form.title.trim()) {
      setError("Le module et le titre sont obligatoires");
      return;
    }

    try {
      await api.post("/exams", {
        ...form,
        module_id: Number(form.module_id),
        trainer_id: Number(form.trainer_id),
        duration_minutes: Number(form.duration_minutes),
        number_of_questions: Number(form.number_of_questions),
        success_percentage: Number(form.success_percentage),
        random_questions: Number(form.random_questions),
        random_answers: Number(form.random_answers),
        is_published: Number(form.is_published),
      });

      setMessage("Examen créé avec succès");

      setForm({
        module_id: "",
        trainer_id: 1,
        title: "",
        description: "",
        duration_minutes: 30,
        number_of_questions: 5,
        success_percentage: 60,
        random_questions: 1,
        random_answers: 1,
        is_published: 1,
      });

      await loadExams();
      setPage(0);
    } catch (err) {
      setError(
        err.response?.data?.message || "Erreur pendant la création de l’examen"
      );
    }
  };

  const handleStartSession = async (examId) => {
    resetMessages();

    try {
      const trainer = JSON.parse(localStorage.getItem("trainer"));
      const trainerId = trainer?.id || 1;

      await api.post("/exam-session/start", {
        exam_id: examId,
        trainer_id: trainerId,
      });

      setMessage("Session d’examen démarrée avec succès");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant le démarrage de la session"
      );
    }
  };

  const handleCloseSession = async () => {
    resetMessages();

    const sessionId = window.prompt("Entrer l’ID de la session à fermer :");

    if (!sessionId) return;

    try {
      await api.post("/exam-session/close", {
        session_id: Number(sessionId),
      });

      setMessage("Session fermée avec succès");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la fermeture de la session"
      );
    }
  };

  const handleDeleteExam = async (id) => {
    resetMessages();

    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer cet examen ?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/exams/${id}`);

      setMessage("Examen supprimé avec succès");
      await loadExams();

      const remainingItems = exams.length - 1;
      const maxPage = Math.max(0, Math.ceil(remainingItems / rowsPerPage) - 1);

      if (page > maxPage) {
        setPage(maxPage);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur pendant la suppression");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedExams = exams.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Gestion des examens
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Créer, publier, démarrer ou supprimer les examens.
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

      <Paper
        sx={{
          p: 3,
          mb: 4,
          width: "100%",
          maxWidth: 900,
          borderRadius: 3,
          mx: "auto",
          boxSizing: "border-box",
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Créer un examen
        </Typography>

        <Box component="form" onSubmit={handleCreateExam}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Module</InputLabel>
              <Select
                name="module_id"
                label="Module"
                value={form.module_id}
                onChange={handleChange}
              >
                {modules.map((module) => (
                  <MenuItem key={module.id} value={module.id}>
                    {module.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              name="title"
              label="Titre de l’examen"
              fullWidth
              value={form.title}
              onChange={handleChange}
            />

            <TextField
              name="description"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={form.description}
              onChange={handleChange}
            />

            <TextField
              name="duration_minutes"
              label="Durée en minutes"
              type="number"
              fullWidth
              value={form.duration_minutes}
              onChange={handleChange}
            />

            <TextField
              name="number_of_questions"
              label="Nombre de questions"
              type="number"
              fullWidth
              value={form.number_of_questions}
              onChange={handleChange}
            />

            <TextField
              name="success_percentage"
              label="Seuil de réussite (%)"
              type="number"
              fullWidth
              value={form.success_percentage}
              onChange={handleChange}
            />

            <FormControl fullWidth>
              <InputLabel>Questions aléatoires</InputLabel>
              <Select
                name="random_questions"
                label="Questions aléatoires"
                value={form.random_questions}
                onChange={handleChange}
              >
                <MenuItem value={1}>Oui</MenuItem>
                <MenuItem value={0}>Non</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Réponses mélangées</InputLabel>
              <Select
                name="random_answers"
                label="Réponses mélangées"
                value={form.random_answers}
                onChange={handleChange}
              >
                <MenuItem value={1}>Oui</MenuItem>
                <MenuItem value={0}>Non</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Publié</InputLabel>
              <Select
                name="is_published"
                label="Publié"
                value={form.is_published}
                onChange={handleChange}
              >
                <MenuItem value={1}>Oui</MenuItem>
                <MenuItem value={0}>Non</MenuItem>
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" size="large">
              Créer l’examen
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 3,
          width: "100%",
          maxWidth: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Liste des examens
        </Typography>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Titre</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Durée</TableCell>
                <TableCell>Questions</TableCell>
                <TableCell>Seuil</TableCell>
                <TableCell>Publié</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell>{exam.id}</TableCell>
                  <TableCell>{exam.title}</TableCell>
                  <TableCell>{exam.module_name || "-"}</TableCell>
                  <TableCell>{exam.duration_minutes} min</TableCell>
                  <TableCell>{exam.number_of_questions}</TableCell>
                  <TableCell>{exam.success_percentage}%</TableCell>

                  <TableCell>
                    {exam.is_published === 1 ? (
                      <Chip label="Publié" color="success" size="small" />
                    ) : (
                      <Chip label="Brouillon" color="warning" size="small" />
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                      }}
                    >
                      <IconButton
                        color="success"
                        onClick={() => handleStartSession(exam.id)}
                        title="Démarrer"
                      >
                        <PlayArrowIcon />
                      </IconButton>

                      <IconButton
                        color="warning"
                        onClick={handleCloseSession}
                        title="Fermer"
                      >
                        <StopIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        onClick={() => handleDeleteExam(exam.id)}
                        title="Supprimer"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {exams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Aucun examen trouvé
                  </TableCell>
                </TableRow>
              )}

              {exams.length > 0 && paginatedExams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Aucun examen sur cette page
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={exams.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </Paper>
    </Box>
  );
}

export default ExamsPage;