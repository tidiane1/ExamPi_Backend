import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import SchoolIcon from "@mui/icons-material/School";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningIcon from "@mui/icons-material/Warning";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";

import api from "../api/api";

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        minHeight: 120,
        height: "100%",
        borderLeft: `5px solid ${color}`,
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ width: "100%" }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: `${color}20`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography color="text.secondary" fontSize={13}>
            {title}
          </Typography>

          <Typography variant="h4" fontWeight={700} lineHeight={1.1}>
            {value}
          </Typography>

          <Typography color="text.secondary" fontSize={13}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function TrainerDashboard() {
  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const modulesRes = await api.get("/modules");
        const examsRes = await api.get("/exams");
        const studentsRes = await api.get("/admin/students");
        const resultsRes = await api.get("/trainer/results");

        if (isMounted) {
          setModules(modulesRes.data.modules || []);
          setExams(examsRes.data.exams || []);
          setStudents(studentsRes.data.students || []);
          setResults(resultsRes.data.results || []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Erreur pendant le chargement du dashboard");
        }

        console.error(err);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeStudents = students.filter((student) => student.is_active === 1);

  const passedResults = results.filter(
    (item) => item.validation_status === "passed"
  );

  const failedResults = results.filter(
    (item) => item.validation_status === "failed"
  );

  const inProgressResults = results.filter(
    (item) => item.status === "in_progress"
  );

  const cheatingResults = results.filter(
    (item) => item.cheating_detected === 1
  );

  const recentResults = results.slice(0, 5);
  const recentExams = exams.slice(0, 5);

  const successRate =
    results.length > 0
      ? ((passedResults.length / results.length) * 100).toFixed(2)
      : 0;

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

  const getValidationChip = (status) => {
    switch (status) {
      case "passed":
        return <Chip label="Réussi" color="success" size="small" />;
      case "failed":
        return <Chip label="Échec" color="error" size="small" />;
      case "pending":
        return <Chip label="En attente" color="warning" size="small" />;
      default:
        return <Chip label={status || "N/A"} size="small" />;
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard formateur
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Vue globale du serveur d’examen : modules, examens, étudiants,
        tentatives et résultats.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* KPI CARDS */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 3,
          mb: 4,
          alignItems: "stretch",
        }}
      >
        <StatCard
          title="Modules"
          value={modules.length}
          subtitle="Modules créés"
          color="#1976d2"
          icon={<SchoolIcon />}
        />

        <StatCard
          title="Examens"
          value={exams.length}
          subtitle="Examens disponibles"
          color="#7b1fa2"
          icon={<AssignmentIcon />}
        />

        <StatCard
          title="Étudiants autorisés"
          value={activeStudents.length}
          subtitle={`${students.length} étudiants au total`}
          color="#2e7d32"
          icon={<PeopleIcon />}
        />

        <StatCard
          title="Tentatives"
          value={results.length}
          subtitle="Passages enregistrés"
          color="#ed6c02"
          icon={<FactCheckIcon />}
        />

        <StatCard
          title="Réussites"
          value={passedResults.length}
          subtitle={`Taux : ${successRate}%`}
          color="#2e7d32"
          icon={<CheckCircleIcon />}
        />

        <StatCard
          title="Échecs"
          value={failedResults.length}
          subtitle="Tentatives non validées"
          color="#d32f2f"
          icon={<CancelIcon />}
        />

        <StatCard
          title="En cours"
          value={inProgressResults.length}
          subtitle="Examens non terminés"
          color="#0288d1"
          icon={<PlayCircleIcon />}
        />

        <StatCard
          title="Triches détectées"
          value={cheatingResults.length}
          subtitle="Événements de sécurité"
          color="#c62828"
          icon={<WarningIcon />}
        />
      </Box>

      {/* TABLE + RECENT EXAMS */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 2fr) minmax(320px, 1fr)",
          },
          gap: 3,
          alignItems: "start",
          width: "100%",
        }}
      >
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            overflow: "hidden",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Derniers résultats
          </Typography>

          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Étudiant</TableCell>
                  <TableCell>Examen</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Pourcentage</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Validation</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {recentResults.map((item) => (
                  <TableRow key={item.attempt_id}>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {item.first_name} {item.last_name}
                      </Typography>

                      <Typography fontSize={12} color="text.secondary">
                        {item.matricule}
                      </Typography>
                    </TableCell>

                    <TableCell>{item.exam_title || "-"}</TableCell>

                    <TableCell>{item.score ?? 0}</TableCell>

                    <TableCell>
                      {item.percentage !== null &&
                      item.percentage !== undefined
                        ? `${Number(item.percentage).toFixed(2)}%`
                        : "0%"}
                    </TableCell>

                    <TableCell>{getStatusChip(item.status)}</TableCell>

                    <TableCell>
                      {getValidationChip(item.validation_status)}
                    </TableCell>
                  </TableRow>
                ))}

                {recentResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Aucun résultat disponible
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Examens récents
          </Typography>

          <Stack spacing={2}>
            {recentExams.map((exam) => (
              <Paper
                key={exam.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <Stack spacing={1}>
                  <Typography
                    fontWeight={700}
                    sx={{
                      wordBreak: "break-word",
                    }}
                  >
                    {exam.title}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    fontSize={14}
                    sx={{
                      wordBreak: "break-word",
                    }}
                  >
                    Module : {exam.module_name || "-"}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <Chip
                      label={`${exam.duration_minutes} min`}
                      size="small"
                      sx={{ maxWidth: "100%" }}
                    />

                    <Chip
                      label={`${exam.number_of_questions} questions`}
                      size="small"
                      sx={{ maxWidth: "100%" }}
                    />

                    <Chip
                      label={`Seuil ${exam.success_percentage}%`}
                      size="small"
                      sx={{ maxWidth: "100%" }}
                    />

                    {exam.is_published === 1 ? (
                      <Chip
                        label="Publié"
                        color="success"
                        size="small"
                        sx={{ maxWidth: "100%" }}
                      />
                    ) : (
                      <Chip
                        label="Brouillon"
                        color="warning"
                        size="small"
                        sx={{ maxWidth: "100%" }}
                      />
                    )}
                  </Box>
                </Stack>
              </Paper>
            ))}

            {recentExams.length === 0 && (
              <Alert severity="info">Aucun examen créé pour le moment.</Alert>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

export default TrainerDashboard;