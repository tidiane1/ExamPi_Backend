import express from "express";
import bcrypt from "bcrypt";
import db from "../config/db.js";

const router = express.Router();

/**
 * GET /api/trainers
 * Liste simple des formateurs sans mot de passe
 */
router.get("/trainers", (req, res) => {
  try {
    const trainers = db
      .prepare(
        `
        SELECT 
          id,
          full_name,
          email,
          role,
          created_at
        FROM trainers
        ORDER BY id DESC
      `
      )
      .all();

    res.json({
      success: true,
      count: trainers.length,
      trainers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des formateurs",
      error: error.message,
    });
  }
});

/**
 * POST /api/trainer/login
 * Connexion formateur avec bcrypt
 */
router.post("/trainer/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe obligatoires",
      });
    }

    const trainer = db
      .prepare(
        `
        SELECT 
          id,
          full_name,
          email,
          password_hash,
          role,
          created_at
        FROM trainers
        WHERE email = ?
      `
      )
      .get(email);

    if (!trainer) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      trainer.password_hash
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    res.json({
      success: true,
      message: "Connexion formateur réussie",
      trainer: {
        id: trainer.id,
        full_name: trainer.full_name,
        email: trainer.email,
        role: trainer.role,
        created_at: trainer.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la connexion formateur",
      error: error.message,
    });
  }
});

/**
 * GET /api/trainer/results
 * Tous les résultats des tentatives
 *
 * Important :
 * exam_attempts ne contient pas directement exam_id.
 * La relation correcte est :
 * exam_attempts.session_id -> exam_sessions.id -> exam_sessions.exam_id
 */
router.get("/trainer/results", (req, res) => {
  try {
    const results = db
      .prepare(
        `
        SELECT
          exam_attempts.id AS attempt_id,
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

          students.matricule,
          students.first_name,
          students.last_name,

          exams.title AS exam_title,
          modules.name AS module_name

        FROM exam_attempts
        JOIN students 
          ON exam_attempts.student_id = students.id
        JOIN exam_sessions 
          ON exam_attempts.session_id = exam_sessions.id
        JOIN exams 
          ON exam_sessions.exam_id = exams.id
        JOIN modules 
          ON exams.module_id = modules.id
        ORDER BY exam_attempts.id DESC
      `
      )
      .all();

    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des résultats",
      error: error.message,
    });
  }
});

/**
 * GET /api/trainer/results/exam/:exam_id
 * Résultats d’un examen précis
 */
router.get("/trainer/results/exam/:exam_id", (req, res) => {
  try {
    const { exam_id } = req.params;

    const exam = db
      .prepare(
        `
        SELECT 
          exams.id,
          exams.title,
          exams.duration_minutes,
          exams.number_of_questions,
          exams.success_percentage,
          modules.name AS module_name
        FROM exams
        JOIN modules ON exams.module_id = modules.id
        WHERE exams.id = ?
      `
      )
      .get(exam_id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Examen introuvable",
      });
    }

    const results = db
      .prepare(
        `
        SELECT
          exam_attempts.id AS attempt_id,
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

          students.matricule,
          students.first_name,
          students.last_name,

          exams.title AS exam_title,
          modules.name AS module_name

        FROM exam_attempts
        JOIN students 
          ON exam_attempts.student_id = students.id
        JOIN exam_sessions 
          ON exam_attempts.session_id = exam_sessions.id
        JOIN exams 
          ON exam_sessions.exam_id = exams.id
        JOIN modules 
          ON exams.module_id = modules.id
        WHERE exam_sessions.exam_id = ?
        ORDER BY exam_attempts.id DESC
      `
      )
      .all(exam_id);

    res.json({
      success: true,
      exam,
      count: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des résultats de l’examen",
      error: error.message,
    });
  }
});

/**
 * GET /api/trainer/results/attempt/:attempt_id
 * Détail d’une tentative
 */
router.get("/trainer/results/attempt/:attempt_id", (req, res) => {
  try {
    const { attempt_id } = req.params;

    const attempt = db
      .prepare(
        `
        SELECT
          exam_attempts.id AS attempt_id,
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

          students.matricule,
          students.first_name,
          students.last_name,

          exams.title AS exam_title,
          modules.name AS module_name

        FROM exam_attempts
        JOIN students 
          ON exam_attempts.student_id = students.id
        JOIN exam_sessions 
          ON exam_attempts.session_id = exam_sessions.id
        JOIN exams 
          ON exam_sessions.exam_id = exams.id
        JOIN modules 
          ON exams.module_id = modules.id
        WHERE exam_attempts.id = ?
      `
      )
      .get(attempt_id);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Tentative introuvable",
      });
    }

    const answers = db
      .prepare(
        `
        SELECT
          student_answers.id,
          student_answers.attempt_id,
          student_answers.question_id,
          student_answers.answer_id,
          student_answers.is_correct AS student_is_correct,

          questions.question_text,
          answers.answer_text

        FROM student_answers
        JOIN questions 
          ON student_answers.question_id = questions.id
        JOIN answers 
          ON student_answers.answer_id = answers.id
        WHERE student_answers.attempt_id = ?
        ORDER BY student_answers.id ASC
      `
      )
      .all(attempt_id);

    const security_events = db
      .prepare(
        `
        SELECT
          id,
          attempt_id,
          event_type,
          description,
          created_at
        FROM security_events
        WHERE attempt_id = ?
        ORDER BY id DESC
      `
      )
      .all(attempt_id);

    res.json({
      success: true,
      attempt,
      answers,
      security_events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération du détail de la tentative",
      error: error.message,
    });
  }
});

export default router;