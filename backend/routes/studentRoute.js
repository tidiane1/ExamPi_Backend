import express from "express";
import db from "../config/db.js";

const router = express.Router();

router.get("/students", (req, res) => {
  const students = db.prepare(`
    SELECT 
      id,
      matricule,
      first_name,
      last_name,
      is_active,
      secret_code,
      created_at
    FROM students
  `).all();

  res.json(students);
});
router.post("/student/login", (req, res) => {
  const { matricule, secret_code } = req.body;

  if (!matricule || !secret_code) {
    return res.status(400).json({
      message: "Matricule et code secret obligatoires"
    });
  }

  const student = db.prepare(`
    SELECT id, matricule, first_name, last_name, is_active
    FROM students
    WHERE matricule = ? AND secret_code = ?
  `).get(matricule, secret_code);

  if (!student) {
    return res.status(401).json({
      message: "Matricule ou code secret incorrect"
    });
  }

  if (student.is_active !== 1) {
    return res.status(403).json({
      message: "Votre compte n’est pas autorisé à passer l’examen"
    });
  }

  res.json({
    message: "Connexion réussie",
    student
  });
});
router.post("/student/start-exam", (req, res) => {
  const { matricule, secret_code, exam_id } = req.body;

  if (!matricule || !secret_code || !exam_id) {
    return res.status(400).json({
      success: false,
      message: "matricule, secret_code et exam_id sont obligatoires"
    });
  }

  // 1. Vérifier l'étudiant
  const student = db.prepare(`
    SELECT 
      id,
      matricule,
      first_name,
      last_name,
      is_active
    FROM students
    WHERE matricule = ? AND secret_code = ?
  `).get(matricule, secret_code);

  if (!student) {
    return res.status(401).json({
      success: false,
      message: "Matricule ou code secret incorrect"
    });
  }

  if (student.is_active !== 1) {
    return res.status(403).json({
      success: false,
      message: "Votre compte n’est pas autorisé à passer l’examen"
    });
  }

  // 2. Vérifier si la session est ouverte
  const session = db.prepare(`
    SELECT 
      exam_sessions.id,
      exam_sessions.exam_id,
      exam_sessions.status,
      exam_sessions.start_time,
      exams.title,
      exams.duration_minutes,
      exams.number_of_questions,
      exams.success_percentage
    FROM exam_sessions
    JOIN exams ON exam_sessions.exam_id = exams.id
    WHERE exam_sessions.exam_id = ?
    AND exam_sessions.status = 'open'
    ORDER BY exam_sessions.id DESC
    LIMIT 1
  `).get(exam_id);

  if (!session) {
    return res.status(403).json({
      success: false,
      message: "L’examen n’est pas encore démarré par le formateur"
    });
  }

  // 3. Vérifier si l'étudiant a déjà une tentative
  const existingAttempt = db.prepare(`
    SELECT * FROM exam_attempts
    WHERE session_id = ? AND student_id = ?
  `).get(session.id, student.id);

  if (existingAttempt) {
    return res.status(409).json({
      success: false,
      message: "Vous avez déjà commencé cet examen",
      attempt: existingAttempt
    });
  }

  // 4. Créer une tentative d'examen
  const attemptResult = db.prepare(`
    INSERT INTO exam_attempts (
      session_id,
      student_id,
      status,
      validation_status,
      is_submitted
    )
    VALUES (?, ?, 'in_progress', 'pending', 0)
  `).run(session.id, student.id);

  const attemptId = attemptResult.lastInsertRowid;

  // 5. Tirer les questions aléatoirement
  const questions = db.prepare(`
    SELECT 
      id,
      question_text,
      question_type,
      points
    FROM questions
    WHERE exam_id = ?
    AND is_active = 1
    ORDER BY RANDOM()
    LIMIT ?
  `).all(exam_id, session.number_of_questions);

  if (questions.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Aucune question disponible pour cet examen"
    });
  }

  // 6. Enregistrer les questions attribuées à cet étudiant
  const insertAttemptQuestion = db.prepare(`
    INSERT INTO attempt_questions (
      attempt_id,
      question_id,
      question_order
    )
    VALUES (?, ?, ?)
  `);

  questions.forEach((question, index) => {
    insertAttemptQuestion.run(attemptId, question.id, index + 1);
  });

  // 7. Récupérer les questions avec réponses mélangées
  const questionsWithAnswers = questions.map((question, index) => {
    const answers = db.prepare(`
      SELECT 
        id,
        answer_text
      FROM answers
      WHERE question_id = ?
      ORDER BY RANDOM()
    `).all(question.id);

    return {
      order: index + 1,
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      answers
    };
  });

  res.status(201).json({
    success: true,
    message: "Examen démarré avec succès",
    student,
    session: {
      id: session.id,
      exam_id: session.exam_id,
      title: session.title,
      duration_minutes: session.duration_minutes,
      number_of_questions: session.number_of_questions,
      success_percentage: session.success_percentage
    },
    attempt: {
      id: attemptId,
      status: "in_progress"
    },
    questions: questionsWithAnswers
  });
});
router.post("/student/submit-exam", (req, res) => {
  try {
    const { attempt_id, answers } = req.body;

    if (!attempt_id || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attempt_id et answers sont obligatoires"
      });
    }

    // 1. Vérifier la tentative
    const attempt = db.prepare(`
      SELECT 
        exam_attempts.id,
        exam_attempts.session_id,
        exam_attempts.student_id,
        exam_attempts.start_time,
        exam_attempts.status,
        exam_attempts.is_submitted,
        exam_sessions.exam_id,
        exams.success_percentage,
        exams.duration_minutes
      FROM exam_attempts
      JOIN exam_sessions ON exam_attempts.session_id = exam_sessions.id
      JOIN exams ON exam_sessions.exam_id = exams.id
      WHERE exam_attempts.id = ?
    `).get(attempt_id);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Tentative introuvable"
      });
    }

    if (attempt.is_submitted === 1 || attempt.status === "submitted") {
      return res.status(409).json({
        success: false,
        message: "Cet examen a déjà été soumis"
      });
    }

    if (attempt.status !== "in_progress") {
      return res.status(403).json({
        success: false,
        message: "Cette tentative n’est plus active"
      });
    }

    // 2. Vérifier si le temps est dépassé
    const startTime = new Date(attempt.start_time.replace(" ", "T") + "Z");
    const now = new Date();

    if (isNaN(startTime.getTime())) {
      return res.status(500).json({
        success: false,
        message: "Format de date invalide dans start_time",
        start_time: attempt.start_time
      });
    }

    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const durationSeconds = Number(attempt.duration_minutes) * 60;

    if (elapsedSeconds > durationSeconds) {
      db.prepare(`
        UPDATE exam_attempts
        SET 
          end_time = CURRENT_TIMESTAMP,
          status = 'expired',
          validation_status = 'failed',
          is_submitted = 1
        WHERE id = ?
      `).run(attempt_id);

      return res.status(403).json({
        success: false,
        message: "Temps écoulé. L’examen est expiré.",
        status: "expired"
      });
    }

    // 3. Récupérer les questions attribuées à cet étudiant
    const attemptQuestions = db.prepare(`
      SELECT 
        attempt_questions.question_id,
        questions.points
      FROM attempt_questions
      JOIN questions ON attempt_questions.question_id = questions.id
      WHERE attempt_questions.attempt_id = ?
    `).all(attempt_id);

    if (attemptQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune question trouvée pour cette tentative"
      });
    }

    const allowedQuestionIds = attemptQuestions.map(q => q.question_id);

    // 4. Nettoyer les anciennes réponses au cas où
    db.prepare(`
      DELETE FROM student_answers
      WHERE attempt_id = ?
    `).run(attempt_id);

    const insertStudentAnswer = db.prepare(`
      INSERT INTO student_answers (
        attempt_id,
        question_id,
        answer_id,
        is_correct
      )
      VALUES (?, ?, ?, ?)
    `);

    let score = 0;
    let totalPoints = 0;
    let correctAnswersCount = 0;

    for (const question of attemptQuestions) {
      totalPoints += Number(question.points);
    }

    // 5. Vérifier chaque réponse envoyée
    for (const item of answers) {
      const { question_id, answer_id } = item;

      if (!question_id || !answer_id) {
        return res.status(400).json({
          success: false,
          message: "Chaque réponse doit contenir question_id et answer_id"
        });
      }

      if (!allowedQuestionIds.includes(question_id)) {
        return res.status(403).json({
          success: false,
          message: `La question ${question_id} n’appartient pas à cette tentative`
        });
      }

      const answer = db.prepare(`
        SELECT 
          answers.id,
          answers.question_id,
          answers.is_correct,
          questions.points
        FROM answers
        JOIN questions ON answers.question_id = questions.id
        WHERE answers.id = ?
        AND answers.question_id = ?
      `).get(answer_id, question_id);

      if (!answer) {
        return res.status(404).json({
          success: false,
          message: `Réponse introuvable pour la question ${question_id}`
        });
      }

      const isCorrect = answer.is_correct === 1 ? 1 : 0;

      if (isCorrect === 1) {
        score += Number(answer.points);
        correctAnswersCount += 1;
      }

      insertStudentAnswer.run(
        attempt_id,
        question_id,
        answer_id,
        isCorrect
      );
    }

    // 6. Calcul du résultat
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

    const validationStatus =
      percentage >= attempt.success_percentage ? "passed" : "failed";

    db.prepare(`
      UPDATE exam_attempts
      SET 
        end_time = CURRENT_TIMESTAMP,
        score = ?,
        percentage = ?,
        status = 'submitted',
        validation_status = ?,
        is_submitted = 1
      WHERE id = ?
    `).run(
      score,
      percentage,
      validationStatus,
      attempt_id
    );

    res.json({
      success: true,
      message: "Examen soumis avec succès",
      result: {
        attempt_id,
        score,
        totalPoints,
        percentage: Number(percentage.toFixed(2)),
        correctAnswersCount,
        totalQuestions: attemptQuestions.length,
        success_percentage_required: attempt.success_percentage,
        validation_status: validationStatus
      }
    });

  } catch (error) {
    console.error("Erreur submit-exam :", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la soumission de l’examen",
      error: error.message
    });
  }
});
router.get("/student/exam-timer/:attempt_id", (req, res) => {
  try {
    const { attempt_id } = req.params;

    const attempt = db.prepare(`
      SELECT 
        exam_attempts.id,
        exam_attempts.start_time,
        exam_attempts.end_time,
        exam_attempts.status,
        exam_attempts.is_submitted,
        exams.duration_minutes
      FROM exam_attempts
      JOIN exam_sessions ON exam_attempts.session_id = exam_sessions.id
      JOIN exams ON exam_sessions.exam_id = exams.id
      WHERE exam_attempts.id = ?
    `).get(attempt_id);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Tentative introuvable"
      });
    }

    if (attempt.status !== "in_progress") {
      return res.json({
        success: true,
        message: "La tentative n’est plus active",
        status: attempt.status,
        remaining_seconds: 0,
        expired: true
      });
    }

    // Conversion propre du format SQLite vers Date JavaScript
    const startTime = new Date(attempt.start_time.replace(" ", "T") + "Z");
    const now = new Date();

    if (isNaN(startTime.getTime())) {
      return res.status(500).json({
        success: false,
        message: "Format de date invalide dans start_time",
        start_time: attempt.start_time
      });
    }

    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const durationSeconds = Number(attempt.duration_minutes) * 60;
    const remainingSeconds = durationSeconds - elapsedSeconds;

    if (remainingSeconds <= 0) {
      db.prepare(`
        UPDATE exam_attempts
        SET 
          end_time = CURRENT_TIMESTAMP,
          status = 'expired',
          validation_status = 'failed',
          is_submitted = 1
        WHERE id = ?
      `).run(attempt_id);

      return res.json({
        success: true,
        message: "Temps écoulé, examen expiré",
        status: "expired",
        remaining_seconds: 0,
        expired: true
      });
    }

    res.json({
      success: true,
      message: "Chrono actif",
      status: "in_progress",
      duration_minutes: attempt.duration_minutes,
      elapsed_seconds: elapsedSeconds,
      remaining_seconds: remainingSeconds,
      expired: false
    });

  } catch (error) {
    console.error("Erreur exam-timer :", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la vérification du chrono",
      error: error.message
    });
  }
});
router.post("/student/security-event", (req, res) => {
  try {
    const { attempt_id, event_type, description } = req.body;

    if (!attempt_id || !event_type) {
      return res.status(400).json({
        success: false,
        message: "attempt_id et event_type sont obligatoires"
      });
    }

    const attempt = db.prepare(`
      SELECT 
        id,
        status,
        is_submitted
      FROM exam_attempts
      WHERE id = ?
    `).get(attempt_id);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Tentative introuvable"
      });
    }

    if (attempt.status !== "in_progress") {
      return res.status(409).json({
        success: false,
        message: "La tentative n’est plus active",
        status: attempt.status
      });
    }

    db.prepare(`
      INSERT INTO security_events (
        attempt_id,
        event_type,
        description
      )
      VALUES (?, ?, ?)
    `).run(
      attempt_id,
      event_type,
      description || "Événement de sécurité détecté"
    );

    db.prepare(`
      UPDATE exam_attempts
      SET 
        end_time = CURRENT_TIMESTAMP,
        status = 'stopped',
        validation_status = 'failed',
        cheating_detected = 1,
        cheating_reason = ?,
        is_submitted = 1
      WHERE id = ?
    `).run(
      description || event_type,
      attempt_id
    );

    const updatedAttempt = db.prepare(`
      SELECT * FROM exam_attempts WHERE id = ?
    `).get(attempt_id);

    res.json({
      success: true,
      message: "Événement de sécurité enregistré. Examen arrêté automatiquement.",
      attempt: updatedAttempt
    });

  } catch (error) {
    console.error("Erreur security-event :", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant l’enregistrement de l’événement de sécurité",
      error: error.message
    });
  }
});
export default router;