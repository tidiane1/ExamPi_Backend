import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
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
  Typography,
} from "@mui/material";

import DownloadIcon from "@mui/icons-material/Download";

import api from "../api/api";

function formatValidation(status) {
  switch (status) {
    case "passed":
      return "Réussi";
    case "failed":
      return "Échec";
    case "pending":
      return "En attente";
    default:
      return status || "-";
  }
}

function ResultsPage() {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState("all");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setError("");

      const resultsResponse = await api.get("/trainer/results");
      const examsResponse = await api.get("/exams");

      setResults(resultsResponse.data.results || []);
      setExams(examsResponse.data.exams || []);
    } catch (err) {
      console.error("Erreur chargement résultats :", err);

      setError("Erreur pendant le chargement des résultats");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setError("");

        const resultsResponse = await api.get("/trainer/results");
        const examsResponse = await api.get("/exams");

        if (isMounted) {
          setResults(resultsResponse.data.results || []);
          setExams(examsResponse.data.exams || []);
        }
      } catch (err) {
        console.error("Erreur chargement résultats :", err);

        if (isMounted) {
          setError("Erreur pendant le chargement des résultats");
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredResults = useMemo(() => {
    if (selectedExamId === "all") {
      return results;
    }

    return results.filter(
      (item) => Number(item.exam_id) === Number(selectedExamId)
    );
  }, [results, selectedExamId]);

  const groupedResults = useMemo(() => {
    const groups = {};

    filteredResults.forEach((item) => {
      const key = item.exam_id || "unknown";

      if (!groups[key]) {
        groups[key] = {
          exam_id: item.exam_id,
          exam_title: item.exam_title || "Examen inconnu",
          module_name: item.module_name || "-",
          results: [],
        };
      }

      groups[key].results.push(item);
    });

    return Object.values(groups).sort((first, second) =>
      String(first.exam_title).localeCompare(String(second.exam_title))
    );
  }, [filteredResults]);

  const stats = useMemo(() => {
    const total = filteredResults.length;

    const passed = filteredResults.filter(
      (item) => item.validation_status === "passed"
    ).length;

    const failed = filteredResults.filter(
      (item) => item.validation_status === "failed"
    ).length;

    const stopped = filteredResults.filter(
      (item) =>
        item.status === "stopped" || Number(item.cheating_detected) === 1
    ).length;

    const average =
      total > 0
        ? filteredResults.reduce(
            (sum, item) => sum + Number(item.percentage || 0),
            0
          ) / total
        : 0;

    return {
      total,
      passed,
      failed,
      stopped,
      average,
    };
  }, [filteredResults]);

  const paginatedResults = filteredResults.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const handleExportExcel = () => {
    window.open(
      `/api/trainer/results/export/excel?exam_id=${selectedExamId}`,
      "_blank"
    );
  };

  const handleExportPdf = () => {
    window.open(
      `/api/trainer/results/export/pdf?exam_id=${selectedExamId}`,
      "_blank"
    );
  };

  const getValidationChip = (status) => {
    if (status === "passed") {
      return <Chip label="Réussi" color="success" size="small" />;
    }

    if (status === "failed") {
      return <Chip label="Échec" color="error" size="small" />;
    }

    return <Chip label={formatValidation(status)} color="warning" size="small" />;
  };

  const getStatusChip = (status) => {
    if (status === "submitted") {
      return <Chip label="Soumis" color="primary" size="small" />;
    }

    if (status === "expired") {
      return <Chip label="Temps écoulé" color="warning" size="small" />;
    }

    if (status === "stopped") {
      return <Chip label="Arrêté" color="error" size="small" />;
    }

    if (status === "in_progress") {
      return <Chip label="En cours" color="info" size="small" />;
    }

    return <Chip label={status || "-"} size="small" />;
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
      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "flex-start",
          md: "center",
        }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Résultats des examens
          </Typography>

          <Typography color="text.secondary">
            Classez les résultats par examen et exportez-les en Excel ou PDF.
          </Typography>
        </Box>

        <Button variant="outlined" onClick={loadData}>
          Actualiser
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
        }}
      >
        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          spacing={2}
          alignItems={{
            xs: "stretch",
            md: "center",
          }}
          justifyContent="space-between"
        >
          <FormControl
            sx={{
              minWidth: {
                xs: "100%",
                md: 380,
              },
            }}
          >
            <InputLabel>Filtrer par examen</InputLabel>

            <Select
              label="Filtrer par examen"
              value={selectedExamId}
              onChange={(event) => {
                setSelectedExamId(event.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">Tous les examens</MenuItem>

              {exams.map((exam) => (
                <MenuItem key={exam.id} value={String(exam.id)}>
                  {exam.title}
                  {exam.module_name ? ` - ${exam.module_name}` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={2}
          >
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPdf}
            >
              Export PDF
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(5, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography color="text.secondary">Tentatives</Typography>
          <Typography variant="h5" fontWeight={700}>
            {stats.total}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography color="text.secondary">Réussites</Typography>
          <Typography variant="h5" fontWeight={700} color="success.main">
            {stats.passed}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography color="text.secondary">Échecs</Typography>
          <Typography variant="h5" fontWeight={700} color="error.main">
            {stats.failed}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography color="text.secondary">Arrêtés / triche</Typography>
          <Typography variant="h5" fontWeight={700} color="warning.main">
            {stats.stopped}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography color="text.secondary">Moyenne</Typography>
          <Typography variant="h5" fontWeight={700}>
            {stats.average.toFixed(2)}%
          </Typography>
        </Paper>
      </Box>

      {selectedExamId === "all" && groupedResults.length > 0 && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Classement par examen
          </Typography>

          <Stack spacing={1.5}>
            {groupedResults.map((group) => {
              const total = group.results.length;

              const passed = group.results.filter(
                (item) => item.validation_status === "passed"
              ).length;

              const failed = group.results.filter(
                (item) => item.validation_status === "failed"
              ).length;

              const stopped = group.results.filter(
                (item) =>
                  item.status === "stopped" ||
                  Number(item.cheating_detected) === 1
              ).length;

              const average =
                total > 0
                  ? group.results.reduce(
                      (sum, item) => sum + Number(item.percentage || 0),
                      0
                    ) / total
                  : 0;

              return (
                <Paper
                  key={group.exam_id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                  }}
                >
                  <Stack
                    direction={{
                      xs: "column",
                      md: "row",
                    }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography fontWeight={700}>
                        {group.exam_title}
                      </Typography>

                      <Typography color="text.secondary">
                        Module : {group.module_name}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <Chip label={`${total} tentative(s)`} />
                      <Chip label={`${passed} réussite(s)`} color="success" />
                      <Chip label={`${failed} échec(s)`} color="error" />
                      <Chip label={`${stopped} arrêté(s)`} color="warning" />
                      <Chip label={`Moyenne ${average.toFixed(2)}%`} />
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      )}

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          justifyContent="space-between"
          alignItems={{
            xs: "flex-start",
            md: "center",
          }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" fontWeight={700}>
            Liste des résultats
          </Typography>

          <Typography color="text.secondary">
            {filteredResults.length} résultat(s)
          </Typography>
        </Stack>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 1250 }}>
            <TableHead>
              <TableRow>
                <TableCell>Étudiant</TableCell>
                <TableCell>Matricule</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Examen</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Pourcentage</TableCell>
                <TableCell>Validation</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Triche</TableCell>
                <TableCell>Début</TableCell>
                <TableCell>Fin</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedResults.map((item) => (
                <TableRow key={item.attempt_id}>
                  <TableCell>
                    {item.first_name} {item.last_name}
                  </TableCell>

                  <TableCell>{item.matricule || "-"}</TableCell>

                  <TableCell>{item.phone || "-"}</TableCell>

                  <TableCell>{item.email || "-"}</TableCell>

                  <TableCell>{item.module_name || "-"}</TableCell>

                  <TableCell>{item.exam_title || "-"}</TableCell>

                  <TableCell>{item.score ?? 0}</TableCell>

                  <TableCell>
                    {Number(item.percentage || 0).toFixed(2)}%
                  </TableCell>

                  <TableCell>{getValidationChip(item.validation_status)}</TableCell>

                  <TableCell>{getStatusChip(item.status)}</TableCell>

                  <TableCell>
                    {Number(item.cheating_detected) === 1 ? (
                      <Chip label="Oui" color="error" size="small" />
                    ) : (
                      <Chip label="Non" color="success" size="small" />
                    )}
                  </TableCell>

                  <TableCell>{item.start_time || "-"}</TableCell>

                  <TableCell>{item.end_time || "-"}</TableCell>
                </TableRow>
              ))}

              {paginatedResults.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} align="center">
                    Aucun résultat trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={filteredResults.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </Paper>
    </Box>
  );
}

export default ResultsPage;