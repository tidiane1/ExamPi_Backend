import { Navigate, Outlet } from "react-router-dom";

function ProtectedStudentRoute() {
  const studentExam = localStorage.getItem("student_exam");

  if (!studentExam) {
    return <Navigate to="/student/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedStudentRoute;