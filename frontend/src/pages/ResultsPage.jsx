import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";

import api from "../api/api";

function ResultsPage() {
  const [results, setResults] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchResults = async () => {
      try {
        const response = await api.get("/trainer/results");

        if (isMounted) {
          setResults(response.data.results || []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Erreur pendant le chargement des résultats");
        }

        console.error(err);
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusChip = (status) => {
    switch (status) {
      case "submitted":
        return <Chip label="Soumis" color="success" size="small" />;
      case "in_progress":
        return <Chip label="En cours" color="primary" size="small" />;
      case "expired":
        return <Chip label="Expiré" color="warning" size="small" />;
      case "stopped":
        return <Chip label="Arrêté" color="error" size="small" />;
      default:
        return <Chip label={status || "Inconnu"} size="small" />;
    }
  };

  const getValidationChip = (validationStatus) => {
    switch (validationStatus) {
      case "passed":
        return <Chip label="Réussi" color="success" size="small" />;
      case "failed":
        return <Chip label="Échec" color="error" size="small" />;
      case "pending":
        return <Chip label="En attente" color="warning" size="small" />;
      default:
        return <Chip label={validationStatus || "N/A"} size="small" />;
    }
  };

  const handleViewAttempt = async (attemptId) => {
    setError("");

    try {
      const response = await api.get(`/trainer/results/attempt/${attemptId}`);

      setSelectedAttempt(response.data.attempt);
      setAttemptAnswers(response.data.answers || []);
      setSecurityEvents(response.data.security_events || []);
      setOpenDialog(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant le chargement du détail de la tentative"
      );

      console.error(err);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAttempt(null);
    setAttemptAnswers([]);
    setSecurityEvents([]);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <Typography variant="h4" gutterBottom textAlign="center">
        Résultats des examens
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          width: "100%",
          maxWidth: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Liste des tentatives
        </Typography>

        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <Table sx={{ minWidth: 1350 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Matricule</TableCell>
                <TableCell>Étudiant</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Examen</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Pourcentage</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Validation</TableCell>
                <TableCell>Triche</TableCell>
                <TableCell>Début</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell align="right">Détail</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {results.map((item) => (
                <TableRow key={item.attempt_id}>
                  <TableCell>{item.attempt_id}</TableCell>

                  <TableCell>{item.matricule}</TableCell>

                  <TableCell>
                    {item.first_name} {item.last_name}
                  </TableCell>

                  <TableCell>{item.module_name || "-"}</TableCell>

                  <TableCell>{item.exam_title || "-"}</TableCell>

                  <TableCell>{item.score ?? 0}</TableCell>

                  <TableCell>
                    {item.percentage !== null && item.percentage !== undefined
                      ? `${Number(item.percentage).toFixed(2)}%`
                      : "0%"}
                  </TableCell>

                  <TableCell>{getStatusChip(item.status)}</TableCell>

                  <TableCell>
                    {getValidationChip(item.validation_status)}
                  </TableCell>

                  <TableCell>
                    {item.cheating_detected === 1 ? (
                      <Chip label="Oui" color="error" size="small" />
                    ) : (
                      <Chip label="Non" color="success" size="small" />
                    )}
                  </TableCell>

                  <TableCell>{item.start_time || "-"}</TableCell>

                  <TableCell>{item.end_time || "-"}</TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewAttempt(item.attempt_id)}
                    >
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} align="center">
                    Aucun résultat trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Détail de la tentative</DialogTitle>

        <DialogContent dividers>
          {!selectedAttempt && (
            <Alert severity="info">Aucune tentative sélectionnée.</Alert>
          )}

          {selectedAttempt && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Informations générales
                </Typography>

                <Stack spacing={1}>
                  <Typography>
                    <strong>Étudiant :</strong> {selectedAttempt.first_name}{" "}
                    {selectedAttempt.last_name}
                  </Typography>

                  <Typography>
                    <strong>Matricule :</strong> {selectedAttempt.matricule}
                  </Typography>

                  <Typography>
                    <strong>Examen :</strong> {selectedAttempt.exam_title}
                  </Typography>

                  <Typography>
                    <strong>Score :</strong> {selectedAttempt.score ?? 0}
                  </Typography>

                  <Typography>
                    <strong>Pourcentage :</strong>{" "}
                    {selectedAttempt.percentage !== null &&
                    selectedAttempt.percentage !== undefined
                      ? `${Number(selectedAttempt.percentage).toFixed(2)}%`
                      : "0%"}
                  </Typography>

                  <Box>
                    <strong>Statut :</strong>{" "}
                    {getStatusChip(selectedAttempt.status)}
                  </Box>

                  <Box>
                    <strong>Validation :</strong>{" "}
                    {getValidationChip(selectedAttempt.validation_status)}
                  </Box>

                  <Typography>
                    <strong>Triche détectée :</strong>{" "}
                    {selectedAttempt.cheating_detected === 1 ? "Oui" : "Non"}
                  </Typography>

                  {selectedAttempt.cheating_reason && (
                    <Typography>
                      <strong>Raison :</strong>{" "}
                      {selectedAttempt.cheating_reason}
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Réponses de l’étudiant
                </Typography>

                {attemptAnswers.length === 0 && (
                  <Alert severity="warning">
                    Aucune réponse enregistrée pour cette tentative.
                  </Alert>
                )}

                <Stack spacing={2}>
                  {attemptAnswers.map((answer, index) => (
                    <Paper
                      key={`${answer.question_id}-${answer.answer_id}`}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Stack spacing={1}>
                        <Typography fontWeight={700}>
                          Question {index + 1}
                        </Typography>

                        <Typography>{answer.question_text}</Typography>

                        <Typography>
                          <strong>Réponse donnée :</strong>{" "}
                          {answer.answer_text}
                        </Typography>

                        {answer.student_is_correct === 1 ? (
                          <Chip
                            label="Réponse correcte"
                            color="success"
                            size="small"
                            sx={{ width: "fit-content" }}
                          />
                        ) : (
                          <Chip
                            label="Réponse incorrecte"
                            color="error"
                            size="small"
                            sx={{ width: "fit-content" }}
                          />
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Événements de sécurité
                </Typography>

                {securityEvents.length === 0 && (
                  <Alert severity="success">
                    Aucun événement de sécurité enregistré.
                  </Alert>
                )}

                <Stack spacing={1}>
                  {securityEvents.map((event, index) => (
                    <Paper
                      key={`${event.event_type}-${index}`}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Typography>
                        <strong>Type :</strong> {event.event_type}
                      </Typography>

                      <Typography>
                        <strong>Description :</strong> {event.description}
                      </Typography>

                      <Typography>
                        <strong>Date :</strong> {event.created_at}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ResultsPage;