import express from "express";
import db from "../config/db.js";

const router = express.Router();

// Liste des modules
router.get("/modules", (req, res) => {
  try {
    const modules = db.prepare(`
      SELECT * FROM modules
      ORDER BY id DESC
    `).all();

    res.json({
      success: true,
      count: modules.length,
      modules
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération des modules",
      error: error.message
    });
  }
});

// Détail d’un module
router.get("/modules/:id", (req, res) => {
  try {
    const { id } = req.params;

    const module = db.prepare(`
      SELECT * FROM modules WHERE id = ?
    `).get(id);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module introuvable"
      });
    }

    res.json({
      success: true,
      module
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la récupération du module",
      error: error.message
    });
  }
});

// Créer un module
router.post("/modules", (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Le nom du module est obligatoire"
      });
    }

    const result = db.prepare(`
      INSERT INTO modules (name, description)
      VALUES (?, ?)
    `).run(name, description || null);

    const module = db.prepare(`
      SELECT * FROM modules WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Module créé avec succès",
      module
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la création du module",
      error: error.message
    });
  }
});

// Modifier un module
router.put("/modules/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const module = db.prepare(`
      SELECT * FROM modules WHERE id = ?
    `).get(id);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module introuvable"
      });
    }

    db.prepare(`
      UPDATE modules
      SET name = ?, description = ?
      WHERE id = ?
    `).run(
      name || module.name,
      description || module.description,
      id
    );

    const updatedModule = db.prepare(`
      SELECT * FROM modules WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: "Module modifié avec succès",
      module: updatedModule
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la modification du module",
      error: error.message
    });
  }
});

// Supprimer un module
router.delete("/modules/:id", (req, res) => {
  try {
    const { id } = req.params;

    const module = db.prepare(`
      SELECT * FROM modules WHERE id = ?
    `).get(id);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module introuvable"
      });
    }

    const exams = db.prepare(`
      SELECT * FROM exams WHERE module_id = ?
    `).all(id);

    if (exams.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer ce module car il contient déjà des examens"
      });
    }

    db.prepare(`
      DELETE FROM modules WHERE id = ?
    `).run(id);

    res.json({
      success: true,
      message: "Module supprimé avec succès"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur pendant la suppression du module",
      error: error.message
    });
  }
});

export default router;