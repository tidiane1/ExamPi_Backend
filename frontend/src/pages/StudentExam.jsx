import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";

import api from "../api/api";

/**
 * Normalise le type de question.
 *
 * Valeurs reconnues comme choix multiples :
 * - multiple_choice
 * - multiple-choice
 * - multiple choice
 * - multiple
 * - checkbox
 */
function isMultipleChoiceQuestion(question) {
  const rawType =
    question?.question_type ??
    question?.questionType ??
    question?.type ??
    "";

  const normalizedType = String(rawType)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return [
    "multiple_choice",
    "multiple_choices",
    "multiple",
    "multiple_answers",
    "checkbox",
  ].includes(normalizedType);
}

/**
 * Charge la tentative depuis localStorage.
 */
function loadStoredExam() {
  try {
    const storedExam = localStorage.getItem("student_exam");

    if (!storedExam) {
      return null;
    }

    const parsedExam = JSON.parse(storedExam);

    const validAttempt = Boolean(parsedExam?.attempt?.id);
    const validQuestions = Array.isArray(parsedExam?.questions);

    if (!validAttempt || !validQuestions) {
      localStorage.removeItem("student_exam");
      return null;
    }

    return parsedExam;
  } catch (error) {
    console.error(
      "Erreur pendant la lecture de student_exam :",
      error
    );

    localStorage.removeItem("student_exam");
    return null;
  }
}

/**
 * Retourne le temps initial de la tentative.
 */
function getInitialRemainingSeconds(examData) {
  if (!examData) {
    return 0;
  }

  const durationSeconds =
    Number(examData.exam?.duration_minutes || 0) * 60;

  const initialSeconds = Number(
    examData.remaining_seconds ?? durationSeconds
  );

  if (!Number.isFinite(initialSeconds)) {
    return durationSeconds;
  }

  return Math.max(0, initialSeconds);
}

function StudentExam() {
  const navigate = useNavigate();

  const [examData] = useState(loadStoredExam);

  const [selectedAnswers, setSelectedAnswers] = useState({});

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getInitialRemainingSeconds(examData)
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /*
   * Évite les doubles soumissions.
   */
  const examSubmittedRef = useRef(false);

  /*
   * Évite l’envoi de plusieurs événements de sécurité.
   */
  const securityEventSentRef = useRef(false);

  /*
   * Contient toujours les dernières réponses sélectionnées.
   */
  const selectedAnswersRef = useRef(selectedAnswers);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  /**
   * Redirection lorsqu’aucune tentative valide n’est disponible.
   */
  useEffect(() => {
    if (!examData) {
      navigate("/student/login", {
        replace: true,
      });
    }
  }, [examData, navigate]);

  /**
   * Sélection pour une question à choix unique.
   */
  const handleSelectSingleAnswer = (
    questionId,
    answerId
  ) => {
    setSelectedAnswers((previousAnswers) => ({
      ...previousAnswers,
      [questionId]: Number(answerId),
    }));
  };

  /**
   * Sélection/désélection pour une question à choix multiples.
   */
  const handleToggleMultipleAnswer = (
    questionId,
    answerId
  ) => {
    const numericAnswerId = Number(answerId);

    setSelectedAnswers((previousAnswers) => {
      const currentAnswers = Array.isArray(
        previousAnswers[questionId]
      )
        ? previousAnswers[questionId].map(Number)
        : [];

      const alreadySelected =
        currentAnswers.includes(numericAnswerId);

      const updatedAnswers = alreadySelected
        ? currentAnswers.filter(
            (currentId) =>
              currentId !== numericAnswerId
          )
        : [...currentAnswers, numericAnswerId];

      return {
        ...previousAnswers,
        [questionId]: updatedAnswers,
      };
    });
  };

  /**
   * Construit les réponses au format du backend.
   *
   * Choix unique :
   * {
   *   question_id: 1,
   *   answer_ids: [3]
   * }
   *
   * Choix multiples :
   * {
   *   question_id: 2,
   *   answer_ids: [5, 7]
   * }
   */
  const buildSubmittedAnswers = useCallback(
    (answersState = selectedAnswersRef.current) => {
      if (!Array.isArray(examData?.questions)) {
        return [];
      }

      return examData.questions.map((question) => {
        const selectedValue =
          answersState[question.id];

        if (isMultipleChoiceQuestion(question)) {
          return {
            question_id: Number(question.id),

            answer_ids: Array.isArray(selectedValue)
              ? selectedValue.map(Number)
              : [],
          };
        }

        const hasSelectedAnswer =
          selectedValue !== undefined &&
          selectedValue !== null &&
          selectedValue !== "";

        return {
          question_id: Number(question.id),

          answer_ids: hasSelectedAnswer
            ? [Number(selectedValue)]
            : [],
        };
      });
    },
    [examData]
  );

  /**
   * Soumission de l’examen.
   */
  const submitExam = useCallback(
    async ({ automatic = false } = {}) => {
      if (
        !examData?.attempt?.id ||
        examSubmittedRef.current
      ) {
        return;
      }

      setError("");

      const answers = buildSubmittedAnswers();

      if (!automatic) {
        const unansweredQuestions = answers.filter(
          (answer) =>
            !Array.isArray(answer.answer_ids) ||
            answer.answer_ids.length === 0
        );

        if (unansweredQuestions.length > 0) {
          setError(
            `Veuillez répondre à toutes les questions. ` +
              `${unansweredQuestions.length} question(s) sans réponse.`
          );

          return;
        }

        const confirmed = window.confirm(
          "Voulez-vous vraiment soumettre votre examen ?"
        );

        if (!confirmed) {
          return;
        }
      }

      examSubmittedRef.current = true;
      setSubmitting(true);

      try {
        const response = await api.post(
          "/student/submit-exam",
          {
            attempt_id: Number(
              examData.attempt.id
            ),
            answers,
            automatic,
          }
        );

        localStorage.setItem(
          "student_result",
          JSON.stringify(response.data)
        );

        localStorage.removeItem("student_exam");

        navigate("/student/result", {
          replace: true,
        });
      } catch (requestError) {
        examSubmittedRef.current = false;

        console.error(
          "Erreur pendant la soumission :",
          requestError
        );

        setError(
          requestError.response?.data?.message ||
            "Erreur pendant la soumission de l’examen"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [buildSubmittedAnswers, examData, navigate]
  );

  /**
   * Synchronisation du chronomètre avec le backend.
   */
  useEffect(() => {
    if (!examData?.attempt?.id) {
      return undefined;
    }

    let componentMounted = true;
    let requestInProgress = false;

    const synchronizeTimer = async () => {
      if (
        requestInProgress ||
        examSubmittedRef.current
      ) {
        return;
      }

      requestInProgress = true;

      try {
        const response = await api.get(
          `/student/exam-timer/${examData.attempt.id}`
        );

        if (!componentMounted) {
          return;
        }

        const serverSeconds = Math.max(
          0,
          Number(
            response.data.remaining_seconds || 0
          )
        );

        setRemainingSeconds(serverSeconds);

        if (
          response.data.expired ||
          serverSeconds <= 0
        ) {
          await submitExam({
            automatic: true,
          });
        }
      } catch (timerError) {
        console.error(
          "Erreur de synchronisation du chronomètre :",
          timerError
        );
      } finally {
        requestInProgress = false;
      }
    };

    synchronizeTimer();

    const serverInterval = window.setInterval(
      synchronizeTimer,
      5000
    );

    return () => {
      componentMounted = false;
      window.clearInterval(serverInterval);
    };
  }, [examData, submitExam]);

  /**
   * Décompte visuel local.
   */
  useEffect(() => {
    if (!examData?.attempt?.id) {
      return undefined;
    }

    const localInterval = window.setInterval(() => {
      if (examSubmittedRef.current) {
        return;
      }

      setRemainingSeconds((previousSeconds) =>
        previousSeconds > 0
          ? previousSeconds - 1
          : 0
      );
    }, 1000);

    return () => {
      window.clearInterval(localInterval);
    };
  }, [examData]);

  /**
   * Soumission automatique à zéro.
   */
  useEffect(() => {
    if (
      examData?.attempt?.id &&
      remainingSeconds === 0 &&
      !examSubmittedRef.current
    ) {
      submitExam({
        automatic: true,
      });
    }
  }, [
    examData,
    remainingSeconds,
    submitExam,
  ]);

  /**
   * Détection d’un changement réel d’onglet.
   *
   * window.blur n’est pas utilisé afin de ne pas considérer
   * la fenêtre « Enregistrer le mot de passe » comme une triche.
   */
  useEffect(() => {
    if (!examData?.attempt?.id) {
      return undefined;
    }

    const stopExamForCheating = async () => {
      if (
        securityEventSentRef.current ||
        examSubmittedRef.current
      ) {
        return;
      }

      securityEventSentRef.current = true;
      examSubmittedRef.current = true;

      const description =
        "L’étudiant a quitté l’onglet de l’examen " +
        "ou a réduit le navigateur.";

      try {
        const response = await api.post(
          "/student/security-event",
          {
            attempt_id: Number(
              examData.attempt.id
            ),
            event_type: "TAB_HIDDEN",
            description,
          }
        );

        localStorage.setItem(
          "student_result",
          JSON.stringify(response.data)
        );

        localStorage.removeItem("student_exam");

        navigate("/student/result", {
          replace: true,
        });
      } catch (securityError) {
        securityEventSentRef.current = false;
        examSubmittedRef.current = false;

        console.error(
          "Erreur pendant l’événement de sécurité :",
          securityError
        );

        setError(
          securityError.response?.data?.message ||
            "Impossible d’enregistrer l’événement de sécurité"
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopExamForCheating();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [examData, navigate]);

  /**
   * Chronomètre MM:SS.
   */
  const formatTime = (seconds) => {
    const safeSeconds = Math.max(
      0,
      Number(seconds || 0)
    );

    const minutes = Math.floor(
      safeSeconds / 60
    );

    const secondsPart =
      safeSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secondsPart).padStart(2, "0")}`;
  };

  /**
   * Nombre de questions répondues.
   */
  const answeredQuestionsCount = useMemo(() => {
    if (!Array.isArray(examData?.questions)) {
      return 0;
    }

    return examData.questions.filter(
      (question) => {
        const selectedValue =
          selectedAnswers[question.id];

        if (isMultipleChoiceQuestion(question)) {
          return (
            Array.isArray(selectedValue) &&
            selectedValue.length > 0
          );
        }

        return (
          selectedValue !== undefined &&
          selectedValue !== null &&
          selectedValue !== ""
        );
      }
    ).length;
  }, [examData, selectedAnswers]);

  if (!examData) {
    return null;
  }

  const questions = examData.questions || [];
  const exam = examData.exam || {};
  const student = examData.student || {};

  const progress =
    questions.length > 0
      ? (answeredQuestionsCount /
          questions.length) *
        100
      : 0;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
        p: {
          xs: 1.5,
          sm: 3,
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1300,
          mx: "auto",
        }}
      >
        <Paper
          sx={{
            p: {
              xs: 2,
              md: 3,
            },
            mb: 3,
            borderRadius: 3,
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
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  wordBreak: "break-word",
                }}
              >
                {exam.title || "Examen"}
              </Typography>

              <Typography color="text.secondary">
                Étudiant :{" "}
                <strong>
                  {student.first_name}{" "}
                  {student.last_name}
                </strong>

                {student.matricule
                  ? ` — ${student.matricule}`
                  : ""}
              </Typography>

              <Typography color="text.secondary">
                Questions : {questions.length}
                {" | "}
                Durée :{" "}
                {exam.duration_minutes || "-"} min
                {" | "}
                Seuil :{" "}
                {exam.success_percentage ?? "-"}%
              </Typography>
            </Box>

            <Chip
              label={`Temps restant : ${formatTime(
                remainingSeconds
              )}`}
              color={
                remainingSeconds <= 60
                  ? "error"
                  : "primary"
              }
              sx={{
                fontSize: 18,
                fontWeight: 700,
                px: 1.5,
                py: 2.5,
              }}
            />
          </Stack>

          <Box sx={{ mt: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="body2">
                Progression
              </Typography>

              <Typography variant="body2">
                {answeredQuestionsCount}/
                {questions.length}
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
              }}
            />
          </Box>
        </Paper>

        <Alert
          severity="warning"
          sx={{ mb: 3 }}
        >
          Ne quittez pas l’onglet de l’examen.
          Un changement d’onglet ou une réduction du
          navigateur peut arrêter automatiquement la
          tentative.
        </Alert>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          {questions.map(
            (question, index) => {
              const isMultipleChoice =
                isMultipleChoiceQuestion(question);

              const multipleSelectedValues =
                Array.isArray(
                  selectedAnswers[question.id]
                )
                  ? selectedAnswers[
                      question.id
                    ].map(Number)
                  : [];

              return (
                <Paper
                  key={question.id}
                  sx={{
                    p: {
                      xs: 2,
                      md: 3,
                    },
                    borderRadius: 3,
                  }}
                >
                  <Stack
                    direction={{
                      xs: "column",
                      sm: "row",
                    }}
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight={700}
                    >
                      Question {index + 1}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <Chip
                        label={`${
                          question.points ?? 1
                        } point(s)`}
                        size="small"
                      />

                      <Chip
                        label={
                          isMultipleChoice
                            ? "Choix multiples"
                            : "Choix unique"
                        }
                        color={
                          isMultipleChoice
                            ? "secondary"
                            : "default"
                        }
                        size="small"
                      />
                    </Stack>
                  </Stack>

                  <Typography
                    sx={{
                      mb: 2,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {question.question_text}
                  </Typography>

                  {isMultipleChoice ? (
                    <>
                      <Alert
                        severity="info"
                        sx={{ mb: 1.5 }}
                      >
                        Plusieurs réponses peuvent être
                        sélectionnées.
                      </Alert>

                      <FormGroup>
                        {(question.answers || []).map(
                          (answer) => (
                            <FormControlLabel
                              key={answer.id}
                              control={
                                <Checkbox
                                  checked={multipleSelectedValues.includes(
                                    Number(
                                      answer.id
                                    )
                                  )}
                                  onChange={() =>
                                    handleToggleMultipleAnswer(
                                      question.id,
                                      answer.id
                                    )
                                  }
                                />
                              }
                              label={
                                answer.answer_text
                              }
                            />
                          )
                        )}
                      </FormGroup>
                    </>
                  ) : (
                    <RadioGroup
                      value={
                        selectedAnswers[
                          question.id
                        ] !== undefined
                          ? String(
                              selectedAnswers[
                                question.id
                              ]
                            )
                          : ""
                      }
                      onChange={(event) =>
                        handleSelectSingleAnswer(
                          question.id,
                          event.target.value
                        )
                      }
                    >
                      {(question.answers || []).map(
                        (answer) => (
                          <FormControlLabel
                            key={answer.id}
                            value={String(
                              answer.id
                            )}
                            control={<Radio />}
                            label={
                              answer.answer_text
                            }
                          />
                        )
                      )}
                    </RadioGroup>
                  )}
                </Paper>
              );
            }
          )}
        </Stack>

        <Paper
          sx={{
            p: 2,
            mt: 3,
            borderRadius: 3,
            position: "sticky",
            bottom: 10,
            zIndex: 10,
          }}
        >
          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={submitting}
            onClick={() =>
              submitExam({
                automatic: false,
              })
            }
          >
            {submitting
              ? "Soumission en cours..."
              : "Soumettre l’examen"}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

export default StudentExam;