import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  Zap, 
  Flame, 
  Euro,
  TrendingUp,
  TrendingDown,
  Info,
  FileText,
  ShoppingCart,
  Eye,
  Settings
} from "lucide-react";

type TipoSimulazione = "luce" | "gas";
type PrezzoTipo = "fisso" | "variabile";
type Fatturazione = "mensile" | "bimestrale";

interface CalculationResult {
  quotaEnergia: number;
  trasportoTot: number;
  acciseTot: number;
  quotaFissaTot: number;
  quotaPotenzaTot: number;
  ivaImporto: number;
  totaleAnnuale: number;
  totaleMensile: number;
}

export default function Simulation() {
  // Tipo di simulazione
  const [tipo, setTipo] = useState<TipoSimulazione>("luce");
  const [prezzoTipo, setPrezzoTipo] = useState<PrezzoTipo>("fisso");
  const [fatturazione, setFatturazione] = useState<Fatturazione>("mensile");
  
  // Parametri di consumo
  const [consumo, setConsumo] = useState<number>(2700); // kWh o smc
  const [potenza, setPotenza] = useState<number>(3); // kW
  
  // Parametri di prezzo
  const [prezzo, setPrezzo] = useState<number>(0.08); // €/kWh o €/smc
  const [punPsv, setPunPsv] = useState<number>(0.11); // PUN (luce) o PSV (gas)
  const [spread, setSpread] = useState<number>(0.02);
  
  // Quote e costi fissi
  const [quotaFissa, setQuotaFissa] = useState<number>(10); // €/mese
  const [quotaPotenza, setQuotaPotenza] = useState<number>(2.1); // €/kW/mese solo luce
  
  // Trasporto e oneri
  const [trasporto, setTrasporto] = useState<number>(0.011); // €/kWh o €/smc
  const [accise, setAccise] = useState<number>(0.0227); // €/kWh o €/smc
  const [iva, setIva] = useState<number>(10); // %
  
  // Gas specifico
  const [adeguamentoPcs, setAdeguamentoPcs] = useState<number>(0.019); // €/smc
  
  // Confronto bolletta attuale
  const [bollettaAttuale, setBollettaAttuale] = useState<number>(0);
  const [periodicitaAttuale, setPeriodicitaAttuale] = useState<Fatturazione>("mensile");

  // Determina se l'utente è admin (per ora mock)
  const isAdmin = true; // Mock - sostituire con vera logica di ruolo

  const calcolaTotale = (): CalculationResult => {
    const fasce = fatturazione === "mensile" ? 12 : 6;
    const quotaFissaTot = quotaFissa * fasce;
    const quotaPotenzaTot = tipo === "luce" ? quotaPotenza * potenza * fasce : 0;

    const prezzoFinale = prezzoTipo === "variabile" ? punPsv + spread : prezzo;

    let quotaEnergia = consumo * prezzoFinale;
    let trasportoTot = consumo * trasporto;
    let acciseTot = consumo * accise;

    if (tipo === "gas") {
      quotaEnergia += consumo * adeguamentoPcs;
    }

    const imponibile = quotaEnergia + quotaFissaTot + trasportoTot + acciseTot + quotaPotenzaTot;
    const ivaImporto = (imponibile * iva) / 100;
    const totaleAnnuale = imponibile + ivaImporto;
    const totaleMensile = totaleAnnuale / 12;

    return {
      quotaEnergia,
      trasportoTot,
      acciseTot,
      quotaFissaTot,
      quotaPotenzaTot,
      ivaImporto,
      totaleAnnuale,
      totaleMensile,
    };
  };

  const risultato = calcolaTotale();

  // Calcolo confronto con bolletta attuale
  const attualeAnnua = bollettaAttuale * (periodicitaAttuale === "mensile" ? 12 : 6);
  const differenza = attualeAnnua - risultato.totaleAnnuale;
  const etichetta = differenza > 0 ? "Risparmio stimato" : "Spesa aggiuntiva";

  const salvaInCarrello = () => {
    const datiSimulazione = {
      tipo,
      prezzoTipo,
      fatturazione,
      consumo,
      potenza,
      prezzo,
      punPsv,
      spread,
      quotaFissa,
      quotaPotenza,
      trasporto,
      accise,
      iva,
      adeguamentoPcs,
      risultato
    };
    
    localStorage.setItem('simulazioneCarrello', JSON.stringify(datiSimulazione));
    alert('Dati simulazione salvati nel carrello!');
  };

  const CustomCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div 
      className={`bg-gray-50 rounded-2xl shadow-sm border border-gray-100 ${className}`}
      style={{ 
        backgroundColor: '#FAFAFA',
        boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
        borderRadius: '16px'
      }}
    >
      {children}
    </div>
  );

  return (
    <AppLayout userRole="consulente">
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calculator className="h-8 w-8" style={{ color: '#F2C927' }} />
              Simulatore {tipo === "luce" ? "Luce" : "Gas"} Avanzato
            </h1>
            <p className="text-gray-600">Calcola in modo realistico il costo annuale e mensile delle forniture di energia</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            
            {/* Pannello Configurazione */}
            <div className="xl:col-span-2">
              <CustomCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurazione Simulazione
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Selezione tipo simulazione */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tipo">Tipo Fornitura</Label>
                      <Select value={tipo} onValueChange={(value: TipoSimulazione) => setTipo(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="luce">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Luce
                            </div>
                          </SelectItem>
                          <SelectItem value="gas">
                            <div className="flex items-center gap-2">
                              <Flame className="h-4 w-4" />
                              Gas
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="prezzoTipo">Tipo Prezzo</Label>
                      <Select value={prezzoTipo} onValueChange={(value: PrezzoTipo) => setPrezzoTipo(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisso">Prezzo Fisso</SelectItem>
                          <SelectItem value="variabile">Prezzo Variabile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fatturazione">Fatturazione</Label>
                      <Select value={fatturazione} onValueChange={(value: Fatturazione) => setFatturazione(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensile">Mensile</SelectItem>
                          <SelectItem value="bimestrale">Bimestrale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Parametri di consumo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="consumo">
                        Consumo Annuale ({tipo === "luce" ? "kWh" : "Smc"})
                      </Label>
                      <Input
                        type="number"
                        value={consumo}
                        onChange={(e) => setConsumo(parseFloat(e.target.value) || 0)}
                        placeholder="2700"
                        disabled={!isAdmin}
                      />
                    </div>

                    {tipo === "luce" && (
                      <div>
                        <Label htmlFor="potenza">Potenza Impegnata (kW)</Label>
                        <Input
                          type="number"
                          value={potenza}
                          onChange={(e) => setPotenza(parseFloat(e.target.value) || 0)}
                          placeholder="3"
                          disabled={!isAdmin}
                        />
                      </div>
                    )}
                  </div>

                  {/* Parametri di prezzo */}
                  <div className="grid grid-cols-2 gap-4">
                    {prezzoTipo === "fisso" ? (
                      <div>
                        <Label htmlFor="prezzo">
                          Prezzo Energia (€/{tipo === "luce" ? "kWh" : "Smc"})
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={prezzo}
                          onChange={(e) => setPrezzo(parseFloat(e.target.value) || 0)}
                          placeholder="0.080"
                          disabled={!isAdmin}
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="punPsv">
                            {tipo === "luce" ? "PUN" : "PSV"} (€/{tipo === "luce" ? "kWh" : "Smc"})
                          </Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={punPsv}
                            onChange={(e) => setPunPsv(parseFloat(e.target.value) || 0)}
                            placeholder="0.110"
                            disabled={!isAdmin}
                          />
                        </div>
                        <div>
                          <Label htmlFor="spread">Spread (€/{tipo === "luce" ? "kWh" : "Smc"})</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={spread}
                            onChange={(e) => setSpread(parseFloat(e.target.value) || 0)}
                            placeholder="0.020"
                            disabled={!isAdmin}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quote fisse */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quotaFissa">Quota Fissa Mensile (€)</Label>
                      <Input
                        type="number"
                        value={quotaFissa}
                        onChange={(e) => setQuotaFissa(parseFloat(e.target.value) || 0)}
                        placeholder="10"
                        disabled={!isAdmin}
                      />
                    </div>

                    {tipo === "luce" && (
                      <div>
                        <Label htmlFor="quotaPotenza">Quota Potenza (€/kW/mese)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={quotaPotenza}
                          onChange={(e) => setQuotaPotenza(parseFloat(e.target.value) || 0)}
                          placeholder="2.1"
                          disabled={!isAdmin}
                        />
                      </div>
                    )}
                  </div>

                  {/* Oneri e imposte */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trasporto">
                        Trasporto (€/{tipo === "luce" ? "kWh" : "Smc"})
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={trasporto}
                        onChange={(e) => setTrasporto(parseFloat(e.target.value) || 0)}
                        placeholder="0.011"
                        disabled={!isAdmin}
                      />
                    </div>

                    <div>
                      <Label htmlFor="accise">
                        Accise (€/{tipo === "luce" ? "kWh" : "Smc"})
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={accise}
                        onChange={(e) => setAccise(parseFloat(e.target.value) || 0)}
                        placeholder="0.0227"
                        disabled={!isAdmin}
                      />
                    </div>

                    <div>
                      <Label htmlFor="iva">IVA (%)</Label>
                      <Input
                        type="number"
                        value={iva}
                        onChange={(e) => setIva(parseFloat(e.target.value) || 0)}
                        placeholder="10"
                        disabled={!isAdmin}
                      />
                    </div>

                    {tipo === "gas" && (
                      <div>
                        <Label htmlFor="adeguamentoPcs">Adeguamento PCS (€/Smc)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={adeguamentoPcs}
                          onChange={(e) => setAdeguamentoPcs(parseFloat(e.target.value) || 0)}
                          placeholder="0.019"
                          disabled={!isAdmin}
                        />
                      </div>
                    )}
                  </div>

                  {/* Confronto bolletta attuale */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Confronto con Bolletta Attuale</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bollettaAttuale">Importo Bolletta Attuale (€)</Label>
                        <Input
                          type="number"
                          value={bollettaAttuale}
                          onChange={(e) => setBollettaAttuale(parseFloat(e.target.value) || 0)}
                          placeholder="41.00"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="periodicitaAttuale">Periodicità Attuale</Label>
                        <Select value={periodicitaAttuale} onValueChange={(value: Fatturazione) => setPeriodicitaAttuale(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mensile">Mensile</SelectItem>
                            <SelectItem value="bimestrale">Bimestrale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </CustomCard>
            </div>

            {/* Risultati Simulazione */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* Totali principali */}
              <CustomCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" style={{ color: '#E6007E' }} />
                    Risultati Simulazione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="text-3xl font-bold mb-2" style={{ color: '#E6007E' }}>
                        €{risultato.totaleAnnuale.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Totale Annuale Stimato</div>
                    </div>

                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="text-3xl font-bold mb-2" style={{ color: '#E6007E' }}>
                        €{risultato.totaleMensile.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Totale Mensile Stimato</div>
                    </div>
                  </div>

                  {/* Confronto con bolletta attuale */}
                  {bollettaAttuale > 0 && (
                    <div className="p-4 rounded-xl border-2" style={{ 
                      backgroundColor: differenza > 0 ? '#f0f9ff' : '#fef2f2',
                      borderColor: differenza > 0 ? '#10b981' : '#ef4444'
                    }}>
                      <div className="text-center">
                        <div className="text-lg font-medium text-gray-900 mb-2">
                          Confronto con bolletta attuale (€{attualeAnnua.toFixed(2)}/anno)
                        </div>
                        <div className={`text-2xl font-bold flex items-center justify-center gap-2 ${
                          differenza > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {differenza > 0 ? (
                            <TrendingDown className="h-6 w-6" />
                          ) : (
                            <TrendingUp className="h-6 w-6" />
                          )}
                          {etichetta}: €{Math.abs(differenza).toFixed(2)}/anno
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dettaglio espandibile */}
                  <details className="mt-6">
                    <summary className="cursor-pointer font-semibold text-gray-900 hover:text-gray-700">
                      📊 Mostra dettagli calcolo
                    </summary>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Quota energia:</span>
                        <span className="font-medium">€{risultato.quotaEnergia.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Trasporto:</span>
                        <span className="font-medium">€{risultato.trasportoTot.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Accise:</span>
                        <span className="font-medium">€{risultato.acciseTot.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Quota fissa:</span>
                        <span className="font-medium">€{risultato.quotaFissaTot.toFixed(2)}</span>
                      </div>
                      {tipo === "luce" && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Quota potenza:</span>
                          <span className="font-medium">€{risultato.quotaPotenzaTot.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">IVA:</span>
                        <span className="font-medium">€{risultato.ivaImporto.toFixed(2)}</span>
                      </div>
                    </div>
                  </details>
                </CardContent>
              </CustomCard>

              {/* Azioni */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={salvaInCarrello}
                  className="w-full"
                  style={{ backgroundColor: '#F2C927', color: '#333333' }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Salva nel Carrello
                </Button>
                
                <Button 
                  className="w-full"
                  style={{ backgroundColor: '#E6007E', color: 'white' }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Genera Report PDF
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
