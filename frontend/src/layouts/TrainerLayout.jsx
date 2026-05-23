import { Outlet, Link, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Box,
  Button,
} from "@mui/material";

const drawerWidth = 240;

function TrainerLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("trainer");
    navigate("/trainer/login");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f7fb" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1201,
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Serveur d’examen — Espace formateur
          </Typography>

          <Button color="inherit" onClick={logout}>
            Déconnexion
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            pt: 8,
            borderRight: "1px solid #e0e0e0",
          },
        }}
      >
        <List sx={{ px: 1 }}>
          <ListItemButton component={Link} to="/trainer/dashboard">
            <ListItemText primary="Dashboard" />
          </ListItemButton>
          <ListItemButton component={Link} to="/trainer/modules">
            <ListItemText primary="Modules" />
          </ListItemButton>

          <ListItemButton component={Link} to="/trainer/exams">
            <ListItemText primary="Examens" />
          </ListItemButton>
          <ListItemButton component={Link} to="/trainer/students">
            <ListItemText primary="Étudiants" />
          </ListItemButton>
          <ListItemButton component={Link} to="/trainer/questions">
            <ListItemText primary="Questions" />
          </ListItemButton>
          <ListItemButton component={Link} to="/trainer/results">
            <ListItemText primary="Résultats" />
          </ListItemButton>
          <ListItemButton component={Link} to="/trainer/students">
            <ListItemText primary="Étudiants" />
          </ListItemButton>
          <ListItemButton component={Link} to="/trainer/trainers">
            <ListItemText primary="Formateurs" />
          </ListItemButton>
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${drawerWidth}px)`,
          padding: 3,
          marginTop: "64px",
          backgroundColor: "#f5f7fb",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default TrainerLayout;