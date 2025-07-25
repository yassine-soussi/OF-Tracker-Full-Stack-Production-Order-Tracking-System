// src/pages/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from '@/components/ui/login-form';

export const Route = createFileRoute('/')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="text-center">
      <header className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-800 text-[calc(10px+2vmin)]">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </header>
    </div>
  );
}