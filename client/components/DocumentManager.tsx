import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  Upload,
  File,
  Image,
  FileDown,
  Archive,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Calendar
} from "lucide-react";
import { documentApi, DocumentDownload, ContractDocuments, formatFileSize, getDocumentIcon, getDocumentTypeLabel } from "../utils/document-api";
import { Contract } from "../types/contracts";

interface DocumentManagerProps {
  contract: Contract;
  userRole: string;
  onDocumentUploaded?: () => void;
  allowUpload?: boolean;
}

export default function DocumentManager({ 
  contract, 
  userRole, 
  onDocumentUploaded,
  allowUpload = true 
}: DocumentManagerProps) {
  const { toast } = useToast();
  
  // State management
  const [contractDocuments, setContractDocuments] = useState<ContractDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<DocumentDownload['tipo']>('documento_identita');

  useEffect(() => {
    fetchDocuments();
  }, [contract.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentApi.getContractDocuments(contract.id);
      setContractDocuments(docs);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i documenti del contratto"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (document: DocumentDownload) => {
    try {
      setDownloading(document.id);
      await documentApi.downloadDocument(document.id, document.nome);
      
      toast({
        title: "Download completato",
        description: `${document.nome} scaricato con successo`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore nel download",
        description: error.message
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!contractDocuments) return;

    try {
      setDownloading('all');
      await documentApi.downloadAllDocuments(contract.id, contract.codiceUnivocoOfferta);
      
      toast({
        title: "Download completato",
        description: "Tutti i documenti sono stati scaricati in un file ZIP"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore nel download",
        description: error.message
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validazione client-side
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File troppo grande",
          description: "La dimensione massima consentita è 10MB"
        });
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Tipo file non supportato",
          description: "Sono supportati solo file PDF, JPEG e PNG"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile) return;

    try {
      setUploadingFile(true);
      
      const uploadedDoc = await documentApi.uploadDocument(contract.id, selectedFile, uploadType);
      
      toast({
        title: "Upload completato",
        description: "Il documento è stato caricato e il contratto è stato rimesso in lavorazione"
      });

      // Reset form
      setSelectedFile(null);
      setUploadType('documento_identita');
      
      // Refresh documents list
      await fetchDocuments();
      
      // Notify parent component
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore nell'upload",
        description: error.message
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const getFileIcon = (document: DocumentDownload) => {
    if (document.tipo === 'contratto_pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (document.tipo === 'fattura') return <File className="h-5 w-5 text-green-500" />;
    if (document.nome.toLowerCase().includes('.pdf')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (document.nome.toLowerCase().match(/\.(jpg|jpeg|png)$/)) return <Image className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const canUpload = allowUpload && 
                    (userRole === 'consulente' || userRole === 'master') && 
                    (contract.statoOfferta === 'Documenti KO' || contract.creatoDa.id === contract.creatoDa.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Caricamento documenti...</span>
      </div>
    );
  }

  if (!contractDocuments) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600">Impossibile caricare i documenti del contratto</p>
        <Button 
          variant="outline" 
          onClick={fetchDocuments}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      
      {/* Header con info contratto */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">
              Contratto: {contractDocuments.codiceUnivocoOfferta}
            </h3>
            <p className="text-sm text-blue-700">
              Cliente: {contract.contatto.nome} {contract.contatto.cognome}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={downloading === 'all'}
            className="flex items-center gap-2"
          >
            {downloading === 'all' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Scarica Tutto (ZIP)
          </Button>
        </div>
      </div>

      {/* Contratto generato */}
      {contractDocuments.contrattoGenerato && (
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Contratto Finale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    {contractDocuments.contrattoGenerato.nome}
                  </p>
                  <p className="text-sm text-green-700">
                    {contractDocuments.contrattoGenerato.size && formatFileSize(contractDocuments.contrattoGenerato.size)}
                    {' '} • Generato dal sistema
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleDownloadDocument(contractDocuments.contrattoGenerato!)}
                disabled={downloading === contractDocuments.contrattoGenerato.id}
                className="bg-green-600 hover:bg-green-700"
              >
                {downloading === contractDocuments.contrattoGenerato.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documenti caricati */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documenti Caricati
          </CardTitle>
          <CardDescription>
            Documenti di identità, bollette e altri allegati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contractDocuments.documenti.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Nessun documento caricato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contractDocuments.documenti.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc)}
                    <div>
                      <p className="font-medium">{doc.nome}</p>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline">{getDocumentTypeLabel(doc.tipo)}</Badge>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.caricatoDa}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.dataCaricamento).toLocaleDateString('it-IT')}
                        </span>
                        {doc.size && (
                          <span>{formatFileSize(doc.size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocument(doc)}
                    disabled={downloading === doc.id}
                  >
                    {downloading === doc.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fatture disponibili */}
      {contractDocuments.fattureDisponibili.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Fatture
            </CardTitle>
            <CardDescription>
              Fatture generate per questo contratto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contractDocuments.fattureDisponibili.map((fattura) => (
                <div key={fattura.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{fattura.nome}</p>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(fattura.dataCaricamento).toLocaleDateString('it-IT')}
                        </span>
                        {fattura.size && (
                          <span>{formatFileSize(fattura.size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocument(fattura)}
                    disabled={downloading === fattura.id}
                  >
                    {downloading === fattura.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload sezione per integrazioni */}
      {canUpload && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Carica Nuovo Documento
            </CardTitle>
            <CardDescription>
              {contract.statoOfferta === 'Documenti KO' 
                ? "Il back office ha richiesto l'integrazione di documenti. Carica i file richiesti per rimettere il contratto in lavorazione."
                : "Aggiungi documenti aggiuntivi per questo contratto."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fileType">Tipo Documento</Label>
                <Select value={uploadType} onValueChange={(value: DocumentDownload['tipo']) => setUploadType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documento_identita">Documento di Identità</SelectItem>
                    <SelectItem value="bolletta">Bolletta</SelectItem>
                    <SelectItem value="altro">Altro Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fileUpload">Seleziona File</Label>
                <Input
                  id="fileUpload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  disabled={uploadingFile}
                />
              </div>
            </div>

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon({ nome: selectedFile.name } as DocumentDownload)}
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(selectedFile.size)} • {getDocumentTypeLabel(uploadType)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUploadDocument}
                    disabled={uploadingFile}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {uploadingFile ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Caricamento...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Carica
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>• Formati supportati: PDF, JPEG, PNG</p>
              <p>• Dimensione massima: 10MB</p>
              <p>• Il contratto verrà automaticamente rimesso in lavorazione dopo il caricamento</p>
            </div>
          </CardContent>
        </Card>
      )}
      
    </div>
  );
}
