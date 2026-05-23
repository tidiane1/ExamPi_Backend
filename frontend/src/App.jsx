import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import TrainerLogin from "./pages/TrainerLogin";
import TrainerDashboard from "./pages/TrainerDashboard";
import ModulesPage from "./pages/ModulesPage";
import ExamsPage from "./pages/ExamsPage";
import QuestionsPage from "./pages/QuestionsPage";
import ResultsPage from "./pages/ResultsPage";
import StudentsPage from "./pages/StudentsPage";
import TrainerLayout from "./layouts/TrainerLayout";
import TrainersPage from "./pages/TrainersPage";
import StudentLogin from "./pages/StudentLogin";
import StudentExam from "./pages/StudentExam";
import StudentResult from "./pages/StudentResult";
import ProtectedTrainerRoute from "./routes/ProtectedTrainerRoute";
import ProtectedStudentRoute from "./routes/ProtectedStudentRoute";
import ProtectedStudentResultRoute from "./routes/ProtectedStudentResultRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/trainer/login" />} />

        <Route path="/trainer/login" element={<TrainerLogin />} />

        <Route element={<ProtectedTrainerRoute />}>
          <Route path="/trainer" element={<TrainerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<TrainerDashboard />} />
    <Route path="modules" element={<ModulesPage />} />
    <Route path="exams" element={<ExamsPage />} />
    <Route path="students" element={<StudentsPage />} />
    <Route path="questions" element={<QuestionsPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="trainers" element={<TrainersPage />} />
  </Route>
</Route>

        <Route path="/student/login" element={<StudentLogin />} />

<Route element={<ProtectedStudentRoute />}>
  <Route path="/student/exam" element={<StudentExam />} />
</Route>

<Route element={<ProtectedStudentResultRoute />}>
  <Route path="/student/result" element={<StudentResult />} />
</Route>
      </Routes>
    </BrowserRouter>    
  );
}

export default App;