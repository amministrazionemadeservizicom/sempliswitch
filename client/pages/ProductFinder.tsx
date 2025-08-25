import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type EnergySupply = "luce" | "gas";
type BillSim = {
  supplyType: EnergySupply;
  spesaMateriaEnergia: number;
  consumoPeriodo: number; // kWh o Smc
  periodoDal: string; // YYYY-MM-DD
  periodoAl: string;  // YYYY-MM-DD
};

function saveSimulation(sim: BillSim) {
  localStorage.setItem(`billSimulation_${sim.supplyType}`, JSON.stringify(sim));
  // legacy (se c'è una sola fornitura, molti pezzi di UI leggono ancora questa)
  localStorage.setItem("billSimulation", JSON.stringify(sim));
}

export default function ProductFinder() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const supplyTypes = useMemo(() => {
    const s = sp.get("supplyTypes");
    const arr = s ? s.split(",").filter(Boolean) : [];
    return (arr.length ? arr : ["luce"]) as EnergySupply[];
  }, [sp]);

  const hasLuce = supplyTypes.includes("luce");
  const hasGas = supplyTypes.includes("gas");
  const initialTab: EnergySupply = hasLuce ? "luce" : (hasGas ? "gas" : "luce");
  const [activeTab, setActiveTab] = useState<EnergySupply>(initialTab);

  const [form, setForm] = useState<Record<EnergySupply, BillSim>>({
    luce: { supplyType: "luce", spesaMateriaEnergia: 0, consumoPeriodo: 0, periodoDal: "", periodoAl: "" },
    gas:  { supplyType: "gas",  spesaMateriaEnergia: 0, consumoPeriodo: 0, periodoDal: "", periodoAl: "" },
  });

  // Precarica eventuali dati già salvati
  useEffect(() => {
    (["luce","gas"] as EnergySupply[]).forEach((sup) => {
      const raw = localStorage.getItem(`billSimulation_${sup}`);
      if (raw) {
        try {
          const obj = JSON.parse(raw) as BillSim;
          setForm(prev => ({ ...prev, [sup]: obj }));
        } catch {}
      }
    });
  }, []);

  function updateField(supply: EnergySupply, field: keyof BillSim, value: string) {
    setForm(prev => ({
      ...prev,
      [supply]: {
        ...prev[supply],
        [field]:
          field === "spesaMateriaEnergia" || field === "consumoPeriodo"
            ? Number(value.replace(",", "."))
            : value,
      }
    }));
  }

  function handleSubmit() {
    if (hasLuce) saveSimulation(form.luce);
    if (hasGas)  saveSimulation(form.gas);
    navigate("/offers");
  }

  const LuceForm = (
    <div className="space-y-4">
      <div>
        <Label>Spesa per la materia energia (€)</Label>
        <Input value={form.luce.spesaMateriaEnergia || ""} onChange={e => updateField("luce","spesaMateriaEnergia", e.target.value)} />
      </div>
      <div>
        <Label>Consumo nel periodo (kWh)</Label>
        <Input value={form.luce.consumoPeriodo || ""} onChange={e => updateField("luce","consumoPeriodo", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Periodo dal</Label>
          <Input type="date" value={form.luce.periodoDal} onChange={e => updateField("luce","periodoDal", e.target.value)} />
        </div>
        <div>
          <Label>Periodo al</Label>
          <Input type="date" value={form.luce.periodoAl} onChange={e => updateField("luce","periodoAl", e.target.value)} />
        </div>
      </div>
    </div>
  );

  const GasForm = (
    <div className="space-y-4">
      <div>
        <Label>Spesa per la materia energia (€)</Label>
        <Input value={form.gas.spesaMateriaEnergia || ""} onChange={e => updateField("gas","spesaMateriaEnergia", e.target.value)} />
      </div>
      <div>
        <Label>Consumo nel periodo (Smc)</Label>
        <Input value={form.gas.consumoPeriodo || ""} onChange={e => updateField("gas","consumoPeriodo", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Periodo dal</Label>
          <Input type="date" value={form.gas.periodoDal} onChange={e => updateField("gas","periodoDal", e.target.value)} />
        </div>
        <div>
          <Label>Periodo al</Label>
          <Input type="date" value={form.gas.periodoAl} onChange={e => updateField("gas","periodoAl", e.target.value)} />
        </div>
      </div>
    </div>
  );

  const showTabs = hasLuce && hasGas;

  return (
    <AppLayout userRole={undefined as any}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Ricerca prodotto</h1>

        {showTabs ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EnergySupply)}>
            <TabsList className="mb-4">
              <TabsTrigger value="luce">Luce</TabsTrigger>
              <TabsTrigger value="gas">Gas</TabsTrigger>
            </TabsList>
            <Card className="p-6">
              <TabsContent value="luce">{LuceForm}</TabsContent>
              <TabsContent value="gas">{GasForm}</TabsContent>
            </Card>
          </Tabs>
        ) : (
          <Card className="p-6">
            {hasLuce ? LuceForm : GasForm}
          </Card>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => navigate(-1)}>Annulla</Button>
          <Button style={{ backgroundColor: "#F2C927", color: "#333" }} onClick={handleSubmit}>
            Continua alle offerte
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}