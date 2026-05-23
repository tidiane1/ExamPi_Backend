import express from "express";
import db from "../config/db.js";

const router = express.Router();

/**
 * GET /api/answers
 * Afficher toutes les réponses
 */
router.get("/answers", (req, res) => {
  try {
    const answers = db.prepare(`
      SELECT 
        answers.id,
        answers.question_id,
        answers.answer_text,
        answers.is_correct,
        questions.question_text
      FROM answers
      JOIN questions ON answers.question_id = questions.id
      ORDER BY answers.id DESC
    `).all();

    res.json({
      success: true,
      count: answers.length,
      answers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des réponses",
      error: error.message
    });
  }
});

/**
 * GET /api/answers/question/:question_id
 * Afficher les réponses d’une question
 */
router.get("/answers/question/:question_id", (req, res) => {
  try {
    const { question_id } = req.params;

    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `).get(question_id);

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
    `).all(question_id);

    res.json({
      success: true,
      question,
      count: answers.length,
      answers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des réponses de la question",
      error: error.message
    });
  }
});

/**
 * GET /api/answers/:id
 * Afficher une réponse précise
 */
router.get("/answers/:id", (req, res) => {
  try {
    const { id } = req.params;

    const answer = db.prepare(`
      SELECT 
        answers.id,
        answers.question_id,
        answers.answer_text,
        answers.is_correct,
        questions.question_text
      FROM answers
      JOIN questions ON answers.question_id = questions.id
      WHERE answers.id = ?
    `).get(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Réponse introuvable"
      });
    }

    res.json({
      success: true,
      answer
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération de la réponse",
      error: error.message
    });
  }
});

/**
 * POST /api/answers
 * Créer une réponse
 */
router.post("/answers", (req, res) => {
  try {
    const {
      question_id,
      answer_text,
      is_correct
    } = req.body;

    if (!question_id || !answer_text) {
      return res.status(400).json({
        success: false,
        message: "question_id et answer_text sont obligatoires"
      });
    }

    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `).get(question_id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question introuvable"
      });
    }

    const result = db.prepare(`
      INSERT INTO answers (
        question_id,
        answer_text,
        is_correct
      )
      VALUES (?, ?, ?)
    `).run(
      question_id,
      answer_text,
      is_correct ?? 0
    );

    const answer = db.prepare(`
      SELECT * FROM answers WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Réponse créée avec succès",
      answer
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la création de la réponse",
      error: error.message
    });
  }
});

/**
 * PUT /api/answers/:id
 * Modifier une réponse
 */
router.put("/answers/:id", (req, res) => {
  try {
    const { id } = req.params;

    const answer = db.prepare(`
      SELECT * FROM answers WHERE id = ?
    `).get(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Réponse introuvable"
      });
    }

    const {
      question_id,
      answer_text,
      is_correct
    } = req.body;

    if (question_id) {
      const question = db.prepare(`
        SELECT * FROM questions WHERE id = ?
      `).get(question_id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Nouvelle question introuvable"
        });
      }
    }

    db.prepare(`
      UPDATE answers
      SET 
        question_id = ?,
        answer_text = ?,
        is_correct = ?
      WHERE id = ?
    `).run(
      question_id ?? answer.question_id,
      answer_text ?? answer.answer_text,
      is_correct ?? answer.is_correct,
      id
    );

    const updatedAnswer = db.prepare(`
      SELECT * FROM answers WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: "Réponse modifiée avec succès",
      answer: updatedAnswer
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la modification de la réponse",
      error: error.message
    });
  }
});

/**
 * DELETE /api/answers/:id
 * Supprimer une réponse
 */
router.delete("/answers/:id", (req, res) => {
  try {
    const { id } = req.params;

    const answer = db.prepare(`
      SELECT * FROM answers WHERE id = ?
    `).get(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Réponse introuvable"
      });
    }

    const usedByStudent = db.prepare(`
      SELECT * FROM student_answers
      WHERE answer_id = ?
      LIMIT 1
    `).get(id);

    if (usedByStudent) {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer cette réponse car elle est déjà utilisée dans une soumission d’étudiant"
      });
    }

    db.prepare(`
      DELETE FROM answers WHERE id = ?
    `).run(id);

    res.json({
      success: true,
      message: "Réponse supprimée avec succès"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la suppression de la réponse",
      error: error.message
    });
  }
});

export default router;