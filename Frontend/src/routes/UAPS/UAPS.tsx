import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/useUser'



export const Route = createFileRoute('/UAPS/UAPS')({
  component: UAPS,
})

const BUTTON_COLOR_CLASSES = 'bg-orange-400 hover:bg-orange-600 text-white flex-1'

const uapOptions = [
  { path: '/UAPS/P-DIM/P-DIM', label: 'P.DIM' },
  { path: '/UAPS/G-DIM/G-DIM', label: 'G.DIM et Métaux Durs' },
  { path: '/UAPS/PROFILEE/PROFILEE', label: 'Profilé' },
]

function UAPS() {
  const { firstName } = useUser();
  
  return (
    <div className="flex flex-col">
      <header className="w-full">
        <div
          className="w-full py-3 px-6 bg-[#ef8f0e] text-white"
          style={{
            fontSize: '24px',
            fontFamily: 'Raleway',
          }}
        >
          Bienvenue {firstName}
        </div>
      </header>

      {/* Main content - stretched wider */}
      <div className="flex justify-center pt-4 px-4">
        <div className="w-full max-w-4xl"> {/* Increased max-width */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Unités Autonomes de Production</CardTitle>
            </CardHeader>

            <CardContent className="space-y-1">
              <p className="text-gray-600 text-lg">Veuillez sélectionner l'UAP appropriée :</p>

              {/* Buttons container - full width with equal button widths */}
              <div className="flex flex-row gap-4 w-full">
                {uapOptions.map(({ path, label }) => (
                  <Link key={path} to={path} className="flex-1 min-w-0" aria-label={`Accéder à l'unité ${label}`}>
                    <Button className={`${BUTTON_COLOR_CLASSES} w-full`}>{label}</Button>
                  </Link>
                ))}
              </div>

              <div>
                <Link to="/" className="inline-block text-[#FF7F50] hover:underline text-sm" aria-label="Retour à la page de connexion">
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default UAPS
