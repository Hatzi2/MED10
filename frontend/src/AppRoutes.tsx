// AppRoutes.tsx
import AutoCheck from "./Autocheck";
import RevisionPage from "./RevisionPage";
import HomePage from "./HomePage";
import { Route, Routes } from "react-router-dom";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/main" element={<AutoCheck />} /> {/* Previously "Home" */}
      <Route path="/revision" element={<RevisionPage />} />
    </Routes>
  );
};

export default AppRoutes;