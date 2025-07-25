import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // // Fonction handleSubmit désactivée (commentée)
  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   // Simuler une validation (remplace par ta logique d'authentification)
  //   if (email && password) {
  //     // router.navigate({ to: '/UAPS/UAPS' });
  //     alert(`Connexion réussie avec : ${email}`);
  //   } else {
  //     alert('Veuillez remplir tous les champs.');
  //   }
  // };

  return (
   <div
  className={cn("flex flex-col gap-6 login-form-container", className)}
  {...props}
>
      <Card>
        <CardHeader>
          <CardTitle>Connectez-vous à votre compte</CardTitle>
          <CardDescription>
            Entrez votre e-mail ci-dessous pour vous connecter à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Pas de onSubmit ici car handleSubmit est désactivé */}
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Mot de passe </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full bg-[#ef8f0e] hover:bg-[#d47d0a] text-white"
                  onClick={(e) => e.preventDefault()} // empêche la soumission du formulaire
                >
                  Login
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
