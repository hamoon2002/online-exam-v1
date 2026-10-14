import { Navigate } from 'react-router-dom';
// Legacy links remain valid; profile completion is optional inside Settings.
export default function OnboardingPage() { return <Navigate to="/dashboard" replace />; }
