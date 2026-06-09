import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

function readStudentExamValidation() {
  try {
    const storedExam = localStorage.getItem("student_exam");

    if (!storedExam) {
      return {
        isValid: false,
        shouldRemove: false,
      };
    }

    const examData = JSON.parse(storedExam);

    const isValid =
      Boolean(examData?.attempt?.id) &&
      Array.isArray(examData?.questions);

    return {
      isValid,
      shouldRemove: !isValid,
    };
  } catch (error) {
    console.error(
      "Données student_exam invalides :",
      error
    );

    return {
      isValid: false,
      shouldRemove: true,
    };
  }
}

function ProtectedStudentRoute() {
  const [validation] = useState(readStudentExamValidation);

  useEffect(() => {
    if (validation.shouldRemove) {
      localStorage.removeItem("student_exam");
    }
  }, [validation.shouldRemove]);

  if (!validation.isValid) {
    return (
      <Navigate
        to="/student/login"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedStudentRoute;