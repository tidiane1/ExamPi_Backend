import express from "express";
import db from "../config/db.js";

const router = express.Router();

/**
 * Mélange un tableau.
 */
function shuffleArray(values) {
  const shuffledValues = [...values];

  for (
    let index = shuffledValues.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [
      shuffledValues[index],
      shuffledValues[randomIndex],
    ] = [
      shuffledValues[randomIndex],
      shuffledValues[index],
    ];
  }

  return shuffledValues;
}

/**
 * Transforme une date SQLite UTC en objet Date.
 */
function parseSqliteDate(value) {
  if (!value) {
    return null;
  }

  let normalizedValue = String(value)
    .trim()
    .replace(" ", "T");

  const hasTimezone =
    normalizedValue.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(normalizedValue);

  if (!hasTimezone) {
    normalizedValue += "Z";
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

/**
 * Normalise une liste d’identifiants.
 */
function normalizeIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map(Number)
        .filter(
          (value) =>
            Number.isInteger(value) &&
            value > 0
        )
    ),
  ].sort((first, second) => first - second);
}

/**
 * Vérifie que deux ensembles d’identifiants sont identiques.
 */
function haveSameIds(firstValues, secondValues) {
  const firstIds = normalizeIds(firstValues);
  const secondIds = normalizeIds(secondValues);

  return (
    firstIds.length === secondIds.length &&
    firstIds.every(
      (identifier, index) =>
        identifier === secondIds[index]
    )
  );
}

/**
 * Recherche le contexte complet d’une tentative.
 */
function getAttemptContext(attemptId) {
  return db
    .prepare(
      `
        SELECT
          exam_attempts.id,
          exam_attempts.student_id,
          exam_attempts.session_id,
          exam_attempts.start_time,
          exam_attempts.end_time,
          exam_attempts.status,
          exam_attempts.score,
          exam_attempts.percentage,
          exam_attempts.validation_status,
          exam_attempts.cheating_detected,
          exam_attempts.cheating_reason,

          exam_sessions.exam_id,
          exam_sessions.status AS session_status,

          exams.title AS exam_title,
          exams.duration_minutes,
          exams.number_of_questions,
          exams.success_percentage,
          exams.random_questions,
          exams.random_answers

        FROM exam_attempts

        JOIN exam_sessions
          ON exam_attempts.session_id =
             exam_sessions.id

        JOIN exams
          ON exam_sessions.exam_id =
             exams.id

        WHERE exam_attempts.id = ?
      `
    )
    .get(attemptId);
}

/**
 * Calcule le nombre de secondes restantes.
 */
function calculateRemainingSeconds(
  attempt,
  durationMinutes
) {
  const startDate = parseSqliteDate(
    attempt.start_time
  );

  if (!startDate) {
    return 0;
  }

  const durationSeconds =
    Math.max(
      0,
      Number(durationMinutes || 0)
    ) * 60;

  const elapsedSeconds = Math.floor(
    (Date.now() - startDate.getTime()) / 1000
  );

  return Math.max(
    0,
    durationSeconds - elapsedSeconds
  );
}

/**
 * GET /api/students
 */
router.get("/students", (req, res) => {
  try {
    const students = db
      .prepare(
        `
          SELECT
            id,
            matricule,
            first_name,
            last_name,
            is_active,
            created_at
          FROM students
          ORDER BY id DESC
        `
      )
      .all();

    return res.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("GET /students :", error);

    return res.status(500).json({
      success: false,
      message:
        "Erreur pendant la récupération des étudiants",
      error: error.message,
    });
  }
});

/**
 * POST /api/student/login
 */
router.post("/student/login", (req, res) => {
  try {
    const matricule = String(
      req.body.matricule || ""
    ).trim();

    const secretCode = String(
      req.body.secret_code || ""
    ).trim();

    if (!matricule || !secretCode) {
      return res.status(400).json({
        success: false,
        message:
          "Matricule et code secret obligatoires",
      });
    }

    const student = db
      .prepare(
        `
          SELECT
            id,
            matricule,
            first_name,
            last_name,
            is_active,
            created_at
          FROM students
          WHERE matricule = ?
            AND secret_code = ?
        `
      )
      .get(matricule, secretCode);

    if (!student) {
      return res.status(401).json({
        success: false,
        message:
          "Matricule ou code secret incorrect",
      });
    }

    if (Number(student.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message:
          "Ce compte étudiant est désactivé",
      });
    }

    const exams = db
      .prepare(
        `
          SELECT DISTINCT
            exams.id,
            exams.module_id,
            exams.title,
            exams.description,
            exams.duration_minutes,
            exams.number_of_questions,
            exams.success_percentage,
            exams.random_questions,
            exams.random_answers,
            exams.is_published,

            modules.name AS module_name,

            exam_sessions.id AS session_id,
            exam_sessions.status AS session_status

          FROM exams

          JOIN modules
            ON exams.module_id = modules.id

          JOIN exam_sessions
            ON exam_sessions.exam_id = exams.id

          WHERE exams.is_published = 1
            AND exam_sessions.status IN (
              'open',
              'active',
              'started',
              'in_progress'
            )

          ORDER BY exams.id DESC
        `
      )
      .all();

    return res.json({
      success: true,
      message:
        "Connexion étudiant réussie",
      student,
      exams,
    });
  } catch (error) {
    console.error(
      "POST /student/login :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur pendant la connexion étudiant",
      error: error.message,
    });
  }
});

/**
 * POST /api/student/start-exam
 */
router.post(
  "/student/start-exam",
  (req, res) => {
    try {
      const matricule = String(
        req.body.matricule || ""
      ).trim();

      const secretCode = String(
        req.body.secret_code || ""
      ).trim();

      const examId = Number(
        req.body.exam_id
      );

      if (
        !matricule ||
        !secretCode ||
        !Number.isInteger(examId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Matricule, code secret et examen obligatoires",
        });
      }

      const student = db
        .prepare(
          `
            SELECT
              id,
              matricule,
              first_name,
              last_name,
              is_active
            FROM students
            WHERE matricule = ?
              AND secret_code = ?
          `
        )
        .get(matricule, secretCode);

      if (!student) {
        return res.status(401).json({
          success: false,
          message:
            "Matricule ou code secret incorrect",
        });
      }

      if (Number(student.is_active) !== 1) {
        return res.status(403).json({
          success: false,
          message:
            "Ce compte étudiant est désactivé",
        });
      }

      const exam = db
        .prepare(
          `
            SELECT
              exams.id,
              exams.module_id,
              exams.title,
              exams.description,
              exams.duration_minutes,
              exams.number_of_questions,
              exams.success_percentage,
              exams.random_questions,
              exams.random_answers,
              exams.is_published,

              modules.name AS module_name

            FROM exams

            JOIN modules
              ON exams.module_id = modules.id

            WHERE exams.id = ?
          `
        )
        .get(examId);

      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Examen introuvable",
        });
      }

      if (Number(exam.is_published) !== 1) {
        return res.status(403).json({
          success: false,
          message:
            "Cet examen n’est pas publié",
        });
      }

      const session = db
        .prepare(
          `
            SELECT *
            FROM exam_sessions
            WHERE exam_id = ?
              AND status IN (
                'open',
                'active',
                'started',
                'in_progress'
              )
            ORDER BY id DESC
            LIMIT 1
          `
        )
        .get(examId);

      if (!session) {
        return res.status(403).json({
          success: false,
          message:
            "Le formateur n’a pas encore démarré cet examen",
        });
      }

      const existingAttempt = db
        .prepare(
          `
            SELECT *
            FROM exam_attempts
            WHERE student_id = ?
              AND session_id = ?
            ORDER BY id DESC
            LIMIT 1
          `
        )
        .get(student.id, session.id);

      if (existingAttempt) {
        if (
          existingAttempt.status ===
          "in_progress"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Une tentative est déjà en cours pour cet étudiant",
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "Cet étudiant a déjà passé cet examen pendant cette session",
        });
      }

      let availableQuestions = db
        .prepare(
          `
            SELECT
              id,
              exam_id,
              question_text,
              question_type,
              points,
              is_active
            FROM questions
            WHERE exam_id = ?
              AND is_active = 1
            ORDER BY id ASC
          `
        )
        .all(examId);

      if (availableQuestions.length === 0) {
        return res.status(409).json({
          success: false,
          message:
            "Aucune question active pour cet examen",
        });
      }

      const requestedQuestionCount = Math.min(
        Math.max(
          1,
          Number(
            exam.number_of_questions || 1
          )
        ),
        availableQuestions.length
      );

      if (
        Number(exam.random_questions) === 1
      ) {
        availableQuestions =
          shuffleArray(availableQuestions);
      }

      const selectedQuestions =
        availableQuestions.slice(
          0,
          requestedQuestionCount
        );

      const createAttemptTransaction =
        db.transaction(() => {
          const attemptResult = db
            .prepare(
              `
                INSERT INTO exam_attempts (
                  student_id,
                  session_id,
                  start_time,
                  status,
                  score,
                  percentage,
                  validation_status,
                  cheating_detected
                )
                VALUES (
                  ?,
                  ?,
                  CURRENT_TIMESTAMP,
                  'in_progress',
                  0,
                  0,
                  'pending',
                  0
                )
              `
            )
            .run(
              student.id,
              session.id
            );

          const attemptId = Number(
            attemptResult.lastInsertRowid
          );

          /*
           * question_order est obligatoire
           * dans la table attempt_questions.
           */
          const insertAttemptQuestion =
            db.prepare(
              `
                INSERT INTO attempt_questions (
                  attempt_id,
                  question_id,
                  question_order
                )
                VALUES (?, ?, ?)
              `
            );

          selectedQuestions.forEach(
            (question, index) => {
              insertAttemptQuestion.run(
                attemptId,
                question.id,
                index + 1
              );
            }
          );

          return attemptId;
        });

      const attemptId =
        createAttemptTransaction();

      const questionsForStudent =
        selectedQuestions.map((question) => {
          let questionAnswers = db
            .prepare(
              `
                SELECT
                  id,
                  question_id,
                  answer_text
                FROM answers
                WHERE question_id = ?
                ORDER BY id ASC
              `
            )
            .all(question.id);

          if (
            Number(exam.random_answers) === 1
          ) {
            questionAnswers =
              shuffleArray(questionAnswers);
          }

          /*
           * question_type est envoyé explicitement.
           */
          return {
            id: question.id,
            exam_id: question.exam_id,
            question_text:
              question.question_text,
            question_type:
              question.question_type,
            points: Number(
              question.points || 0
            ),
            answers: questionAnswers,
          };
        });

      return res.status(201).json({
        success: true,
        message:
          "Examen démarré avec succès",

        student: {
          id: student.id,
          matricule: student.matricule,
          first_name: student.first_name,
          last_name: student.last_name,
        },

        exam: {
          id: exam.id,
          module_id: exam.module_id,
          module_name: exam.module_name,
          title: exam.title,
          description: exam.description,
          duration_minutes:
            exam.duration_minutes,
          number_of_questions:
            exam.number_of_questions,
          success_percentage:
            exam.success_percentage,
        },

        session: {
          id: session.id,
          exam_id: session.exam_id,
          status: session.status,
        },

        attempt: {
          id: attemptId,
          student_id: student.id,
          session_id: session.id,
          status: "in_progress",
        },

        remaining_seconds:
          Number(
            exam.duration_minutes || 0
          ) * 60,

        questions: questionsForStudent,
      });
    } catch (error) {
      console.error(
        "POST /student/start-exam :",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur pendant le démarrage de l’examen",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/student/exam-timer/:attempt_id
 */
router.get(
  "/student/exam-timer/:attempt_id",
  (req, res) => {
    try {
      const attemptId = Number(
        req.params.attempt_id
      );

      if (!Number.isInteger(attemptId)) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant de tentative invalide",
        });
      }

      const attempt =
        getAttemptContext(attemptId);

      if (!attempt) {
        return res.status(404).json({
          success: false,
          message:
            "Tentative introuvable",
        });
      }

      if (
        attempt.status !== "in_progress"
      ) {
        return res.json({
          success: true,
          remaining_seconds: 0,
          expired: true,
          status: attempt.status,
        });
      }

      const remainingSeconds =
        calculateRemainingSeconds(
          attempt,
          attempt.duration_minutes
        );

      return res.json({
        success: true,
        attempt_id: attempt.id,
        status: attempt.status,
        remaining_seconds:
          remainingSeconds,
        expired:
          remainingSeconds <= 0,
      });
    } catch (error) {
      console.error(
        "GET /student/exam-timer :",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur pendant la récupération du chronomètre",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/student/security-event
 */
router.post(
  "/student/security-event",
  (req, res) => {
    try {
      const attemptId = Number(
        req.body.attempt_id
      );

      const eventType = String(
        req.body.event_type ||
          "TAB_HIDDEN"
      ).trim();

      const description = String(
        req.body.description ||
          "L’étudiant a quitté l’onglet de l’examen"
      ).trim();

      if (!Number.isInteger(attemptId)) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant de tentative invalide",
        });
      }

      const attempt =
        getAttemptContext(attemptId);

      if (!attempt) {
        return res.status(404).json({
          success: false,
          message:
            "Tentative introuvable",
        });
      }

      if (
        attempt.status !== "in_progress"
      ) {
        return res.json({
          success: true,
          message:
            "Cette tentative est déjà terminée",
          attempt_id: attempt.id,
          status: attempt.status,
          score: attempt.score,
          percentage:
            attempt.percentage,
          validation_status:
            attempt.validation_status,
          cheating_detected:
            attempt.cheating_detected,
        });
      }

      const stopAttemptTransaction =
        db.transaction(() => {
          db.prepare(
            `
              INSERT INTO security_events (
                attempt_id,
                event_type,
                description,
                created_at
              )
              VALUES (
                ?,
                ?,
                ?,
                CURRENT_TIMESTAMP
              )
            `
          ).run(
            attemptId,
            eventType,
            description
          );

          db.prepare(
            `
              UPDATE exam_attempts
              SET
                status = 'stopped',
                end_time = CURRENT_TIMESTAMP,
                score = 0,
                percentage = 0,
                validation_status = 'failed',
                cheating_detected = 1,
                cheating_reason = ?
              WHERE id = ?
            `
          ).run(
            description,
            attemptId
          );
        });

      stopAttemptTransaction();

      return res.status(200).json({
        success: false,
        message:
          "Examen arrêté : changement d’onglet détecté.",
        attempt_id: attemptId,
        status: "stopped",
        score: 0,
        percentage: 0,
        validation_status: "failed",
        cheating_detected: 1,
        cheating_reason: description,

        exam: {
          id: attempt.exam_id,
          title: attempt.exam_title,
        },
      });
    } catch (error) {
      console.error(
        "POST /student/security-event :",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur pendant l’enregistrement de l’événement de sécurité",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/student/submit-exam
 */
router.post(
  "/student/submit-exam",
  (req, res) => {
    try {
      const attemptId = Number(
        req.body.attempt_id
      );

      const submittedAnswers =
        Array.isArray(req.body.answers)
          ? req.body.answers
          : [];

      const automatic =
        Boolean(req.body.automatic);

      if (!Number.isInteger(attemptId)) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant de tentative invalide",
        });
      }

      const attempt =
        getAttemptContext(attemptId);

      if (!attempt) {
        return res.status(404).json({
          success: false,
          message:
            "Tentative introuvable",
        });
      }

      if (
        attempt.status !== "in_progress"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Cette tentative est déjà terminée",
          status: attempt.status,
        });
      }

      const attemptQuestions = db
        .prepare(
          `
            SELECT
              questions.id,
              questions.question_text,
              questions.question_type,
              questions.points,
              attempt_questions.question_order

            FROM attempt_questions

            JOIN questions
              ON attempt_questions.question_id =
                 questions.id

            WHERE attempt_questions.attempt_id = ?

            ORDER BY
              attempt_questions.question_order ASC
          `
        )
        .all(attemptId);

      if (attemptQuestions.length === 0) {
        return res.status(409).json({
          success: false,
          message:
            "Aucune question associée à cette tentative",
        });
      }

      /*
       * Map :
       * question_id -> answer_ids
       */
      const answersByQuestion =
        new Map();

      submittedAnswers.forEach(
        (submittedAnswer) => {
          const questionId = Number(
            submittedAnswer.question_id
          );

          if (
            !Number.isInteger(questionId)
          ) {
            return;
          }

          /*
           * Compatibilité avec l’ancien format answer_id.
           */
          const answerIds = Array.isArray(
            submittedAnswer.answer_ids
          )
            ? submittedAnswer.answer_ids
            : submittedAnswer.answer_id
              ? [
                  submittedAnswer.answer_id,
                ]
              : [];

          answersByQuestion.set(
            questionId,
            normalizeIds(answerIds)
          );
        }
      );

      let obtainedScore = 0;
      let maximumScore = 0;
      let correctQuestions = 0;

      const details = [];

      const submitTransaction =
        db.transaction(() => {
          /*
           * Supprime une éventuelle soumission partielle.
           */
          db.prepare(
            `
              DELETE FROM student_answers
              WHERE attempt_id = ?
            `
          ).run(attemptId);

          const insertStudentAnswer =
            db.prepare(
              `
                INSERT INTO student_answers (
                  attempt_id,
                  question_id,
                  answer_id,
                  is_correct
                )
                VALUES (?, ?, ?, ?)
              `
            );

          for (
            const question of
            attemptQuestions
          ) {
            const questionId = Number(
              question.id
            );

            const questionPoints =
              Number(
                question.points || 0
              );

            maximumScore +=
              questionPoints;

            const selectedAnswerIds =
              answersByQuestion.get(
                questionId
              ) || [];

            const questionAnswers = db
              .prepare(
                `
                  SELECT
                    id,
                    is_correct
                  FROM answers
                  WHERE question_id = ?
                `
              )
              .all(questionId);

            const validAnswerIds =
              questionAnswers.map(
                (answer) =>
                  Number(answer.id)
              );

            const invalidAnswer =
              selectedAnswerIds.some(
                (answerId) =>
                  !validAnswerIds.includes(
                    answerId
                  )
              );

            if (invalidAnswer) {
              throw new Error(
                `Une réponse sélectionnée n’appartient pas à la question ${questionId}`
              );
            }

            const correctAnswerIds =
              questionAnswers
                .filter(
                  (answer) =>
                    Number(
                      answer.is_correct
                    ) === 1
                )
                .map((answer) =>
                  Number(answer.id)
                );

            /*
             * La sélection doit être exactement identique
             * à l’ensemble des bonnes réponses.
             */
            const questionIsCorrect =
              haveSameIds(
                selectedAnswerIds,
                correctAnswerIds
              );

            if (questionIsCorrect) {
              obtainedScore +=
                questionPoints;

              correctQuestions += 1;
            }

            /*
             * Chaque réponse sélectionnée est enregistrée.
             */
            for (
              const answerId of
              selectedAnswerIds
            ) {
              insertStudentAnswer.run(
                attemptId,
                questionId,
                answerId,
                questionIsCorrect ? 1 : 0
              );
            }

            details.push({
              question_id: questionId,
              question_type:
                question.question_type,
              selected_answer_ids:
                selectedAnswerIds,
              is_correct:
                questionIsCorrect,
              points_obtained:
                questionIsCorrect
                  ? questionPoints
                  : 0,
              maximum_points:
                questionPoints,
            });
          }

          const percentage =
            maximumScore > 0
              ? Number(
                  (
                    (obtainedScore /
                      maximumScore) *
                    100
                  ).toFixed(2)
                )
              : 0;

          const validationStatus =
            percentage >=
            Number(
              attempt.success_percentage ||
                0
            )
              ? "passed"
              : "failed";

          const finalStatus =
            automatic
              ? "expired"
              : "submitted";

          db.prepare(
            `
              UPDATE exam_attempts
              SET
                end_time = CURRENT_TIMESTAMP,
                status = ?,
                score = ?,
                percentage = ?,
                validation_status = ?
              WHERE id = ?
            `
          ).run(
            finalStatus,
            obtainedScore,
            percentage,
            validationStatus,
            attemptId
          );

          return {
            percentage,
            validationStatus,
            finalStatus,
          };
        });

      const correctionResult =
        submitTransaction();

      return res.json({
        success: true,

        message: automatic
          ? "Temps écoulé : examen soumis automatiquement"
          : "Examen soumis avec succès",

        attempt_id: attemptId,
        status:
          correctionResult.finalStatus,

        score: obtainedScore,
        maximum_score: maximumScore,

        percentage:
          correctionResult.percentage,

        validation_status:
          correctionResult.validationStatus,

        correct_questions:
          correctQuestions,

        total_questions:
          attemptQuestions.length,

        cheating_detected: 0,

        exam: {
          id: attempt.exam_id,
          title: attempt.exam_title,
          success_percentage:
            attempt.success_percentage,
        },

        details,
      });
    } catch (error) {
      console.error(
        "POST /student/submit-exam :",
        error
      );

      const isValidationError =
        String(error.message).includes(
          "n’appartient pas à la question"
        );

      return res
        .status(
          isValidationError ? 400 : 500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Erreur pendant la soumission de l’examen",
        });
    }
  }
);

export default router;