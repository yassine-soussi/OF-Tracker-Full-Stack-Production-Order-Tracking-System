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
import { useNavigate } from "@tanstack/react-router";
import LoginHeader from "@/components/ui/LoginHeader";
import Footer from "@/components/ui/Footer";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      // Send nom, email and password for authentication with auto-registration
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(" Connexion réussie");

        // Store user data and permissions in localStorage for route protection
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('userName', data.nom);
        localStorage.setItem('userPermissions', JSON.stringify(data.permissions || ["*"]));

        // Utilisation de data.redirect
        if (data.redirect && data.redirect !== "/login/page") {
          navigate({ to: data.redirect });
        } else {
          // Default redirect for users with limited permissions
          if (data.permissions && data.permissions.length > 0 && data.permissions[0] !== "*") {
            navigate({ to: data.permissions[0] });
          } else {
            navigate({ to: "/login/page" }); // fallback
          }
        }

      } else {
        setMessage(" Email ou mot de passe incorrect");
      }
    } catch {
      setMessage(" Erreur de connexion au serveur");
    }
  };

  return (
    <div className={cn("flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100", className)} {...props}>
      {/* Login Header - Full Width */}
      <div className="w-full">
        <LoginHeader />
      </div>
      
      {/* Main content area - Full Width */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-gray-800">
                Connexion
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                Entrez vos informations pour accéder à votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-sm font-medium text-gray-700">
                      Nom complet
                    </Label>
                    <Input
                      id="nom"
                      type="text"
                      placeholder="Entrez votre nom complet"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                      className="h-11 px-4 border-gray-300 focus:border-[#ef8f0e] focus:ring-[#ef8f0e]/20 rounded-lg transition-all duration-200"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Adresse email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre.email@figeac-aero.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 px-4 border-gray-300 focus:border-[#ef8f0e] focus:ring-[#ef8f0e]/20 rounded-lg transition-all duration-200"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Entrez votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 px-4 border-gray-300 focus:border-[#ef8f0e] focus:ring-[#ef8f0e]/20 rounded-lg transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-[#ef8f0e] to-[#d47d0a] hover:from-[#d47d0a] hover:to-[#c2710a] text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                  >
                    Se connecter
                  </Button>
                  
                  {message && (
                    <div className={cn(
                      "p-3 rounded-lg text-sm font-medium text-center transition-all duration-200",
                      message.includes("réussie")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    )}>
                      {message}
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Full width footer */}
      <Footer />
    </div>
  );
}
