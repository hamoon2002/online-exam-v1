import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/Toast/Toast';

function GlobalSaveNotifications() {
  const [notification, setNotification] = useState<{ id: number; message: string } | null>(null);
  useEffect(() => {
    let count = 0;
    const onSaved = (event: Event) => {
      count += 1;
      setNotification({ id: count, message: (event as CustomEvent<string>).detail || 'تغییرات با موفقیت ذخیره شد' });
    };
    window.addEventListener('app:save-success', onSaved);
    return () => window.removeEventListener('app:save-success', onSaved);
  }, []);
  return notification ? (
    <Toast
      key={notification.id}
      tone="success"
      duration={4000}
      message={notification.message}
      onDismiss={() => setNotification(current => current?.id === notification.id ? null : current)}
    />
  ) : null;
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppRoutes />
        <GlobalSaveNotifications />
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;
