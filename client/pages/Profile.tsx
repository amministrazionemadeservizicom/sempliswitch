import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function Profile() {
  return (
    <AppLayout userRole="consulente">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Settings className="h-8 w-8 text-gray-600" />
            </div>
            <CardTitle className="text-xl">Profilo e Impostazioni</CardTitle>
            <CardDescription>
              Gestisci il tuo profilo e le impostazioni dell'account
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              In questa sezione potrai modificare i tuoi dati personali, 
              cambiare password e gestire le preferenze dell'applicazione.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
