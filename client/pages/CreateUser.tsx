import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../client/firebase";
import { useNavigate } from "react-router-dom";

export default function CreateUser() {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"consulente" | "admin">("consulente");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Creazione in corso...");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 🔴 PRIMA: doc(db, "users", user.uid)
      // 🟢 ORA:   doc(db, "utenti", user.uid)
      await setDoc(doc(db, "utenti", user.uid), {
        nome,
        cognome,
        fullName: `${nome} ${cognome}`.trim(),
        email: user.email || email,
        ruolo: role,          // campo corretto che AppLayout si aspetta
        attivo: true,
        createdAt: new Date().toISOString(), // semplice timestamp senza nuove import
      });

      setMessage("✅ Utente creato con successo!");
    } catch (error: any) {
      console.error("Errore:", error);
      setMessage("❌ Errore nella creazione dell’utente.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <h1 className="text-3xl font-bold mb-6 text-fuchsia-800">Crea nuovo utente</h1>
      <form onSubmit={handleCreate} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        {/* Nome e Cognome aggiunti */}
        <label className="block mb-2 font-semibold">Nome:</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full mb-4 p-3 border border-gray-300 rounded-lg"
          required
        />

        <label className="block mb-2 font-semibold">Cognome:</label>
        <input
          type="text"
          value={cognome}
          onChange={(e) => setCognome(e.target.value)}
          className="w-full mb-4 p-3 border border-gray-300 rounded-lg"
          required
        />

        <label className="block mb-2 font-semibold">Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 border border-gray-300 rounded-lg"
          required
        />

        <label className="block mb-2 font-semibold">Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-3 border border-gray-300 rounded-lg"
          required
        />

        <label className="block mb-2 font-semibold">Ruolo:</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "consulente" | "admin")}
          className="w-full mb-4 p-3 border border-gray-300 rounded-lg"
        >
          <option value="consulente">Consulente</option>
          <option value="admin">Amministratore</option>
        </select>

        <button
          type="submit"
          className="w-full bg-fuchsia-700 text-white font-bold py-3 rounded-lg hover:bg-fuchsia-800 transition"
        >
          Crea utente
        </button>

        {message && <p className="text-center text-sm text-red-600 mt-4">{message}</p>}
      </form>
    </div>
  );
}