import { Navigate, Outlet } from "react-router-dom";

function ProtectedTrainerRoute() {
  const trainer = localStorage.getItem("trainer");

  if (!trainer) {
    return <Navigate to="/trainer/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedTrainerRoute;