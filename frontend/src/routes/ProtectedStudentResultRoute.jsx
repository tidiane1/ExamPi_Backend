import { Navigate, Outlet } from "react-router-dom";

function ProtectedStudentResultRoute() {
  const studentResult = localStorage.getItem("student_result");

  if (!studentResult) {
    return <Navigate to="/student/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedStudentResultRoute;