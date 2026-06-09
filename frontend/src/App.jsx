import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

/* Pages étudiant */
import StudentLogin from "./pages/StudentLogin";
import StudentExam from "./pages/StudentExam";
import StudentResult from "./pages/StudentResult";

/* Pages formateur */
import TrainerLogin from "./pages/TrainerLogin";
import TrainerDashboard from "./pages/TrainerDashboard";
import ModulesPage from "./pages/ModulesPage";
import ExamsPage from "./pages/ExamsPage";
import QuestionsPage from "./pages/QuestionsPage";
import ResultsPage from "./pages/ResultsPage";
import StudentsPage from "./pages/StudentsPage";
import TrainersPage from "./pages/TrainersPage";

/* Layout */
import TrainerLayout from "./layouts/TrainerLayout";

/* Routes protégées */
import ProtectedTrainerRoute from "./routes/ProtectedTrainerRoute";
import ProtectedStudentRoute from "./routes/ProtectedStudentRoute";
import ProtectedStudentResultRoute from "./routes/ProtectedStudentResultRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route par défaut */}
        <Route
          path="/"
          element={
            <Navigate
              to="/student/login"
              replace
            />
          }
        />

        {/* Routes publiques étudiant */}
        <Route
          path="/student/login"
          element={<StudentLogin />}
        />

        {/* Route protégée examen étudiant */}
        <Route element={<ProtectedStudentRoute />}>
          <Route
            path="/student/exam"
            element={<StudentExam />}
          />
        </Route>

        {/* Route protégée résultat étudiant */}
        <Route
          element={<ProtectedStudentResultRoute />}
        >
          <Route
            path="/student/result"
            element={<StudentResult />}
          />
        </Route>

        {/* Route publique formateur */}
        <Route
          path="/trainer/login"
          element={<TrainerLogin />}
        />

        {/* Routes protégées formateur */}
        <Route element={<ProtectedTrainerRoute />}>
          <Route
            path="/trainer"
            element={<TrainerLayout />}
          >
            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />

            <Route
              path="dashboard"
              element={<TrainerDashboard />}
            />

            <Route
              path="modules"
              element={<ModulesPage />}
            />

            <Route
              path="exams"
              element={<ExamsPage />}
            />

            <Route
              path="students"
              element={<StudentsPage />}
            />

            <Route
              path="trainers"
              element={<TrainersPage />}
            />

            <Route
              path="questions"
              element={<QuestionsPage />}
            />

            <Route
              path="results"
              element={<ResultsPage />}
            />
          </Route>
        </Route>

        {/* Route inconnue */}
        <Route
          path="*"
          element={
            <Navigate
              to="/student/login"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;