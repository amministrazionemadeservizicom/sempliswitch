import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function BillCheck() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const qs = searchParams.toString();
  const goOffers = () => navigate(`/offers?${qs}`);
  const goProductFinder = () => navigate(`/product-finder?${qs}`);

  return (
    <AppLayout userRole={userRole}>
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Diamo un'occhiata alla bolletta?</h1>
            <p className="text-gray-600 mt-2">
              Possiamo stimare subito risparmio o extra spesa sulle offerte che vedrai.
            </p>
          </div>

          <Card className="p-6 rounded-2xl border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                className="h-12 rounded-2xl"
                style={{ backgroundColor: '#F2C927', color: '#333333' }}
                onClick={goProductFinder}
              >
                Sì, inserisco i dati della bolletta
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl"
                onClick={goOffers}
              >
                No, continua alle offerte
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Nota: i dati inseriti verranno salvati solo in locale sul tuo browser.
            </p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
