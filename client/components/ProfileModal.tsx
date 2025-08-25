import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { User, Mail, Phone, CreditCard, MapPin, Save, X } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
  onUserDataUpdate: (updatedData: any) => void;
}

export default function ProfileModal({ isOpen, onClose, userData, onUserDataUpdate }: ProfileModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    iban: '',
    indirizzo: '',
    cap: '',
    citta: '',
    note: ''
  });

  // Initialize form data when userData changes
  useEffect(() => {
    if (userData) {
      setFormData({
        nome: userData.nome || '',
        cognome: userData.cognome || '',
        email: userData.email || '',
        telefono: userData.telefono || '',
        iban: userData.iban || '',
        indirizzo: userData.indirizzo || '',
        cap: userData.cap || '',
        citta: userData.citta || '',
        note: userData.note || ''
      });
    }
  }, [userData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!userData?.uid) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Dati utente non disponibili"
      });
      return;
    }

    // Basic validation
    if (!formData.nome.trim() || !formData.cognome.trim()) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Nome e cognome sono obbligatori"
      });
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Email valida è obbligatoria"
      });
      return;
    }

    setIsLoading(true);
    try {
      const userRef = doc(db, "utenti", userData.uid);
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);

      // Update local userData
      const updatedUserData = {
        ...userData,
        ...updateData
      };
      onUserDataUpdate(updatedUserData);

      toast({
        title: "✅ Profilo aggiornato",
        description: "Le modifiche sono state salvate con successo"
      });

      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile salvare le modifiche. Riprova."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    const nome = formData.nome || userData?.nome || '';
    const cognome = formData.cognome || userData?.cognome || '';
    return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase();
  };

  if (!userData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl font-roboto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Modifica Profilo
          </DialogTitle>
          <DialogDescription>
            Aggiorna i tuoi dati personali e le informazioni di contatto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar and basic info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-black text-yellow-400 text-lg font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">
                {formData.nome} {formData.cognome}
              </h3>
              <p className="text-sm text-gray-600 capitalize">
                {userData.ruolo}
              </p>
              <p className="text-xs text-gray-500">
                Membro dal: {new Date(userData.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informazioni Personali
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Il tuo nome"
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label htmlFor="cognome">Cognome *</Label>
                <Input
                  id="cognome"
                  value={formData.cognome}
                  onChange={(e) => handleInputChange('cognome', e.target.value)}
                  placeholder="Il tuo cognome"
                  className="rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contatti
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="tua@email.com"
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  placeholder="+39 333 123 4567"
                  className="rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Indirizzo
            </h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="indirizzo">Indirizzo</Label>
                <Input
                  id="indirizzo"
                  value={formData.indirizzo}
                  onChange={(e) => handleInputChange('indirizzo', e.target.value)}
                  placeholder="Via, numero civico"
                  className="rounded-2xl"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cap">CAP</Label>
                  <Input
                    id="cap"
                    value={formData.cap}
                    onChange={(e) => handleInputChange('cap', e.target.value)}
                    placeholder="00100"
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="citta">Città</Label>
                  <Input
                    id="citta"
                    value={formData.citta}
                    onChange={(e) => handleInputChange('citta', e.target.value)}
                    placeholder="Roma"
                    className="rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Informazioni Bancarie
            </h4>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => handleInputChange('iban', e.target.value)}
                placeholder="IT60 X054 2811 1010 0000 0123 456"
                className="rounded-2xl"
              />
              <p className="text-xs text-gray-500 mt-1">
                Inserisci l'IBAN per ricevere i pagamenti delle commissioni
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Note</h4>
            <div>
              <Label htmlFor="note">Note aggiuntive</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder="Inserisci eventuali note o informazioni aggiuntive..."
                className="rounded-2xl"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            style={{ backgroundColor: '#F2C927', color: '#333333' }}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
