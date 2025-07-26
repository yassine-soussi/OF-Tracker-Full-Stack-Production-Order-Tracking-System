// src/pages/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from '@/components/ui/login-form'
export const Route = createFileRoute('/login/page')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}