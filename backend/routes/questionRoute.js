import express from "express";
import db from "../config/db.js";

const router = express.Router();

/**
 * GET /api/questions
 * Afficher toutes les questions
 */
router.get("/questions", (req, res) => {
  try {
    const questions = db.prepare(`
      SELECT 
        questions.id,
        questions.exam_id,
        questions.question_text,
        questions.question_type,
        questions.points,
        questions.is_active,
        questions.created_at,
        exams.title AS exam_title
      FROM questions
      JOIN exams ON questions.exam_id = exams.id
      ORDER BY questions.id DESC
    `).all();

    res.json({
      success: true,
      count: questions.length,
      questions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des questions",
      error: error.message
    });
  }
});

/**
 * GET /api/questions/exam/:exam_id
 * Afficher les questions d’un examen
 */
router.get("/questions/exam/:exam_id", (req, res) => {
  try {
    const { exam_id } = req.params;

    const exam = db.prepare(`
      SELECT * FROM exams WHERE id = ?
    `).get(exam_id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Examen introuvable"
      });
    }

    const questions = db.prepare(`
      SELECT 
        id,
        exam_id,
        question_text,
        question_type,
        points,
        is_active,
        created_at
      FROM questions
      WHERE exam_id = ?
      ORDER BY id ASC
    `).all(exam_id);

    res.json({
      success: true,
      exam,
      count: questions.length,
      questions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des questions de l’examen",
      error: error.message
    });
  }
});

/**
 * GET /api/questions/:id
 * Afficher une question précise avec ses réponses
 */
router.get("/questions/:id", (req, res) => {
  try {
    const { id } = req.params;

    const question = db.prepare(`
      SELECT 
        questions.id,
        questions.exam_id,
        questions.question_text,
        questions.question_type,
        questions.points,
        questions.is_active,
        questions.created_at,
        exams.title AS exam_title
      FROM questions
      JOIN exams ON questions.exam_id = exams.id
      WHERE questions.id = ?
    `).get(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question introuvable"
      });
    }

    const answers = db.prepare(`
      SELECT 
        id,
        question_id,
        answer_text,
        is_correct
      FROM answers
      WHERE question_id = ?
      ORDER BY id ASC
    `).all(id);

    res.json({
      success: true,
      question,
      answers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération de la question",
      error: error.message
    });
  }
});

/**
 * POST /api/questions
 * Créer une question
 */
router.post("/questions", (req, res) => {
  try {
    const {
      exam_id,
      question_text,
      question_type,
      points,
      is_active
    } = req.body;

    if (!exam_id || !question_text) {
      return res.status(400).json({
        success: false,
        message: "exam_id et question_text sont obligatoires"
      });
    }

    const exam = db.prepare(`
      SELECT * FROM exams WHERE id = ?
    `).get(exam_id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Examen introuvable"
      });
    }

    const result = db.prepare(`
      INSERT INTO questions (
        exam_id,
        question_text,
        question_type,
        points,
        is_active
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      exam_id,
      question_text,
      question_type || "single_choice",
      points || 1,
      is_active ?? 1
    );

    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Question créée avec succès",
      question
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la création de la question",
      error: error.message
    });
  }
});

/**
 * PUT /api/questions/:id
 * Modifier une question
 */
router.put("/questions/:id", (req, res) => {
  try {
    const { id } = req.params;

    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `).get(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question introuvable"
      });
    }

    const {
      exam_id,
      question_text,
      question_type,
      points,
      is_active
    } = req.body;

    if (exam_id) {
      const exam = db.prepare(`
        SELECT * FROM exams WHERE id = ?
      `).get(exam_id);

      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Nouvel examen introuvable"
        });
      }
    }

    db.prepare(`
      UPDATE questions
      SET 
        exam_id = ?,
        question_text = ?,
        question_type = ?,
        points = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      exam_id ?? question.exam_id,
      question_text ?? question.question_text,
      question_type ?? question.question_type,
      points ?? question.points,
      is_active ?? question.is_active,
      id
    );

    const updatedQuestion = db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: "Question modifiée avec succès",
      question: updatedQuestion
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la modification de la question",
      error: error.message
    });
  }
});

/**
 * DELETE /api/questions/:id
 * Supprimer une question
 */
router.delete("/questions/:id", (req, res) => {
  try {
    const { id } = req.params;

    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `).get(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question introuvable"
      });
    }

    const usedInAttempt = db.prepare(`
      SELECT * FROM attempt_questions
      WHERE question_id = ?
      LIMIT 1
    `).get(id);

    if (usedInAttempt) {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer cette question car elle est déjà utilisée dans une tentative d’examen"
      });
    }

    db.prepare(`
      DELETE FROM answers WHERE question_id = ?
    `).run(id);

    db.prepare(`
      DELETE FROM questions WHERE id = ?
    `).run(id);

    res.json({
      success: true,
      message: "Question supprimée avec succès"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la suppression de la question",
      error: error.message
    });
  }
});

export default router;