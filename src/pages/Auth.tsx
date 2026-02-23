import { Navigate, useLocation } from "react-router-dom";

export default function Auth() {
  // Redirect to landing page with ?auth=open to trigger the AuthDialog
  return <Navigate to="/?auth=open" replace />;
}
