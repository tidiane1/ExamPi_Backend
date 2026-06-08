import express from "express";
import db from "../config/db.js";

const router = express.Router();

/**
 * GET /api/admin/students
 * Liste des étudiants
 */
router.get("/admin/students", (req, res) => {
  try {
    const students = db.prepare(`
      SELECT 
        id,
        matricule,
        first_name,
        last_name,
        secret_code,
        is_active,
        created_at
      FROM students
      ORDER BY id DESC
    `).all();

    res.json({
      success: true,
      count: students.length,
      students
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des étudiants",
      error: error.message
    });
  }
});

/**
 * POST /api/admin/students
 * Créer un étudiant
 */
router.post("/admin/students", (req, res) => {
  try {
    const {
      matricule,
      first_name,
      last_name,
      secret_code,
      is_active
    } = req.body;

    if (!matricule || !first_name || !last_name || !secret_code) {
      return res.status(400).json({
        success: false,
        message: "matricule, prénom, nom et code secret sont obligatoires"
      });
    }

    const existingStudent = db.prepare(`
      SELECT * FROM students WHERE matricule = ?
    `).get(matricule);

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Ce matricule existe déjà"
      });
    }

    const result = db.prepare(`
      INSERT INTO students (
        matricule,
        first_name,
        last_name,
        secret_code,
        is_active
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      matricule,
      first_name,
      last_name,
      secret_code,
      is_active ?? 1
    );

    const student = db.prepare(`
      SELECT 
        id,
        matricule,
        first_name,
        last_name,
        secret_code,
        is_active,
        created_at
      FROM students
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Étudiant créé avec succès",
      student
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la création de l’étudiant",
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/students/:id
 * Modifier un étudiant
 */
router.put("/admin/students/:id", (req, res) => {
  try {
    const { id } = req.params;

    const student = db.prepare(`
      SELECT * FROM students WHERE id = ?
    `).get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Étudiant introuvable"
      });
    }

    const {
      matricule,
      first_name,
      last_name,
      secret_code,
      is_active
    } = req.body;

    if (matricule && matricule !== student.matricule) {
      const existingStudent = db.prepare(`
        SELECT * FROM students WHERE matricule = ?
      `).get(matricule);

      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: "Ce matricule est déjà utilisé"
        });
      }
    }

    db.prepare(`
      UPDATE students
      SET 
        matricule = ?,
        first_name = ?,
        last_name = ?,
        secret_code = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      matricule ?? student.matricule,
      first_name ?? student.first_name,
      last_name ?? student.last_name,
      secret_code ?? student.secret_code,
      is_active ?? student.is_active,
      id
    );

    const updatedStudent = db.prepare(`
      SELECT 
        id,
        matricule,
        first_name,
        last_name,
        secret_code,
        is_active,
        created_at
      FROM students
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: "Étudiant modifié avec succès",
      student: updatedStudent
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la modification de l’étudiant",
      error: error.message
    });
  }
});

/**
 * PATCH /api/admin/students/:id/toggle
 * Activer / désactiver un étudiant
 */
router.patch("/admin/students/:id/toggle", (req, res) => {
  try {
    const { id } = req.params;

    const student = db.prepare(`
      SELECT * FROM students WHERE id = ?
    `).get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Étudiant introuvable"
      });
    }

    const newStatus = student.is_active === 1 ? 0 : 1;

    db.prepare(`
      UPDATE students
      SET is_active = ?
      WHERE id = ?
    `).run(newStatus, id);

    const updatedStudent = db.prepare(`
      SELECT 
        id,
        matricule,
        first_name,
        last_name,
        secret_code,
        is_active,
        created_at
      FROM students
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message:
        newStatus === 1
          ? "Étudiant activé avec succès"
          : "Étudiant désactivé avec succès",
      student: updatedStudent
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant le changement de statut",
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/students/:id
 * Supprimer un étudiant
 */
router.delete("/admin/students/:id", (req, res) => {
  try {
    const { id } = req.params;

    const student = db.prepare(`
      SELECT * FROM students WHERE id = ?
    `).get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Étudiant introuvable"
      });
    }

    const attempts = db.prepare(`
      SELECT * FROM exam_attempts
      WHERE student_id = ?
      LIMIT 1
    `).get(id);

    if (attempts) {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer cet étudiant car il possède déjà des tentatives d’examen"
      });
    }

    db.prepare(`
      DELETE FROM students WHERE id = ?
    `).run(id);

    res.json({
      success: true,
      message: "Étudiant supprimé avec succès"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la suppression de l’étudiant",
      error: error.message
    });
  }
});

export default router;