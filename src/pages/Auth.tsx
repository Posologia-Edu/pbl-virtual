import { Navigate } from "react-router-dom";

export default function Auth() {
  // Auth is now handled via AuthDialog modal on LandingPage
  return <Navigate to="/" replace />;
}
