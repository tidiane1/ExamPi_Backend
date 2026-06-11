import express from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";

import db from "../config/db.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

/**
 * Génère un code secret à 4 chiffres.
 */
function generateSecretCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Génère un code secret unique.
 */
function generateUniqueSecretCode() {
  let secretCode = generateSecretCode();

  let exists = db
    .prepare("SELECT id FROM students WHERE secret_code = ?")
    .get(secretCode);

  while (exists) {
    secretCode = generateSecretCode();

    exists = db
      .prepare("SELECT id FROM students WHERE secret_code = ?")
      .get(secretCode);
  }

  return secretCode;
}

/**
 * Génère un matricule unique.
 * Exemple : ETU20260001
 */
function generateUniqueMatricule() {
  const year = new Date().getFullYear();
  const prefix = `ETU${year}`;

  const lastStudent = db
    .prepare(
      `
        SELECT matricule
        FROM students
        WHERE matricule LIKE ?
        ORDER BY id DESC
        LIMIT 1
      `
    )
    .get(`${prefix}%`);

  let nextNumber = 1;

  if (lastStudent?.matricule) {
    const lastNumber = Number(
      String(lastStudent.matricule).replace(prefix, "")
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  let matricule = `${prefix}${String(nextNumber).padStart(4, "0")}`;

  let exists = db
    .prepare("SELECT id FROM students WHERE matricule = ?")
    .get(matricule);

  while (exists) {
    nextNumber += 1;

    matricule = `${prefix}${String(nextNumber).padStart(4, "0")}`;

    exists = db
      .prepare("SELECT id FROM students WHERE matricule = ?")
      .get(matricule);
  }

  return matricule;
}

/**
 * Nettoie les chaînes reçues.
 */
function cleanString(value) {
  return String(value || "").trim();
}

/**
 * Normalise les clés CSV.
 */
function normalizeCsvRow(row) {
  return {
    last_name: cleanString(
      row.nom ||
        row.Nom ||
        row.last_name ||
        row.lastname ||
        row["Nom complet"] ||
        ""
    ),
    first_name: cleanString(
      row.prenom ||
        row.prénom ||
        row.Prenom ||
        row.Prénom ||
        row.first_name ||
        row.firstname ||
        ""
    ),
    phone: cleanString(
      row.telephone ||
        row.téléphone ||
        row.Telephone ||
        row.Téléphone ||
        row.phone ||
        row.tel ||
        ""
    ),
    email: cleanString(
      row.email ||
        row.Email ||
        row.mail ||
        row.Mail ||
        row["e-mail"] ||
        row["E-mail"] ||
        ""
    ),
  };
}

/**
 * GET /api/admin/students
 * Liste des étudiants.
 */
router.get("/admin/students", (req, res) => {
  try {
    const students = db
      .prepare(
        `
          SELECT
            id,
            matricule,
            first_name,
            last_name,
            phone,
            email,
            secret_code,
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
    console.error("GET /admin/students :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant la récupération des étudiants",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/students
 * Ajout manuel d’un étudiant.
 * Le matricule et le code secret sont générés automatiquement
 * si le frontend ne les envoie pas.
 */
router.post("/admin/students", (req, res) => {
  try {
    const firstName = cleanString(req.body.first_name || req.body.prenom);
    const lastName = cleanString(req.body.last_name || req.body.nom);
    const phone = cleanString(req.body.phone || req.body.telephone);
    const email = cleanString(req.body.email);

    const matricule =
      cleanString(req.body.matricule) || generateUniqueMatricule();

    const secretCode =
      cleanString(req.body.secret_code) || generateUniqueSecretCode();

    const isActive =
      req.body.is_active === undefined ? 1 : Number(req.body.is_active);

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Le prénom et le nom sont obligatoires",
      });
    }

    const existingMatricule = db
      .prepare("SELECT id FROM students WHERE matricule = ?")
      .get(matricule);

    if (existingMatricule) {
      return res.status(409).json({
        success: false,
        message: "Ce matricule existe déjà",
      });
    }

    if (email) {
      const existingEmail = db
        .prepare("SELECT id FROM students WHERE email = ?")
        .get(email);

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé",
        });
      }
    }

    const result = db
      .prepare(
        `
          INSERT INTO students (
            matricule,
            first_name,
            last_name,
            phone,
            email,
            secret_code,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        matricule,
        firstName,
        lastName,
        phone,
        email,
        secretCode,
        isActive === 1 ? 1 : 0
      );

    const student = db
      .prepare(
        `
          SELECT
            id,
            matricule,
            first_name,
            last_name,
            phone,
            email,
            secret_code,
            is_active,
            created_at
          FROM students
          WHERE id = ?
        `
      )
      .get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: "Étudiant ajouté avec succès",
      student,
    });
  } catch (error) {
    console.error("POST /admin/students :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant la création de l’étudiant",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/students/import-csv
 *
 * Fichier CSV attendu :
 * nom,prenom,telephone,email
 * Ba,Ibrahima,771234567,ibrahima.ba@email.com
 */
router.post(
  "/admin/students/import-csv",
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Aucun fichier CSV envoyé",
        });
      }

      const csvContent = req.file.buffer
        .toString("utf-8")
        .replace(/^\uFEFF/, "");

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (!records || records.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Le fichier CSV est vide",
        });
      }

      const createdStudents = [];
      const skippedStudents = [];

      const importTransaction = db.transaction(() => {
        const insertStudent = db.prepare(
          `
            INSERT INTO students (
              matricule,
              first_name,
              last_name,
              phone,
              email,
              secret_code,
              is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `
        );

        records.forEach((row, index) => {
          const lineNumber = index + 2;
          const normalizedRow = normalizeCsvRow(row);

          const { first_name, last_name, phone, email } = normalizedRow;

          if (!first_name || !last_name) {
            skippedStudents.push({
              line: lineNumber,
              row,
              reason: "Nom ou prénom manquant",
            });

            return;
          }

          if (email) {
            const existingEmail = db
              .prepare("SELECT id FROM students WHERE email = ?")
              .get(email);

            if (existingEmail) {
              skippedStudents.push({
                line: lineNumber,
                row,
                reason: "Email déjà utilisé",
              });

              return;
            }
          }

          const matricule = generateUniqueMatricule();
          const secretCode = generateUniqueSecretCode();

          const result = insertStudent.run(
            matricule,
            first_name,
            last_name,
            phone,
            email,
            secretCode
          );

          createdStudents.push({
            id: result.lastInsertRowid,
            matricule,
            first_name,
            last_name,
            phone,
            email,
            secret_code: secretCode,
            is_active: 1,
          });
        });
      });

      importTransaction();

      return res.status(201).json({
        success: true,
        message: `${createdStudents.length} étudiant(s) importé(s) avec succès`,
        created_count: createdStudents.length,
        skipped_count: skippedStudents.length,
        students: createdStudents,
        skipped: skippedStudents,
      });
    } catch (error) {
      console.error("POST /admin/students/import-csv :", error);

      return res.status(500).json({
        success: false,
        message: "Erreur pendant l’importation du fichier CSV",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/admin/students/:id
 * Modification d’un étudiant.
 */
router.put("/admin/students/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Identifiant étudiant invalide",
      });
    }

    const existingStudent = db
      .prepare("SELECT * FROM students WHERE id = ?")
      .get(id);

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Étudiant introuvable",
      });
    }

    const matricule = cleanString(req.body.matricule);
    const firstName = cleanString(req.body.first_name || req.body.prenom);
    const lastName = cleanString(req.body.last_name || req.body.nom);
    const phone = cleanString(req.body.phone || req.body.telephone);
    const email = cleanString(req.body.email);
    const secretCode = cleanString(req.body.secret_code);
    const isActive =
      req.body.is_active === undefined
        ? Number(existingStudent.is_active)
        : Number(req.body.is_active);

    if (!matricule || !firstName || !lastName || !secretCode) {
      return res.status(400).json({
        success: false,
        message: "Matricule, prénom, nom et code secret sont obligatoires",
      });
    }

    const duplicateMatricule = db
      .prepare("SELECT id FROM students WHERE matricule = ? AND id != ?")
      .get(matricule, id);

    if (duplicateMatricule) {
      return res.status(409).json({
        success: false,
        message: "Ce matricule est déjà utilisé",
      });
    }

    if (email) {
      const duplicateEmail = db
        .prepare("SELECT id FROM students WHERE email = ? AND id != ?")
        .get(email, id);

      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé",
        });
      }
    }

    db.prepare(
      `
        UPDATE students
        SET
          matricule = ?,
          first_name = ?,
          last_name = ?,
          phone = ?,
          email = ?,
          secret_code = ?,
          is_active = ?
        WHERE id = ?
      `
    ).run(
      matricule,
      firstName,
      lastName,
      phone,
      email,
      secretCode,
      isActive === 1 ? 1 : 0,
      id
    );

    const updatedStudent = db
      .prepare(
        `
          SELECT
            id,
            matricule,
            first_name,
            last_name,
            phone,
            email,
            secret_code,
            is_active,
            created_at
          FROM students
          WHERE id = ?
        `
      )
      .get(id);

    return res.json({
      success: true,
      message: "Étudiant modifié avec succès",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("PUT /admin/students/:id :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant la modification de l’étudiant",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/admin/students/:id/toggle
 * Activer / désactiver un étudiant.
 */
router.patch("/admin/students/:id/toggle", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Identifiant étudiant invalide",
      });
    }

    const student = db
      .prepare("SELECT id, is_active FROM students WHERE id = ?")
      .get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Étudiant introuvable",
      });
    }

    const newStatus = Number(student.is_active) === 1 ? 0 : 1;

    db.prepare("UPDATE students SET is_active = ? WHERE id = ?").run(
      newStatus,
      id
    );

    return res.json({
      success: true,
      message:
        newStatus === 1
          ? "Étudiant activé avec succès"
          : "Étudiant désactivé avec succès",
      is_active: newStatus,
    });
  } catch (error) {
    console.error("PATCH /admin/students/:id/toggle :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant le changement de statut",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/students/:id
 * Suppression d’un étudiant.
 */
router.delete("/admin/students/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Identifiant étudiant invalide",
      });
    }

    const student = db
      .prepare("SELECT id FROM students WHERE id = ?")
      .get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Étudiant introuvable",
      });
    }

    const deleteTransaction = db.transaction(() => {
      const attempts = db
        .prepare(
          `
            SELECT id
            FROM exam_attempts
            WHERE student_id = ?
          `
        )
        .all(id);

      attempts.forEach((attempt) => {
        db.prepare("DELETE FROM student_answers WHERE attempt_id = ?").run(
          attempt.id
        );

        db.prepare("DELETE FROM security_events WHERE attempt_id = ?").run(
          attempt.id
        );

        db.prepare("DELETE FROM attempt_questions WHERE attempt_id = ?").run(
          attempt.id
        );
      });

      db.prepare("DELETE FROM exam_attempts WHERE student_id = ?").run(id);

      db.prepare("DELETE FROM students WHERE id = ?").run(id);
    });

    deleteTransaction();

    return res.json({
      success: true,
      message: "Étudiant supprimé avec succès",
    });
  } catch (error) {
    console.error("DELETE /admin/students/:id :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant la suppression de l’étudiant",
      error: error.message,
    });
  }
});

export default router;