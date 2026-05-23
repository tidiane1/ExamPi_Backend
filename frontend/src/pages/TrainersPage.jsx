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

import api from "../api/api";

function TrainersPage() {
  const [trainers, setTrainers] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "trainer",
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTrainers = async () => {
      try {
        const response = await api.get("/admin/trainers");

        if (isMounted) {
          setTrainers(response.data.trainers || []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Erreur pendant le chargement des formateurs");
        }

        console.error(err);
      }
    };

    fetchTrainers();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadTrainers = async () => {
    try {
      const response = await api.get("/admin/trainers");
      setTrainers(response.data.trainers || []);
    } catch (err) {
      setError("Erreur pendant le rechargement des formateurs");
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

    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Nom complet, email et mot de passe sont obligatoires");
      return;
    }

    try {
      await api.post("/admin/trainers", form);

      setMessage("Formateur ajouté avec succès");

      setForm({
        full_name: "",
        email: "",
        password: "",
        role: "trainer",
      });

      await loadTrainers();
      setPage(0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la création du formateur"
      );
    }
  };

  const startEdit = (trainer) => {
    resetMessages();

    setEditingId(trainer.id);
    setEditForm({
      full_name: trainer.full_name,
      email: trainer.email,
      password: trainer.password_hash || "",
      role: trainer.role,
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
      !editForm.full_name?.trim() ||
      !editForm.email?.trim() ||
      !editForm.password?.trim()
    ) {
      setError("Nom complet, email et mot de passe sont obligatoires");
      return;
    }

    try {
      await api.put(`/admin/trainers/${id}`, editForm);

      setMessage("Formateur modifié avec succès");
      cancelEdit();
      await loadTrainers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la modification du formateur"
      );
    }
  };

  const handleDelete = async (id) => {
    resetMessages();

    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer ce formateur ?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/trainers/${id}`);

      setMessage("Formateur supprimé avec succès");
      await loadTrainers();

      const remainingItems = trainers.length - 1;
      const maxPage = Math.max(0, Math.ceil(remainingItems / rowsPerPage) - 1);

      if (page > maxPage) {
        setPage(maxPage);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Erreur pendant la suppression du formateur"
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

  const paginatedTrainers = trainers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
        Gestion des formateurs
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ajouter, modifier ou supprimer les comptes formateurs autorisés à gérer
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
          Ajouter un formateur
        </Typography>

        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={2}>
            <TextField
              name="full_name"
              label="Nom complet"
              fullWidth
              value={form.full_name}
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

            <TextField
              name="password"
              label="Mot de passe"
              type="password"
              fullWidth
              value={form.password}
              onChange={handleFormChange}
            />

            <FormControl fullWidth>
              <InputLabel>Rôle</InputLabel>
              <Select
                name="role"
                label="Rôle"
                value={form.role}
                onChange={handleFormChange}
              >
                <MenuItem value="trainer">Formateur</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" size="large">
              Ajouter le formateur
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
          boxSizing: "border-box",
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Liste des formateurs
        </Typography>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nom complet</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Mot de passe</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Date création</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedTrainers.map((trainer) => (
                <TableRow key={trainer.id}>
                  <TableCell>{trainer.id}</TableCell>

                  <TableCell>
                    {editingId === trainer.id ? (
                      <TextField
                        name="full_name"
                        size="small"
                        value={editForm.full_name || ""}
                        onChange={handleEditChange}
                      />
                    ) : (
                      trainer.full_name
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === trainer.id ? (
                      <TextField
                        name="email"
                        type="email"
                        size="small"
                        value={editForm.email || ""}
                        onChange={handleEditChange}
                      />
                    ) : (
                      trainer.email
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === trainer.id ? (
                      <TextField
                        name="password"
                        type="password"
                        size="small"
                        value={editForm.password || ""}
                        onChange={handleEditChange}
                      />
                    ) : (
                      "••••••"
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === trainer.id ? (
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          name="role"
                          value={editForm.role || "trainer"}
                          onChange={handleEditChange}
                        >
                          <MenuItem value="trainer">Formateur</MenuItem>
                          <MenuItem value="admin">Administrateur</MenuItem>
                        </Select>
                      </FormControl>
                    ) : trainer.role === "admin" ? (
                      <Chip
                        label="Administrateur"
                        color="primary"
                        size="small"
                      />
                    ) : (
                      <Chip label="Formateur" color="success" size="small" />
                    )}
                  </TableCell>

                  <TableCell>{trainer.created_at}</TableCell>

                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                      }}
                    >
                      {editingId === trainer.id ? (
                        <>
                          <IconButton
                            color="success"
                            onClick={() => handleUpdate(trainer.id)}
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
                            onClick={() => startEdit(trainer)}
                          >
                            <EditIcon />
                          </IconButton>

                          <IconButton
                            color="error"
                            onClick={() => handleDelete(trainer.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {trainers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Aucun formateur trouvé
                  </TableCell>
                </TableRow>
              )}

              {trainers.length > 0 && paginatedTrainers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Aucun formateur sur cette page
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={trainers.length}
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

export default TrainersPage;