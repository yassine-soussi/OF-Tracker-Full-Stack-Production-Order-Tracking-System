// src/pages/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from '@/components/ui/login-form';

export const Route = createFileRoute('/')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <LoginForm />
  );
}