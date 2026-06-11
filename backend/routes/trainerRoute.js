import express from "express";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import db from "../config/db.js";

const router = express.Router();

/**
 * Formater le statut de validation.
 */
function formatValidationStatus(status) {
  switch (status) {
    case "passed":
      return "Réussi";
    case "failed":
      return "Échec";
    case "pending":
      return "En attente";
    default:
      return status || "-";
  }
}

/**
 * Formater le statut de tentative.
 */
function formatAttemptStatus(status) {
  switch (status) {
    case "submitted":
      return "Soumis";
    case "expired":
      return "Temps écoulé";
    case "stopped":
      return "Arrêté";
    case "in_progress":
      return "En cours";
    default:
      return status || "-";
  }
}

/**
 * Retourne le nom/prénom du formateur selon les colonnes disponibles.
 */
function formatTrainerForResponse(trainer) {
  return {
    id: trainer.id,

    first_name:
      trainer.first_name ||
      trainer.firstname ||
      trainer.name ||
      trainer.full_name ||
      "Formateur",

    last_name:
      trainer.last_name ||
      trainer.lastname ||
      "",

    email: trainer.email,
    is_active: trainer.is_active,
    created_at: trainer.created_at,
  };
}

/**
 * Récupérer les résultats pour affichage et export.
 */
function getResultsForExport(examId = "all") {
  let query = `
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
      students.phone,
      students.email,

      exams.title AS exam_title,
      exams.success_percentage,

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
  `;

  const params = [];

  if (examId && examId !== "all") {
    query += `
      WHERE exam_sessions.exam_id = ?
    `;

    params.push(Number(examId));
  }

  query += `
    ORDER BY
      exams.title ASC,
      exam_attempts.id DESC
  `;

  return db.prepare(query).all(...params);
}

/**
 * Libellé de l’examen pour les exports.
 */
function getExamLabel(examId = "all") {
  if (!examId || examId === "all") {
    return "Tous les examens";
  }

  const exam = db
    .prepare(
      `
        SELECT
          exams.title,
          modules.name AS module_name
        FROM exams
        JOIN modules
          ON exams.module_id = modules.id
        WHERE exams.id = ?
      `
    )
    .get(Number(examId));

  if (!exam) {
    return "Examen introuvable";
  }

  return `${exam.title} - ${exam.module_name || ""}`;
}

/**
 * POST /api/trainer/login
 */
router.post("/trainer/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe obligatoires",
      });
    }

    /**
     * SELECT * pour éviter l’erreur :
     * no such column: first_name
     *
     * Certaines bases ont :
     * - name
     * - full_name
     * - email
     * - password_hash
     * sans first_name / last_name
     */
    const trainer = db
      .prepare(
        `
          SELECT *
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

    if (Number(trainer.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Ce compte formateur est désactivé",
      });
    }

    const passwordHash =
      trainer.password_hash ||
      trainer.password;

    if (!passwordHash) {
      return res.status(500).json({
        success: false,
        message: "Aucun mot de passe configuré pour ce formateur",
      });
    }

    let passwordIsValid = false;

    /**
     * Si le mot de passe est hashé avec bcrypt.
     */
    if (
      String(passwordHash).startsWith("$2a$") ||
      String(passwordHash).startsWith("$2b$") ||
      String(passwordHash).startsWith("$2y$")
    ) {
      passwordIsValid = await bcrypt.compare(password, passwordHash);
    } else {
      /**
       * Compatibilité temporaire si l’ancien mot de passe
       * était stocké en clair.
       */
      passwordIsValid = password === passwordHash;
    }

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    return res.json({
      success: true,
      message: "Connexion formateur réussie",
      trainer: formatTrainerForResponse(trainer),
    });
  } catch (error) {
    console.error("POST /trainer/login :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant la connexion formateur",
      error: error.message,
    });
  }
});

/**
 * GET /api/trainer/dashboard
 */
router.get("/trainer/dashboard", (req, res) => {
  try {
    const modulesCount = db
      .prepare("SELECT COUNT(*) AS count FROM modules")
      .get();

    const examsCount = db
      .prepare("SELECT COUNT(*) AS count FROM exams")
      .get();

    const studentsCount = db
      .prepare("SELECT COUNT(*) AS count FROM students")
      .get();

    const attemptsCount = db
      .prepare("SELECT COUNT(*) AS count FROM exam_attempts")
      .get();

    const passedCount = db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM exam_attempts
          WHERE validation_status = 'passed'
        `
      )
      .get();

    const failedCount = db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM exam_attempts
          WHERE validation_status = 'failed'
        `
      )
      .get();

    const cheatingCount = db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM exam_attempts
          WHERE cheating_detected = 1
        `
      )
      .get();

    const recentResults = getResultsForExport("all").slice(0, 10);

    return res.json({
      success: true,
      stats: {
        modules: modulesCount.count,
        exams: examsCount.count,
        students: studentsCount.count,
        attempts: attemptsCount.count,
        passed: passedCount.count,
        failed: failedCount.count,
        cheating: cheatingCount.count,
      },
      recent_results: recentResults,
    });
  } catch (error) {
    console.error("GET /trainer/dashboard :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant le chargement du tableau de bord",
      error: error.message,
    });
  }
});

/**
 * GET /api/trainer/results
 */
router.get("/trainer/results", (req, res) => {
  try {
    const examId = req.query.exam_id || "all";
    const results = getResultsForExport(examId);

    return res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("GET /trainer/results :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant la récupération des résultats",
      error: error.message,
    });
  }
});

/**
 * GET /api/trainer/results/export/excel?exam_id=all
 */
router.get("/trainer/results/export/excel", async (req, res) => {
  try {
    const examId = req.query.exam_id || "all";
    const results = getResultsForExport(examId);
    const examLabel = getExamLabel(examId);

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Exam Server Raspberry Pi";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Résultats");

    worksheet.mergeCells("A1:N1");
    worksheet.getCell("A1").value = "Résultats des examens";
    worksheet.getCell("A1").font = {
      size: 16,
      bold: true,
    };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
    };

    worksheet.mergeCells("A2:N2");
    worksheet.getCell("A2").value = examLabel;
    worksheet.getCell("A2").font = {
      size: 12,
      bold: true,
    };
    worksheet.getCell("A2").alignment = {
      horizontal: "center",
    };

    worksheet.mergeCells("A3:N3");
    worksheet.getCell("A3").value = `Date export : ${new Date().toLocaleString(
      "fr-FR"
    )}`;
    worksheet.getCell("A3").alignment = {
      horizontal: "center",
    };

    worksheet.addRow([]);

    worksheet.columns = [
      { header: "ID tentative", key: "attempt_id", width: 14 },
      { header: "Matricule", key: "matricule", width: 18 },
      { header: "Prénom", key: "first_name", width: 18 },
      { header: "Nom", key: "last_name", width: 18 },
      { header: "Téléphone", key: "phone", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Module", key: "module_name", width: 22 },
      { header: "Examen", key: "exam_title", width: 30 },
      { header: "Score", key: "score", width: 12 },
      { header: "Pourcentage", key: "percentage", width: 15 },
      { header: "Validation", key: "validation_status", width: 16 },
      { header: "Statut tentative", key: "status", width: 18 },
      { header: "Triche", key: "cheating_detected", width: 12 },
      { header: "Raison triche", key: "cheating_reason", width: 35 },
    ];

    const headerRow = worksheet.getRow(5);

    headerRow.values = [
      "ID tentative",
      "Matricule",
      "Prénom",
      "Nom",
      "Téléphone",
      "Email",
      "Module",
      "Examen",
      "Score",
      "Pourcentage",
      "Validation",
      "Statut tentative",
      "Triche",
      "Raison triche",
    ];

    headerRow.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1976D2" },
    };

    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    results.forEach((item) => {
      worksheet.addRow({
        attempt_id: item.attempt_id,
        matricule: item.matricule,
        first_name: item.first_name,
        last_name: item.last_name,
        phone: item.phone || "",
        email: item.email || "",
        module_name: item.module_name || "",
        exam_title: item.exam_title || "",
        score: item.score ?? 0,
        percentage: Number(item.percentage ?? 0),
        validation_status: formatValidationStatus(item.validation_status),
        status: formatAttemptStatus(item.status),
        cheating_detected:
          Number(item.cheating_detected) === 1 ? "Oui" : "Non",
        cheating_reason: item.cheating_reason || "",
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      });

      if (rowNumber >= 6) {
        const validationCell = row.getCell(11);
        const cheatingCell = row.getCell(13);

        if (validationCell.value === "Réussi") {
          validationCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC8E6C9" },
          };
        }

        if (validationCell.value === "Échec") {
          validationCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFCDD2" },
          };
        }

        if (cheatingCell.value === "Oui") {
          cheatingCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFCDD2" },
          };
        }
      }
    });

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 5,
      },
    ];

    const safeName =
      examId === "all"
        ? "resultats_tous_les_examens"
        : `resultats_examen_${examId}`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.xlsx"`
    );

    await workbook.xlsx.write(res);

    return res.end();
  } catch (error) {
    console.error("GET /trainer/results/export/excel :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant l’export Excel",
      error: error.message,
    });
  }
});

/**
 * GET /api/trainer/results/export/pdf?exam_id=all
 */
router.get("/trainer/results/export/pdf", (req, res) => {
  try {
    const examId = req.query.exam_id || "all";
    const results = getResultsForExport(examId);
    const examLabel = getExamLabel(examId);

    const safeName =
      examId === "all"
        ? "resultats_tous_les_examens"
        : `resultats_examen_${examId}`;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.pdf"`
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 35,
      layout: "landscape",
    });

    doc.pipe(res);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Résultats des examens", {
        align: "center",
      });

    doc.moveDown(0.4);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(examLabel, {
        align: "center",
      });

    doc
      .fontSize(9)
      .text(`Date export : ${new Date().toLocaleString("fr-FR")}`, {
        align: "center",
      });

    doc.moveDown(1);

    const total = results.length;

    const passed = results.filter(
      (item) => item.validation_status === "passed"
    ).length;

    const failed = results.filter(
      (item) => item.validation_status === "failed"
    ).length;

    const stopped = results.filter(
      (item) =>
        item.status === "stopped" ||
        Number(item.cheating_detected) === 1
    ).length;

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        `Total : ${total}   |   Réussis : ${passed}   |   Échecs : ${failed}   |   Arrêtés / triche : ${stopped}`
      );

    doc.moveDown(1);

    const startX = 35;
    let y = doc.y;

    const columns = [
      { label: "Matricule", width: 75 },
      { label: "Étudiant", width: 135 },
      { label: "Module", width: 100 },
      { label: "Examen", width: 155 },
      { label: "Score", width: 55 },
      { label: "%", width: 55 },
      { label: "Validation", width: 80 },
      { label: "Statut", width: 80 },
      { label: "Triche", width: 55 },
    ];

    function drawHeader() {
      let x = startX;

      doc.font("Helvetica-Bold").fontSize(8);

      columns.forEach((column) => {
        doc
          .rect(x, y, column.width, 20)
          .fillAndStroke("#1976D2", "#000000");

        doc
          .fillColor("#FFFFFF")
          .text(column.label, x + 3, y + 6, {
            width: column.width - 6,
          });

        x += column.width;
      });

      doc.fillColor("#000000");
      y += 20;
    }

    function drawRow(item) {
      if (y > 540) {
        doc.addPage();
        y = 35;
        drawHeader();
      }

      let x = startX;

      const fullName = `${item.first_name || ""} ${item.last_name || ""}`;

      const row = [
        item.matricule || "-",
        fullName,
        item.module_name || "-",
        item.exam_title || "-",
        String(item.score ?? 0),
        `${Number(item.percentage ?? 0).toFixed(2)}%`,
        formatValidationStatus(item.validation_status),
        formatAttemptStatus(item.status),
        Number(item.cheating_detected) === 1 ? "Oui" : "Non",
      ];

      doc.font("Helvetica").fontSize(8);

      row.forEach((value, index) => {
        const column = columns[index];

        doc
          .rect(x, y, column.width, 24)
          .stroke("#999999");

        doc.text(String(value), x + 3, y + 6, {
          width: column.width - 6,
          height: 16,
        });

        x += column.width;
      });

      y += 24;
    }

    drawHeader();

    if (results.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .text("Aucun résultat disponible.", startX, y + 20);
    } else {
      results.forEach(drawRow);
    }

    return doc.end();
  } catch (error) {
    console.error("GET /trainer/results/export/pdf :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant l’export PDF",
      error: error.message,
    });
  }
});

export default router;