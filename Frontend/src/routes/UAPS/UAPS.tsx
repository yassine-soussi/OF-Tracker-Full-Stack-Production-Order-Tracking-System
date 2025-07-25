import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'


// Route avec TanStack Router : NE PAS SUPPRIMER
export const Route = createFileRoute('/UAPS/UAPS')({
  component: UAPS,
})

const BUTTON_CLASSES = 'bg-orange-400 hover:bg-orange-600 text-white w-full'

const uapOptions = [
  { path: '/UAPS/P-DIM/P-DIM', label: 'P.DIM' },
  { path: '/UAPS/G-DIM/G-DIM', label: 'G.DIM et Métaux Durs' },
  { path: '/UAPS/PROFILEE/PROFILEE', label: 'Profilé' },
]

function UAPS() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="text-2xl font-[Lobster] text-[#FF7F50] drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)] py-4 px-6 shadow-md z-10">
        Bienvenue Maroua
      </header>

      <main className="flex flex-1 items-start justify-center pt-12 px-4 md:px-7">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Unités Autonomes de Production</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <p className="text-gray-600 text-lg">Veuillez sélectionner l'UAP appropriée :</p>

              <nav className="flex flex-col gap-6" aria-label="Navigation des unités autonomes de production">
                {uapOptions.map(({ path, label }) => (
                  <Link key={path} to={path} aria-label={`Accéder à l'unité ${label}`}>
                    <Button className={BUTTON_CLASSES}>{label}</Button>
                  </Link>
                ))}
              </nav>

              <div className="pt-5">
                <Link to="/" className="inline-block text-[#FF7F50] hover:underline text-sm" aria-label="Retour à la page de connexion">
                  ← Retour à la connexion
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}


export default UAPS
