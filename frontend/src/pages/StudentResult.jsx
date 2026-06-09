import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

/**
 * Lit le résultat enregistré après la soumission.
 */
function loadStoredResult() {
  try {
    const storedResult =
      localStorage.getItem("student_result");

    if (!storedResult) {
      return null;
    }

    const parsedResult = JSON.parse(storedResult);

    if (!parsedResult || typeof parsedResult !== "object") {
      localStorage.removeItem("student_result");
      return null;
    }

    return parsedResult;
  } catch (error) {
    console.error(
      "Erreur pendant la lecture de student_result :",
      error
    );

    localStorage.removeItem("student_result");

    return null;
  }
}

/**
 * Convertit les statuts techniques en libellés lisibles.
 */
function formatAttemptStatus(status) {
  const statusLabels = {
    submitted: "Soumis",
    expired: "Temps écoulé",
    stopped: "Arrêté",
    in_progress: "En cours",
    pending: "En attente",
  };

  return statusLabels[status] || status || "Non défini";
}

/**
 * Convertit les statuts de validation.
 */
function formatValidationStatus(status) {
  const validationLabels = {
    passed: "Réussi",
    success: "Réussi",
    validated: "Réussi",
    failed: "Échec",
    failure: "Échec",
    pending: "En attente",
  };

  return (
    validationLabels[status] ||
    status ||
    "En attente"
  );
}

/**
 * Retourne une valeur numérique valide.
 */
function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
}

function StudentResult() {
  const navigate = useNavigate();

  const [storedData] = useState(loadStoredResult);

  const handleBackToLogin = () => {
    localStorage.removeItem("student_result");
    localStorage.removeItem("student_exam");

    navigate("/student/login", {
      replace: true,
    });
  };

  if (!storedData) {
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
        <Paper
          sx={{
            width: "100%",
            maxWidth: 650,
            p: {
              xs: 2.5,
              sm: 4,
            },
            borderRadius: 3,
          }}
        >
          <Typography
            variant="h5"
            fontWeight={700}
            gutterBottom
          >
            Résultat indisponible
          </Typography>

          <Alert severity="error" sx={{ mb: 3 }}>
            Aucun résultat d’examen n’a été trouvé.
          </Alert>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleBackToLogin}
          >
            Retour à la connexion
          </Button>
        </Paper>
      </Box>
    );
  }

  /**
   * Compatibilité avec plusieurs formats.
   * Certaines anciennes versions plaçaient le résultat dans result.
   */
  const result =
    storedData.result &&
    typeof storedData.result === "object"
      ? storedData.result
      : storedData;

  const attemptStatus =
    result.status || "submitted";

  const score = toSafeNumber(
    result.score,
    0
  );

  const maximumScore = toSafeNumber(
    result.maximum_score ??
      result.max_score ??
      result.total_score,
    0
  );

  const percentage = Math.max(
    0,
    Math.min(
      100,
      toSafeNumber(result.percentage, 0)
    )
  );

  const validationStatus =
    result.validation_status ||
    result.validation ||
    "pending";

  const successPercentage = Math.max(
    0,
    Math.min(
      100,
      toSafeNumber(
        result.exam?.success_percentage ??
          result.success_percentage,
        0
      )
    )
  );

  const correctQuestions = toSafeNumber(
    result.correct_questions,
    0
  );

  const totalQuestions = toSafeNumber(
    result.total_questions,
    0
  );

  const cheatingDetected =
    Number(result.cheating_detected || 0) === 1;

  const isStopped =
    attemptStatus === "stopped" ||
    cheatingDetected;

  const isPassed = [
    "passed",
    "success",
    "validated",
  ].includes(validationStatus);

  const isFailed = [
    "failed",
    "failure",
  ].includes(validationStatus);

  const message =
    result.message ||
    (isStopped
      ? "L’examen a été arrêté."
      : "Examen soumis avec succès.");

  const examTitle =
    result.exam?.title ||
    result.exam_title ||
    "";

  const alertSeverity = isStopped
    ? "error"
    : isPassed
      ? "success"
      : isFailed
        ? "error"
        : "warning";

  const attemptChipColor = isStopped
    ? "error"
    : attemptStatus === "submitted"
      ? "primary"
      : attemptStatus === "expired"
        ? "warning"
        : "default";

  const validationChipColor = isPassed
    ? "success"
    : isFailed
      ? "error"
      : "warning";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: {
          xs: 2,
          sm: 3,
        },
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 760,
          p: {
            xs: 2.5,
            sm: 4,
          },
          borderRadius: 3,
          boxSizing: "border-box",
        }}
      >
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
        >
          Résultat de l’examen
        </Typography>

        <Alert
          severity={alertSeverity}
          sx={{ mb: 3 }}
        >
          {message}
        </Alert>

        {examTitle && (
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ mb: 3 }}
          >
            {examTitle}
          </Typography>
        )}

        <Stack
          spacing={2.5}
          divider={<Divider flexItem />}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            justifyContent="space-between"
            alignItems={{
              xs: "flex-start",
              sm: "center",
            }}
            spacing={1}
          >
            <Typography fontWeight={700}>
              Statut de la tentative
            </Typography>

            <Chip
              label={formatAttemptStatus(
                attemptStatus
              )}
              color={attemptChipColor}
            />
          </Stack>

          {!isStopped && (
            <>
              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                justifyContent="space-between"
                alignItems={{
                  xs: "flex-start",
                  sm: "center",
                }}
                spacing={1}
              >
                <Typography fontWeight={700}>
                  Score
                </Typography>

                <Typography
                  variant="h6"
                  fontWeight={700}
                >
                  {score}
                  {maximumScore > 0
                    ? ` / ${maximumScore}`
                    : ""}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "flex-start",
                    sm: "center",
                  }}
                  spacing={1}
                >
                  <Typography fontWeight={700}>
                    Pourcentage
                  </Typography>

                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color={
                      isPassed
                        ? "success.main"
                        : isFailed
                          ? "error.main"
                          : "text.primary"
                    }
                  >
                    {percentage.toFixed(2)}%
                  </Typography>
                </Stack>

                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  color={
                    isPassed
                      ? "success"
                      : isFailed
                        ? "error"
                        : "primary"
                  }
                  sx={{
                    height: 10,
                    borderRadius: 5,
                  }}
                />
              </Stack>

              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                justifyContent="space-between"
                alignItems={{
                  xs: "flex-start",
                  sm: "center",
                }}
                spacing={1}
              >
                <Typography fontWeight={700}>
                  Validation
                </Typography>

                <Chip
                  label={formatValidationStatus(
                    validationStatus
                  )}
                  color={validationChipColor}
                />
              </Stack>

              {successPercentage > 0 && (
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "flex-start",
                    sm: "center",
                  }}
                  spacing={1}
                >
                  <Typography fontWeight={700}>
                    Seuil de réussite
                  </Typography>

                  <Typography fontWeight={700}>
                    {successPercentage.toFixed(2)}%
                  </Typography>
                </Stack>
              )}

              {totalQuestions > 0 && (
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "flex-start",
                    sm: "center",
                  }}
                  spacing={1}
                >
                  <Typography fontWeight={700}>
                    Questions correctes
                  </Typography>

                  <Typography fontWeight={700}>
                    {correctQuestions} /{" "}
                    {totalQuestions}
                  </Typography>
                </Stack>
              )}
            </>
          )}

          {isStopped && (
            <Stack spacing={1}>
              <Typography
                fontWeight={700}
                color="error.main"
              >
                Tentative arrêtée
              </Typography>

              <Typography color="error.main">
                {result.cheating_reason ||
                  "Un changement d’onglet ou une action interdite a été détecté."}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Button
          fullWidth
          size="large"
          variant="contained"
          sx={{ mt: 4 }}
          onClick={handleBackToLogin}
        >
          Retour à la connexion
        </Button>
      </Paper>
    </Box>
  );
}

export default StudentResult;