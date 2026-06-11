import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

import api from "../api/api";

function StudentsPage() {
  const [students, setStudents] = useState([]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [editForm, setEditForm] = useState({
    matricule: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    secret_code: "",
    is_active: 1,
  });

  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const loadStudents = async () => {
    try {
      const response = await api.get("/admin/students");

      setStudents(response.data.students || []);
    } catch (err) {
      setError("Erreur pendant le chargement des étudiants");
      console.error(err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchStudents = async () => {
      try {
        const response = await api.get("/admin/students");

        if (isMounted) {
          setStudents(response.data.students || []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Erreur pendant le chargement des étudiants");
        }

        console.error(err);
      }
    };

    fetchStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFormChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    resetMessages();

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Le prénom et le nom sont obligatoires");
      return;
    }

    try {
      const response = await api.post("/admin/students", {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email,
      });

      setMessage(
        response.data.message ||
          "Étudiant ajouté avec succès. Matricule et code secret générés automatiquement."
      );

      setForm({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
      });

      await loadStudents();
      setPage(0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant l’ajout de l’étudiant"
      );
    }
  };

  const handleImportCsv = async () => {
    resetMessages();

    if (!csvFile) {
      setError("Veuillez sélectionner un fichier CSV");
      return;
    }

    try {
      setImporting(true);

      const formData = new FormData();
      formData.append("file", csvFile);

      const response = await api.post(
        "/admin/students/import-csv",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage(
        `${response.data.message}. Ignorés : ${
          response.data.skipped_count || 0
        }`
      );

      setCsvFile(null);

      await loadStudents();
      setPage(0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant l’importation du fichier CSV"
      );
    } finally {
      setImporting(false);
    }
  };

  const startEdit = (student) => {
    resetMessages();

    setEditingId(student.id);

    setEditForm({
      matricule: student.matricule || "",
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      phone: student.phone || "",
      email: student.email || "",
      secret_code: student.secret_code || "",
      is_active: Number(student.is_active) === 1 ? 1 : 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);

    setEditForm({
      matricule: "",
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      secret_code: "",
      is_active: 1,
    });
  };

  const handleEditChange = (event) => {
    setEditForm({
      ...editForm,
      [event.target.name]: event.target.value,
    });
  };

  const handleUpdate = async (id) => {
    resetMessages();

    if (
      !editForm.matricule.trim() ||
      !editForm.first_name.trim() ||
      !editForm.last_name.trim() ||
      !editForm.secret_code.trim()
    ) {
      setError("Matricule, prénom, nom et code secret sont obligatoires");
      return;
    }

    try {
      const response = await api.put(`/admin/students/${id}`, {
        matricule: editForm.matricule,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
        secret_code: editForm.secret_code,
        is_active: Number(editForm.is_active),
      });

      setMessage(response.data.message || "Étudiant modifié avec succès");

      cancelEdit();
      await loadStudents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la modification de l’étudiant"
      );
    }
  };

  const handleToggleStatus = async (id) => {
    resetMessages();

    try {
      const response = await api.patch(`/admin/students/${id}/toggle`);

      setMessage(response.data.message || "Statut modifié avec succès");

      await loadStudents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant le changement de statut"
      );
    }
  };

  const handleDelete = async (id) => {
    resetMessages();

    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cet étudiant ? Cette action supprimera aussi ses tentatives et résultats."
    );

    if (!confirmed) return;

    try {
      const response = await api.delete(`/admin/students/${id}`);

      setMessage(response.data.message || "Étudiant supprimé avec succès");

      await loadStudents();

      const remainingItems = students.length - 1;
      const maxPage = Math.max(
        0,
        Math.ceil(remainingItems / rowsPerPage) - 1
      );

      if (page > maxPage) {
        setPage(maxPage);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la suppression de l’étudiant"
      );
    }
  };

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return students;
    }

    return students.filter((student) => {
      return (
        String(student.matricule || "")
          .toLowerCase()
          .includes(keyword) ||
        String(student.first_name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(student.last_name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(student.phone || "")
          .toLowerCase()
          .includes(keyword) ||
        String(student.email || "")
          .toLowerCase()
          .includes(keyword) ||
        String(student.secret_code || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [students, search]);

  const paginatedStudents = filteredStudents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Gestion des étudiants
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ajouter manuellement des étudiants, importer un fichier CSV, générer
        automatiquement les matricules et codes secrets, puis gérer les accès.
      </Typography>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          maxWidth: 1000,
          mx: "auto",
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Ajouter un étudiant
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Le matricule et le code secret seront générés automatiquement.
        </Typography>

        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                name="last_name"
                label="Nom"
                fullWidth
                value={form.last_name}
                onChange={handleFormChange}
              />

              <TextField
                name="first_name"
                label="Prénom"
                fullWidth
                value={form.first_name}
                onChange={handleFormChange}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                name="phone"
                label="Téléphone"
                fullWidth
                value={form.phone}
                onChange={handleFormChange}
              />

              <TextField
                name="email"
                label="Email"
                type="email"
                fullWidth
                value={form.email}
                onChange={handleFormChange}
              />
            </Stack>

            <Button type="submit" variant="contained" size="large">
              Ajouter l’étudiant
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          maxWidth: 1000,
          mx: "auto",
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Importer des étudiants par CSV
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Le fichier CSV doit contenir les colonnes : nom, prenom, telephone,
          email.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Button variant="outlined" component="label">
            Choisir un fichier CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                setCsvFile(event.target.files?.[0] || null);
              }}
            />
          </Button>

          <Typography sx={{ flex: 1 }}>
            {csvFile ? csvFile.name : "Aucun fichier sélectionné"}
          </Typography>

          <Button
            variant="contained"
            disabled={!csvFile || importing}
            onClick={handleImportCsv}
          >
            {importing ? "Importation..." : "Importer"}
          </Button>
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: 3,
          width: "100%",
          maxWidth: "100%",
          borderRadius: 3,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Liste des étudiants
            </Typography>

            <Typography color="text.secondary">
              {filteredStudents.length} étudiant(s) trouvé(s)
            </Typography>
          </Box>

          <TextField
            label="Rechercher"
            placeholder="Matricule, nom, prénom, téléphone, email..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ minWidth: { xs: "100%", md: 420 } }}
          />
        </Stack>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 1250 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Matricule</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Prénom</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Code secret</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Date création</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedStudents.map((student) => {
                const isEditing = editingId === student.id;

                return (
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField
                          name="matricule"
                          size="small"
                          value={editForm.matricule}
                          onChange={handleEditChange}
                          sx={{ minWidth: 140 }}
                        />
                      ) : (
                        student.matricule
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField
                          name="last_name"
                          size="small"
                          value={editForm.last_name}
                          onChange={handleEditChange}
                          sx={{ minWidth: 140 }}
                        />
                      ) : (
                        student.last_name
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField
                          name="first_name"
                          size="small"
                          value={editForm.first_name}
                          onChange={handleEditChange}
                          sx={{ minWidth: 140 }}
                        />
                      ) : (
                        student.first_name
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField
                          name="phone"
                          size="small"
                          value={editForm.phone}
                          onChange={handleEditChange}
                          sx={{ minWidth: 140 }}
                        />
                      ) : (
                        student.phone || "-"
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField
                          name="email"
                          type="email"
                          size="small"
                          value={editForm.email}
                          onChange={handleEditChange}
                          sx={{ minWidth: 220 }}
                        />
                      ) : (
                        student.email || "-"
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <TextField
                          name="secret_code"
                          size="small"
                          value={editForm.secret_code}
                          onChange={handleEditChange}
                          sx={{ minWidth: 120 }}
                        />
                      ) : (
                        student.secret_code
                      )}
                    </TableCell>

                    <TableCell>
                      {isEditing ? (
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                          <InputLabel>Statut</InputLabel>

                          <Select
                            name="is_active"
                            label="Statut"
                            value={editForm.is_active}
                            onChange={handleEditChange}
                          >
                            <MenuItem value={1}>Actif</MenuItem>
                            <MenuItem value={0}>Inactif</MenuItem>
                          </Select>
                        </FormControl>
                      ) : Number(student.is_active) === 1 ? (
                        <Chip label="Actif" color="success" size="small" />
                      ) : (
                        <Chip label="Inactif" color="error" size="small" />
                      )}
                    </TableCell>

                    <TableCell>{student.created_at || "-"}</TableCell>

                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        {isEditing ? (
                          <>
                            <IconButton
                              color="success"
                              onClick={() => handleUpdate(student.id)}
                            >
                              <SaveIcon />
                            </IconButton>

                            <IconButton color="warning" onClick={cancelEdit}>
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              color={
                                Number(student.is_active) === 1
                                  ? "warning"
                                  : "success"
                              }
                              onClick={() => handleToggleStatus(student.id)}
                            >
                              {Number(student.is_active) === 1
                                ? "Désactiver"
                                : "Activer"}
                            </Button>

                            <IconButton
                              color="primary"
                              onClick={() => startEdit(student)}
                            >
                              <EditIcon />
                            </IconButton>

                            <IconButton
                              color="error"
                              onClick={() => handleDelete(student.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}

              {paginatedStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Aucun étudiant trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={filteredStudents.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </Paper>
    </Box>
  );
}

export default StudentsPage;