import { useEffect, useState } from "react";import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Alert,
  Stack,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

import api from "../api/api";

function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

const loadModules = async () => {
  try {
    const response = await api.get("/modules");
    setModules(response.data.modules || []);
  } catch (err) {
    setError("Erreur pendant le chargement des modules");
    console.error(err);
  }
};

useEffect(() => {
  let isMounted = true;

  const fetchModules = async () => {
    try {
      const response = await api.get("/modules");

      if (isMounted) {
        setModules(response.data.modules || []);
      }
    } catch (err) {
      if (isMounted) {
        setError("Erreur pendant le chargement des modules");
      }
      console.error(err);
    }
  };

  fetchModules();

  return () => {
    isMounted = false;
  };
}, []);

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!name.trim()) {
      setError("Le nom du module est obligatoire");
      return;
    }

    try {
      await api.post("/modules", {
        name,
        description,
      });

      setName("");
      setDescription("");
      setMessage("Module créé avec succès");
      loadModules();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur pendant la création");
    }
  };

  const startEdit = (module) => {
    resetMessages();
    setEditingId(module.id);
    setEditName(module.name);
    setEditDescription(module.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const handleUpdate = async (id) => {
    resetMessages();

    if (!editName.trim()) {
      setError("Le nom du module est obligatoire");
      return;
    }

    try {
      await api.put(`/modules/${id}`, {
        name: editName,
        description: editDescription,
      });

      setMessage("Module modifié avec succès");
      cancelEdit();
      loadModules();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur pendant la modification");
    }
  };

  const handleDelete = async (id) => {
    resetMessages();

    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer ce module ?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/modules/${id}`);
      setMessage("Module supprimé avec succès");
      loadModules();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur pendant la suppression");
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Gestion des modules
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

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Ajouter un module
        </Typography>

        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={2}>
            <TextField
              label="Nom du module"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Button type="submit" variant="contained">
              Ajouter le module
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Liste des modules
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Date création</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell>{module.id}</TableCell>

                <TableCell>
                  {editingId === module.id ? (
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    module.name
                  )}
                </TableCell>

                <TableCell>
                  {editingId === module.id ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  ) : (
                    module.description || "-"
                  )}
                </TableCell>

                <TableCell>{module.created_at}</TableCell>

                <TableCell align="right">
                  {editingId === module.id ? (
                    <>
                      <IconButton
                        color="success"
                        onClick={() => handleUpdate(module.id)}
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
                        onClick={() => startEdit(module)}
                      >
                        <EditIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        onClick={() => handleDelete(module.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {modules.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Aucun module trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

export default ModulesPage;