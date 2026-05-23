import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Liste des formateurs
router.get("/trainers", (req, res) => {
  const trainers = db.prepare(`
    SELECT id, full_name, email, role, created_at 
    FROM trainers
  `).all();

  res.json(trainers);
});

router.post("/trainer/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email et mot de passe obligatoires"
    });
  }

  const trainer = db.prepare(`
    SELECT 
      id,
      full_name,
      email,
      role,
      created_at
    FROM trainers
    WHERE email = ? AND password_hash = ?
  `).get(email, password);

  if (!trainer) {
    return res.status(401).json({
      success: false,
      message: "Email ou mot de passe incorrect"
    });
  }

  res.json({
    success: true,
    message: "Connexion formateur réussie",
    trainer
  });
});

router.get("/trainer/results", (req, res) => {
  try {
    const results = db.prepare(`
      SELECT 
        exam_attempts.id AS attempt_id,
        students.matricule,
        students.first_name,
        students.last_name,
        modules.name AS module_name,
        exams.title AS exam_title,
        exam_attempts.start_time,
        exam_attempts.end_time,
        exam_attempts.score,
        exam_attempts.percentage,
        exam_attempts.status,
        exam_attempts.validation_status,
        exam_attempts.cheating_detected,
        exam_attempts.cheating_reason
      FROM exam_attempts
      JOIN students ON exam_attempts.student_id = students.id
      JOIN exam_sessions ON exam_attempts.session_id = exam_sessions.id
      JOIN exams ON exam_sessions.exam_id = exams.id
      JOIN modules ON exams.module_id = modules.id
      ORDER BY exam_attempts.id DESC
    `).all();

    res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    console.error("Erreur récupération résultats :", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des résultats",
      error: error.message
    });
  }
});


router.get("/trainer/results/exam/:exam_id", (req, res) => {
  try {
    const { exam_id } = req.params;

    const results = db.prepare(`
      SELECT 
        exam_attempts.id AS attempt_id,
        students.matricule,
        students.first_name,
        students.last_name,
        exams.title AS exam_title,
        exam_attempts.start_time,
        exam_attempts.end_time,
        exam_attempts.score,
        exam_attempts.percentage,
        exam_attempts.status,
        exam_attempts.validation_status,
        exam_attempts.cheating_detected,
        exam_attempts.cheating_reason
      FROM exam_attempts
      JOIN students ON exam_attempts.student_id = students.id
      JOIN exam_sessions ON exam_attempts.session_id = exam_sessions.id
      JOIN exams ON exam_sessions.exam_id = exams.id
      WHERE exams.id = ?
      ORDER BY exam_attempts.id DESC
    `).all(exam_id);

    res.json({
      success: true,
      exam_id,
      count: results.length,
      results
    });

  } catch (error) {
    console.error("Erreur résultats examen :", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des résultats de l’examen",
      error: error.message
    });
  }
});

router.get("/trainer/results/attempt/:attempt_id", (req, res) => {
  try {
    const { attempt_id } = req.params;

    const attempt = db.prepare(`
      SELECT 
        exam_attempts.id AS attempt_id,
        students.matricule,
        students.first_name,
        students.last_name,
        exams.title AS exam_title,
        exam_attempts.start_time,
        exam_attempts.end_time,
        exam_attempts.score,
        exam_attempts.percentage,
        exam_attempts.status,
        exam_attempts.validation_status,
        exam_attempts.cheating_detected,
        exam_attempts.cheating_reason
      FROM exam_attempts
      JOIN students ON exam_attempts.student_id = students.id
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

    const answers = db.prepare(`
      SELECT 
        questions.id AS question_id,
        questions.question_text,
        answers.id AS answer_id,
        answers.answer_text,
        answers.is_correct AS correct_answer,
        student_answers.is_correct AS student_is_correct
      FROM student_answers
      JOIN questions ON student_answers.question_id = questions.id
      JOIN answers ON student_answers.answer_id = answers.id
      WHERE student_answers.attempt_id = ?
      ORDER BY questions.id ASC
    `).all(attempt_id);

    const securityEvents = db.prepare(`
      SELECT 
        event_type,
        description,
        created_at
      FROM security_events
      WHERE attempt_id = ?
      ORDER BY created_at ASC
    `).all(attempt_id);

    res.json({
      success: true,
      attempt,
      answers,
      security_events: securityEvents
    });

  } catch (error) {
    console.error("Erreur détail tentative :", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération du détail de la tentative",
      error: error.message
    });
  }
});


export default router;