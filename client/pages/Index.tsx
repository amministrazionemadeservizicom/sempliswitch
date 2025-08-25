import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // <-- corretto: file firebase.ts è in client/

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Verifica in corso...");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setMessage(`✅ Accesso effettuato come ${user.email}`);
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error("❌ Errore Firebase:", error);
      setMessage("❌ Email o password errati.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300">
      <h1 className="text-3xl font-bold mb-1">Sempliswitch</h1>
      <p className="text-sm text-gray-600 mb-6">Gestione pratiche luce, gas e telefonia</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-2 rounded"
        >
          Accedi
        </button>
        {message && <p className="text-center text-sm text-red-600 mt-2">{message}</p>}
      </form>

      <div className="mt-6 flex space-x-4 text-xl">
        <span>🔌 Luce</span>
        <span>🔥 Gas</span>
        <span>📞 Telefonia</span>
      </div>
    </div>
  );
};

export default Index;