import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function App() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/'); // Redirect to the root route (app/_layout.tsx)
  }, [router]);

  return null; // Render nothing while redirecting
}