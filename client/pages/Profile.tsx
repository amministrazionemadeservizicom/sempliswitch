import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "../firebase";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import {
  User,
  Edit,
  Save,
  ArrowLeft,
  Shield,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle
} from "lucide-react";

interface UserData {
  uid: string;
  nome: string;
  cognome: string;
  fullName?: string;
  email: string;
  ruolo: string;
  attivo: boolean;
  telefono?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  codiceFiscale?: string;
  partitaIva?: string;
  iban?: string;
  note?: string;
  pianoCompensi?: string;
  gestoriAssegnati?: string[];
  master?: string;
  createdAt: string;
  lastLogin?: string;
  lastUpdated?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user: currentUser, userRole } = useAuth();
  const { toast } = useToast();
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<Partial<UserData>>({});
  
  // Password change data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    console.log('🔍 Profile page - currentUser:', currentUser);
    console.log('🔍 Profile page - userRole:', userRole);
    console.log('🔍 Profile page - localStorage uid:', localStorage.getItem('uid'));
    console.log('🔍 Profile page - localStorage userRole:', localStorage.getItem('userRole'));
    fetchUserData();
  }, [currentUser]);

  const fetchUserData = async () => {
    // Try to get UID from currentUser or localStorage
    const uid = currentUser?.uid || localStorage.getItem('uid');

    if (!uid) {
      console.log('❌ Profile: No UID found, redirecting to login');
      navigate('/');
      return;
    }

    console.log('🔍 Profile: Using UID:', uid);

    try {
      setLoading(true);
      console.log('📡 Profile: Fetching user data for uid:', uid);
      const userDoc = await getDoc(doc(db, "utenti", uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('✅ Profile: User document found:', data);
        const profileData: UserData = {
          uid: uid,
          nome: data.nome || '',
          cognome: data.cognome || '',
          fullName: data.fullName || `${data.nome || ''} ${data.cognome || ''}`.trim(),
          email: data.email || currentUser.email || '',
          ruolo: data.ruolo || 'consulente',
          attivo: data.attivo !== false,
          telefono: data.telefono || '',
          indirizzo: data.indirizzo || '',
          citta: data.citta || '',
          provincia: data.provincia || '',
          cap: data.cap || '',
          codiceFiscale: data.codiceFiscale || '',
          partitaIva: data.partitaIva || '',
          iban: data.iban || '',
          note: data.note || '',
          pianoCompensi: data.pianoCompensi || '',
          gestoriAssegnati: data.gestoriAssegnati || [],
          master: data.master || '',
          createdAt: data.createdAt || '',
          lastLogin: data.lastLogin || '',
          lastUpdated: data.lastUpdated || ''
        };
        
        setUserData(profileData);
        setFormData(profileData);
        console.log('✅ Profile: User profile data set:', profileData);
      } else {
        console.log('❌ Profile: User document not found for uid:', uid);

        // Try to create basic profile from localStorage
        const storedUserName = localStorage.getItem('userName') || '';
        const storedRole = localStorage.getItem('userRole') || 'consulente';
        const storedEmail = localStorage.getItem('userEmail') || '';

        if (storedUserName && storedRole) {
          const [nome, ...cognomeParts] = storedUserName.split(' ');
          const cognome = cognomeParts.join(' ');

          const basicProfileData: UserData = {
            uid: uid,
            nome: nome || '',
            cognome: cognome || '',
            fullName: storedUserName,
            email: storedEmail,
            ruolo: storedRole,
            attivo: true,
            telefono: '',
            indirizzo: '',
            citta: '',
            provincia: '',
            cap: '',
            codiceFiscale: '',
            partitaIva: '',
            iban: '',
            note: '',
            pianoCompensi: '',
            gestoriAssegnati: [],
            master: '',
            createdAt: '',
            lastLogin: '',
            lastUpdated: ''
          };

          setUserData(basicProfileData);
          setFormData(basicProfileData);
          console.log('✅ Profile: Created basic profile from localStorage:', basicProfileData);

          toast({
            title: "Profilo caricato",
            description: "Alcuni dati potrebbero non essere disponibili. Completa il tuo profilo.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Errore",
            description: "Dati utente non trovati"
          });
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i dati del profilo"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.uid || !formData) return;

    try {
      setSaving(true);
      
      // Update fullName if nome or cognome changed
      const updatedFormData = {
        ...formData,
        fullName: `${formData.nome || ''} ${formData.cognome || ''}`.trim(),
        lastUpdated: new Date().toISOString()
      };

      await updateDoc(doc(db, "utenti", currentUser.uid), updatedFormData);
      
      // Update localStorage
      localStorage.setItem("userName", updatedFormData.fullName || '');
      
      setUserData({ ...userData!, ...updatedFormData });
      setIsEditing(false);
      
      toast({
        title: "✅ Profilo aggiornato",
        description: "Le tue informazioni sono state salvate con successo",
      });
      
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile salvare le modifiche"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Le nuove password non corrispondono"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri"
      });
      return;
    }

    try {
      setSaving(true);
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, passwordData.newPassword);
      
      toast({
        title: "✅ Password aggiornata",
        description: "La tua password è stata modificata con successo",
      });
      
      setShowPasswordChange(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error: any) {
      console.error("Error updating password:", error);
      let errorMessage = "Impossibile aggiornare la password";
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Password attuale non corretta";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La password è troppo debole";
      }
      
      toast({
        variant: "destructive",
        title: "Errore",
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (ruolo: string) => {
    const variants = {
      'admin': { variant: 'destructive' as const, color: 'text-red-700', label: 'Amministratore' },
      'master': { variant: 'default' as const, color: 'text-purple-700', label: 'Master' },
      'consulente': { variant: 'secondary' as const, color: 'text-blue-700', label: 'Consulente' },
      'back office': { variant: 'outline' as const, color: 'text-gray-700', label: 'Back Office' }
    };
    
    const config = variants[ruolo as keyof typeof variants] || variants['consulente'];
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <AppLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento profilo...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!userData) {
    return (
      <AppLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Errore nel caricamento del profilo</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole={userRole}>
      <div className="min-h-screen bg-white font-roboto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="rounded-2xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Indietro
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <User className="h-8 w-8" style={{ color: '#F2C927' }} />
                  Il Mio Profilo
                </h1>
                <p className="text-gray-600">Visualizza e modifica le tue informazioni personali</p>
              </div>
            </div>
            
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="shadow-md"
                style={{ backgroundColor: '#F2C927', color: '#333333' }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifica Profilo
              </Button>
            )}
          </div>

          {/* Account Status Alert */}
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Account attivo</strong> • Ultimo accesso: {userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString('it-IT') : 'Mai'}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Profile Card */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Personal Information */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informazioni Personali
                  </CardTitle>
                  <CardDescription>
                    I tuoi dati anagrafici e di contatto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={isEditing ? (formData.nome || '') : userData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cognome">Cognome *</Label>
                      <Input
                        id="cognome"
                        value={isEditing ? (formData.cognome || '') : userData.cognome}
                        onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      disabled
                      className="rounded-2xl bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">L'email non può essere modificata</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="telefono">Telefono</Label>
                      <Input
                        id="telefono"
                        value={isEditing ? (formData.telefono || '') : (userData.telefono || '')}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                        placeholder="+39 123 456 7890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="codiceFiscale">Codice Fiscale</Label>
                      <Input
                        id="codiceFiscale"
                        value={isEditing ? (formData.codiceFiscale || '') : (userData.codiceFiscale || '')}
                        onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value.toUpperCase() })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                        maxLength={16}
                        placeholder="RSSMRA80A01H501Z"
                      />
                    </div>
                  </div>

                  {/* Business info for relevant roles */}
                  {(userData.ruolo === 'master' || userData.ruolo === 'consulente') && (
                    <div>
                      <Label htmlFor="partitaIva">Partita IVA (opzionale)</Label>
                      <Input
                        id="partitaIva"
                        value={isEditing ? (formData.partitaIva || '') : (userData.partitaIva || '')}
                        onChange={(e) => setFormData({ ...formData, partitaIva: e.target.value })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                        maxLength={11}
                        placeholder="12345678901"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Indirizzo
                  </CardTitle>
                  <CardDescription>
                    Il tuo indirizzo di residenza o sede
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="indirizzo">Via/Indirizzo</Label>
                    <Input
                      id="indirizzo"
                      value={isEditing ? (formData.indirizzo || '') : (userData.indirizzo || '')}
                      onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                      disabled={!isEditing}
                      className="rounded-2xl"
                      placeholder="Via Roma, 123"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-3">
                      <Label htmlFor="citta">Città</Label>
                      <Input
                        id="citta"
                        value={isEditing ? (formData.citta || '') : (userData.citta || '')}
                        onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                        placeholder="Milano"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="provincia">Provincia</Label>
                      <Input
                        id="provincia"
                        value={isEditing ? (formData.provincia || '') : (userData.provincia || '')}
                        onChange={(e) => setFormData({ ...formData, provincia: e.target.value.toUpperCase() })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                        maxLength={2}
                        placeholder="MI"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cap">CAP</Label>
                      <Input
                        id="cap"
                        value={isEditing ? (formData.cap || '') : (userData.cap || '')}
                        onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                        maxLength={5}
                        placeholder="20121"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information (for consulenti and master) */}
              {(userData.ruolo === 'master' || userData.ruolo === 'consulente') && (
                <Card className="rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Informazioni Finanziarie
                    </CardTitle>
                    <CardDescription>
                      IBAN per i pagamenti delle commissioni
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="iban">IBAN</Label>
                      <Input
                        id="iban"
                        value={isEditing ? (formData.iban || '') : (userData.iban || '')}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                        disabled={!isEditing}
                        className="rounded-2xl"
                        placeholder="IT60 X054 2811 1010 0000 0123 456"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle>Note Personali</CardTitle>
                  <CardDescription>
                    Aggiungi informazioni aggiuntive sul tuo profilo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={isEditing ? (formData.note || '') : (userData.note || '')}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    disabled={!isEditing}
                    className="rounded-2xl"
                    rows={4}
                    placeholder="Inserisci note o informazioni aggiuntive..."
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1"
                    style={{ backgroundColor: '#F2C927', color: '#333333' }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salva Modifiche'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData(userData);
                    }}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Annulla
                  </Button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Account Info */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Info Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600">Ruolo</Label>
                    <div className="mt-1">
                      {getRoleBadge(userData.ruolo)}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Stato</Label>
                    <div className="mt-1">
                      {userData.attivo ? (
                        <Badge className="bg-green-100 text-green-800">Attivo</Badge>
                      ) : (
                        <Badge variant="secondary">Non Attivo</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Creato il</Label>
                    <p className="text-sm font-medium mt-1">
                      {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('it-IT') : 'Data non disponibile'}
                    </p>
                  </div>

                  {userData.lastUpdated && (
                    <div>
                      <Label className="text-sm text-gray-600">Ultimo aggiornamento</Label>
                      <p className="text-sm font-medium mt-1">
                        {new Date(userData.lastUpdated).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Professional Info */}
              {(userData.ruolo === 'master' || userData.ruolo === 'consulente') && (
                <Card className="rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle>Info Professionali</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userData.pianoCompensi && (
                      <div>
                        <Label className="text-sm text-gray-600">Piano Compensi</Label>
                        <p className="text-sm font-medium mt-1">{userData.pianoCompensi}</p>
                      </div>
                    )}

                    {userData.gestoriAssegnati && userData.gestoriAssegnati.length > 0 && (
                      <div>
                        <Label className="text-sm text-gray-600">Gestori Assegnati</Label>
                        <div className="mt-1 space-y-1">
                          {userData.gestoriAssegnati.slice(0, 3).map((gestore, index) => (
                            <Badge key={index} variant="outline" className="text-xs mr-1 mb-1">
                              {gestore}
                            </Badge>
                          ))}
                          {userData.gestoriAssegnati.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{userData.gestoriAssegnati.length - 3} altri
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {userData.master && userData.ruolo === 'consulente' && (
                      <div>
                        <Label className="text-sm text-gray-600">Master di Riferimento</Label>
                        <p className="text-sm font-medium mt-1">{userData.master}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Security Settings */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Sicurezza
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!showPasswordChange ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordChange(true)}
                      className="w-full rounded-2xl"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Cambia Password
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Password Attuale</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="rounded-2xl pr-10"
                            placeholder="Password attuale"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="newPassword">Nuova Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="rounded-2xl pr-10"
                            placeholder="Nuova password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Conferma Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="rounded-2xl pr-10"
                            placeholder="Conferma nuova password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handlePasswordChange}
                          disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          size="sm"
                          className="flex-1"
                          style={{ backgroundColor: '#F2C927', color: '#333333' }}
                        >
                          {isSaving ? 'Salvando...' : 'Aggiorna'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                          }}
                          disabled={isSaving}
                        >
                          Annulla
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
