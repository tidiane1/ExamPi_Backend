import { useEffect, useState } from "react";
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

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";

import api from "../api/api";

function StudentsPage() {
  const [students, setStudents] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [form, setForm] = useState({
    matricule: "",
    first_name: "",
    last_name: "",
    secret_code: "",
    is_active: 1,
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const loadStudents = async () => {
    try {
      const response = await api.get("/admin/students");
      setStudents(response.data.students || []);
    } catch (err) {
      setError("Erreur pendant le rechargement des étudiants");
      console.error(err);
    }
  };

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const handleFormChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();

    if (
      !form.matricule.trim() ||
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.secret_code.trim()
    ) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    try {
      await api.post("/admin/students", {
        ...form,
        is_active: Number(form.is_active),
      });

      setMessage("Étudiant ajouté avec succès");

      setForm({
        matricule: "",
        first_name: "",
        last_name: "",
        secret_code: "",
        is_active: 1,
      });

      await loadStudents();
      setPage(0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la création de l’étudiant"
      );
    }
  };

  const startEdit = (student) => {
    resetMessages();

    setEditingId(student.id);
    setEditForm({
      matricule: student.matricule,
      first_name: student.first_name,
      last_name: student.last_name,
      secret_code: student.secret_code,
      is_active: student.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async (id) => {
    resetMessages();

    if (
      !editForm.matricule?.trim() ||
      !editForm.first_name?.trim() ||
      !editForm.last_name?.trim() ||
      !editForm.secret_code?.trim()
    ) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    try {
      await api.put(`/admin/students/${id}`, {
        ...editForm,
        is_active: Number(editForm.is_active),
      });

      setMessage("Étudiant modifié avec succès");
      cancelEdit();
      await loadStudents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la modification de l’étudiant"
      );
    }
  };

  const handleToggle = async (id) => {
    resetMessages();

    try {
      await api.patch(`/admin/students/${id}/toggle`);
      setMessage("Statut modifié avec succès");
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

    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer cet étudiant ?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/students/${id}`);

      setMessage("Étudiant supprimé avec succès");
      await loadStudents();

      const remainingItems = students.length - 1;
      const maxPage = Math.max(0, Math.ceil(remainingItems / rowsPerPage) - 1);

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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedStudents = students.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Gestion des étudiants autorisés
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ajouter, modifier, bloquer ou autoriser les étudiants qui peuvent passer
        les examens.
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
          mb: 4,
          width: "100%",
          maxWidth: 900,
          borderRadius: 3,
          mx: "auto",
          boxSizing: "border-box",
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Ajouter un étudiant
        </Typography>

        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={2}>
            <TextField
              name="matricule"
              label="Matricule"
              fullWidth
              value={form.matricule}
              onChange={handleFormChange}
            />

            <TextField
              name="first_name"
              label="Prénom"
              fullWidth
              value={form.first_name}
              onChange={handleFormChange}
            />

            <TextField
              name="last_name"
              label="Nom"
              fullWidth
              value={form.last_name}
              onChange={handleFormChange}
            />

            <TextField
              name="secret_code"
              label="Code secret"
              fullWidth
              value={form.secret_code}
              onChange={handleFormChange}
            />

            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                name="is_active"
                label="Statut"
                value={form.is_active}
                onChange={handleFormChange}
              >
                <MenuItem value={1}>Autorisé</MenuItem>
                <MenuItem value={0}>Bloqué</MenuItem>
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" size="large">
              Ajouter l’étudiant
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 3,
          width: "100%",
          maxWidth: "100%",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Liste des étudiants
        </Typography>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Matricule</TableCell>
                <TableCell>Prénom</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Code secret</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Date création</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.id}</TableCell>

                  <TableCell>
                    {editingId === student.id ? (
                      <TextField
                        name="matricule"
                        size="small"
                        value={editForm.matricule || ""}
                        onChange={handleEditChange}
                      />
                    ) : (
                      student.matricule
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === student.id ? (
                      <TextField
                        name="first_name"
                        size="small"
                        value={editForm.first_name || ""}
                        onChange={handleEditChange}
                      />
                    ) : (
                      student.first_name
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === student.id ? (
                      <TextField
                        name="last_name"
                        size="small"
                        value={editForm.last_name || ""}
                        onChange={handleEditChange}
                      />
                    ) : (
                      student.last_name
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === student.id ? (
                      <TextField
                        name="secret_code"
                        size="small"
                        value={editForm.secret_code || ""}
                        onChange={handleEditChange}
                      />
                    ) : (
                      student.secret_code
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === student.id ? (
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <Select
                          name="is_active"
                          value={editForm.is_active ?? 1}
                          onChange={handleEditChange}
                        >
                          <MenuItem value={1}>Autorisé</MenuItem>
                          <MenuItem value={0}>Bloqué</MenuItem>
                        </Select>
                      </FormControl>
                    ) : student.is_active === 1 ? (
                      <Chip label="Autorisé" color="success" size="small" />
                    ) : (
                      <Chip label="Bloqué" color="error" size="small" />
                    )}
                  </TableCell>

                  <TableCell>{student.created_at}</TableCell>

                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                      }}
                    >
                      {editingId === student.id ? (
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
                          <IconButton
                            color="primary"
                            onClick={() => startEdit(student)}
                          >
                            <EditIcon />
                          </IconButton>

                          <IconButton
                            color={
                              student.is_active === 1 ? "warning" : "success"
                            }
                            onClick={() => handleToggle(student.id)}
                          >
                            <PowerSettingsNewIcon />
                          </IconButton>

                          <IconButton
                            color="error"
                            onClick={() => handleDelete(student.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Aucun étudiant trouvé
                  </TableCell>
                </TableRow>
              )}

              {students.length > 0 && paginatedStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Aucun étudiant sur cette page
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={students.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
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