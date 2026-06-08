import express from "express";
import db from "../config/db.js";

const router = express.Router();


router.post("/exam-session/start", (req, res) => {
  const { exam_id, trainer_id } = req.body;

  if (!exam_id || !trainer_id) {
    return res.status(400).json({
      success: false,
      message: "exam_id et trainer_id sont obligatoires"
    });
  }

  const exam = db.prepare(`
    SELECT * FROM exams 
    WHERE id = ? AND is_published = 1
  `).get(exam_id);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Examen introuvable ou non publié"
    });
  }

  const existingOpenSession = db.prepare(`
    SELECT * FROM exam_sessions
    WHERE exam_id = ? AND status = 'open'
  `).get(exam_id);

  if (existingOpenSession) {
    return res.status(409).json({
      success: false,
      message: "Une session est déjà ouverte pour cet examen",
      session: existingOpenSession
    });
  }

  const result = db.prepare(`
    INSERT INTO exam_sessions (
      exam_id,
      started_by,
      status,
      start_time
    )
    VALUES (?, ?, 'open', CURRENT_TIMESTAMP)
  `).run(exam_id, trainer_id);

  const session = db.prepare(`
    SELECT * FROM exam_sessions WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: "Session d’examen démarrée avec succès",
    session
  });
});

router.post("/exam-session/close", (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({
      success: false,
      message: "session_id est obligatoire"
    });
  }

  const session = db.prepare(`
    SELECT * FROM exam_sessions
    WHERE id = ? AND status = 'open'
  `).get(session_id);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Aucune session ouverte trouvée"
    });
  }

  db.prepare(`
    UPDATE exam_sessions
    SET status = 'closed',
        end_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(session_id);

  const closedSession = db.prepare(`
    SELECT * FROM exam_sessions WHERE id = ?
  `).get(session_id);

  res.json({
    success: true,
    message: "Session d’examen fermée avec succès",
    session: closedSession
  });
});




/**
 * GET /api/exams
 * Liste des examens
 */
router.get("/exams", (req, res) => {
  try {
    const exams = db.prepare(`
      SELECT 
        exams.id,
        exams.module_id,
        exams.trainer_id,
        exams.title,
        exams.description,
        exams.duration_minutes,
        exams.number_of_questions,
        exams.success_percentage,
        exams.random_questions,
        exams.random_answers,
        exams.is_published,
        exams.created_at,
        modules.name AS module_name,
        trainers.full_name AS trainer_name
      FROM exams
      JOIN modules ON exams.module_id = modules.id
      JOIN trainers ON exams.trainer_id = trainers.id
      ORDER BY exams.id DESC
    `).all();

    res.json({
      success: true,
      count: exams.length,
      exams
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des examens",
      error: error.message
    });
  }
});

/**
 * GET /api/exams/:id
 * Détail d’un examen
 */
router.get("/exams/:id", (req, res) => {
  try {
    const { id } = req.params;

    const exam = db.prepare(`
      SELECT 
        exams.*,
        modules.name AS module_name,
        trainers.full_name AS trainer_name
      FROM exams
      JOIN modules ON exams.module_id = modules.id
      JOIN trainers ON exams.trainer_id = trainers.id
      WHERE exams.id = ?
    `).get(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Examen introuvable"
      });
    }

    res.json({
      success: true,
      exam
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération de l’examen",
      error: error.message
    });
  }
});

/**
 * POST /api/exams
 * Créer un examen
 */
router.post("/exams", (req, res) => {
  try {
    const {
      module_id,
      trainer_id,
      title,
      description,
      duration_minutes,
      number_of_questions,
      success_percentage,
      random_questions,
      random_answers,
      is_published
    } = req.body;

    if (!module_id || !trainer_id || !title || !duration_minutes || !number_of_questions) {
      return res.status(400).json({
        success: false,
        message: "module_id, trainer_id, title, duration_minutes et number_of_questions sont obligatoires"
      });
    }

    const module = db.prepare(`
      SELECT * FROM modules WHERE id = ?
    `).get(module_id);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module introuvable"
      });
    }

    const trainer = db.prepare(`
      SELECT * FROM trainers WHERE id = ?
    `).get(trainer_id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Formateur introuvable"
      });
    }

    const result = db.prepare(`
      INSERT INTO exams (
        module_id,
        trainer_id,
        title,
        description,
        duration_minutes,
        number_of_questions,
        success_percentage,
        random_questions,
        random_answers,
        is_published
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      module_id,
      trainer_id,
      title,
      description || null,
      duration_minutes,
      number_of_questions,
      success_percentage || 50,
      random_questions ?? 1,
      random_answers ?? 1,
      is_published ?? 0
    );

    const exam = db.prepare(`
      SELECT * FROM exams WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Examen créé avec succès",
      exam
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la création de l’examen",
      error: error.message
    });
  }
});

/**
 * PUT /api/exams/:id
 * Modifier un examen
 */
router.put("/exams/:id", (req, res) => {
  try {
    const { id } = req.params;

    const exam = db.prepare(`
      SELECT * FROM exams WHERE id = ?
    `).get(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Examen introuvable"
      });
    }

    const {
      module_id,
      trainer_id,
      title,
      description,
      duration_minutes,
      number_of_questions,
      success_percentage,
      random_questions,
      random_answers,
      is_published
    } = req.body;

    db.prepare(`
      UPDATE exams
      SET 
        module_id = ?,
        trainer_id = ?,
        title = ?,
        description = ?,
        duration_minutes = ?,
        number_of_questions = ?,
        success_percentage = ?,
        random_questions = ?,
        random_answers = ?,
        is_published = ?
      WHERE id = ?
    `).run(
      module_id ?? exam.module_id,
      trainer_id ?? exam.trainer_id,
      title ?? exam.title,
      description ?? exam.description,
      duration_minutes ?? exam.duration_minutes,
      number_of_questions ?? exam.number_of_questions,
      success_percentage ?? exam.success_percentage,
      random_questions ?? exam.random_questions,
      random_answers ?? exam.random_answers,
      is_published ?? exam.is_published,
      id
    );

    const updatedExam = db.prepare(`
      SELECT * FROM exams WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: "Examen modifié avec succès",
      exam: updatedExam
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la modification de l’examen",
      error: error.message
    });
  }
});

/**
 * DELETE /api/exams/:id
 * Supprimer un examen et toutes ses données associées
 */
router.delete("/exams/:id", (req, res) => {
  const { id } = req.params;

  try {
    const exam = db.prepare(`
      SELECT * FROM exams WHERE id = ?
    `).get(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Examen introuvable"
      });
    }

    const deleteExamTransaction = db.transaction((examId) => {

      // 1. Supprimer les événements de sécurité
      db.prepare(`
        DELETE FROM security_events
        WHERE attempt_id IN (
          SELECT ea.id
          FROM exam_attempts ea
          INNER JOIN exam_sessions es
            ON ea.session_id = es.id
          WHERE es.exam_id = ?
        )
      `).run(examId);

      // 2. Supprimer les réponses données par les étudiants
      db.prepare(`
        DELETE FROM student_answers
        WHERE attempt_id IN (
          SELECT ea.id
          FROM exam_attempts ea
          INNER JOIN exam_sessions es
            ON ea.session_id = es.id
          WHERE es.exam_id = ?
        )
      `).run(examId);

      // 3. Supprimer les questions affectées aux tentatives
      db.prepare(`
        DELETE FROM attempt_questions
        WHERE attempt_id IN (
          SELECT ea.id
          FROM exam_attempts ea
          INNER JOIN exam_sessions es
            ON ea.session_id = es.id
          WHERE es.exam_id = ?
        )
      `).run(examId);

      // 4. Supprimer les tentatives
      db.prepare(`
        DELETE FROM exam_attempts
        WHERE session_id IN (
          SELECT id
          FROM exam_sessions
          WHERE exam_id = ?
        )
      `).run(examId);

      // 5. Supprimer les sessions
      db.prepare(`
        DELETE FROM exam_sessions
        WHERE exam_id = ?
      `).run(examId);

      // 6. Supprimer les réponses possibles des questions
      db.prepare(`
        DELETE FROM answers
        WHERE question_id IN (
          SELECT id
          FROM questions
          WHERE exam_id = ?
        )
      `).run(examId);

      // 7. Supprimer les questions
      db.prepare(`
        DELETE FROM questions
        WHERE exam_id = ?
      `).run(examId);

      // 8. Supprimer l'examen
      const result = db.prepare(`
        DELETE FROM exams
        WHERE id = ?
      `).run(examId);

      return result;
    });

    const result = deleteExamTransaction(id);

    res.json({
      success: true,
      message: "Examen et données associées supprimés avec succès",
      deletedExamId: Number(id),
      changes: result.changes
    });

  } catch (error) {
    console.error("Erreur suppression examen :", error);

    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la suppression de l’examen",
      error: error.message
    });
  }
});

export default router;