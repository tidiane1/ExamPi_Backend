import express from "express";
import db from "../config/db.js";

const router = express.Router();

/**
 * GET /api/admin/trainers
 * Liste des formateurs
 */
router.get("/admin/trainers", (req, res) => {
  try {
    const trainers = db.prepare(`
      SELECT 
        id,
        full_name,
        email,
        password_hash,
        role,
        created_at
      FROM trainers
      ORDER BY id DESC
    `).all();

    res.json({
      success: true,
      count: trainers.length,
      trainers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des formateurs",
      error: error.message
    });
  }
});

/**
 * POST /api/admin/trainers
 * Créer un formateur
 */
router.post("/admin/trainers", (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      role
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email et password sont obligatoires"
      });
    }

    const existingTrainer = db.prepare(`
      SELECT * FROM trainers WHERE email = ?
    `).get(email);

    if (existingTrainer) {
      return res.status(409).json({
        success: false,
        message: "Cet email est déjà utilisé"
      });
    }

    const result = db.prepare(`
      INSERT INTO trainers (
        full_name,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?)
    `).run(
      full_name,
      email,
      password,
      role || "trainer"
    );

    const trainer = db.prepare(`
      SELECT 
        id,
        full_name,
        email,
        password_hash,
        role,
        created_at
      FROM trainers
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Formateur créé avec succès",
      trainer
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la création du formateur",
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/trainers/:id
 * Modifier un formateur
 */
router.put("/admin/trainers/:id", (req, res) => {
  try {
    const { id } = req.params;

    const trainer = db.prepare(`
      SELECT * FROM trainers WHERE id = ?
    `).get(id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Formateur introuvable"
      });
    }

    const {
      full_name,
      email,
      password,
      role
    } = req.body;

    if (email && email !== trainer.email) {
      const existingTrainer = db.prepare(`
        SELECT * FROM trainers WHERE email = ?
      `).get(email);

      if (existingTrainer) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé"
        });
      }
    }

    db.prepare(`
      UPDATE trainers
      SET 
        full_name = ?,
        email = ?,
        password_hash = ?,
        role = ?
      WHERE id = ?
    `).run(
      full_name ?? trainer.full_name,
      email ?? trainer.email,
      password ?? trainer.password_hash,
      role ?? trainer.role,
      id
    );

    const updatedTrainer = db.prepare(`
      SELECT 
        id,
        full_name,
        email,
        password_hash,
        role,
        created_at
      FROM trainers
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: "Formateur modifié avec succès",
      trainer: updatedTrainer
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la modification du formateur",
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/trainers/:id
 * Supprimer un formateur
 */
router.delete("/admin/trainers/:id", (req, res) => {
  try {
    const { id } = req.params;

    const trainer = db.prepare(`
      SELECT * FROM trainers WHERE id = ?
    `).get(id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Formateur introuvable"
      });
    }

    const exams = db.prepare(`
      SELECT * FROM exams
      WHERE trainer_id = ?
      LIMIT 1
    `).get(id);

    if (exams) {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer ce formateur car il possède déjà des examens"
      });
    }

    const sessions = db.prepare(`
      SELECT * FROM exam_sessions
      WHERE started_by = ?
      LIMIT 1
    `).get(id);

    if (sessions) {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer ce formateur car il a déjà démarré des sessions"
      });
    }

    db.prepare(`
      DELETE FROM trainers WHERE id = ?
    `).run(id);

    res.json({
      success: true,
      message: "Formateur supprimé avec succès"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la suppression du formateur",
      error: error.message
    });
  }
});

export default router;