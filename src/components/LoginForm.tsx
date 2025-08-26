import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth, db } from "../../client/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("login_email");
    const savedRemember = localStorage.getItem("login_remember") === "true";
    if (savedEmail) setEmail(savedEmail);
    if (savedRemember) setRememberMe(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Verifica in corso...");

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔍 Usa la collezione corretta: "utenti"
      const userDoc = await getDoc(doc(db, "utenti", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.ruolo?.toLowerCase() || "consulente";

        // Handle both possible field name formats (Nome/Cognome vs nome/cognome)
        const nome = userData.nome || userData.Nome || "";
        const cognome = userData.cognome || userData.Cognome || "";
        const fullName = `${nome} ${cognome}`.trim() || "Utente";

        // ✅ Salva TUTTI i dati necessari in localStorage
        localStorage.setItem("uid", user.uid);
        localStorage.setItem("userName", fullName);
        localStorage.setItem("userRole", role);
        localStorage.setItem("userEmail", user.email || "");

        console.log('✅ Login: Saved to localStorage:', {
          uid: user.uid,
          userName: fullName,
          userRole: role,
          userEmail: user.email
        });

        if (rememberMe) {
          localStorage.setItem("login_email", email);
          localStorage.setItem("login_remember", "true");
        } else {
          localStorage.removeItem("login_email");
          localStorage.setItem("login_remember", "false");
        }

        setMessage(`✅ Accesso effettuato come ${user.email}`);

        // Test localStorage data immediately
        setTimeout(() => {
          console.log('🧪 Test: localStorage after login:', {
            uid: localStorage.getItem('uid'),
            userName: localStorage.getItem('userName'),
            userRole: localStorage.getItem('userRole'),
            userEmail: localStorage.getItem('userEmail')
          });
        }, 500);

        setTimeout(() => {
          if (role === "admin") {
            navigate("/admin-dashboard");
          } else {
            navigate("/dashboard");
          }
        }, 1000);
      } else {
        throw new Error("Utente non trovato nel database.");
      }
    } catch (error: any) {
      console.error("❌ Errore Firebase:", error);
      setMessage("❌ Email o password errati.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2C927] px-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold text-[#D1009C] drop-shadow-lg">
          🔌 SempliSwitch
        </h1>
        <p className="text-[#D1009C] mt-2 text-sm font-medium">
          La tua gestione smart di luce, gas e telefonia.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm"
      >
        <label className="block mb-1 font-bold text-gray-700">Nome utente</label>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#D1009C]"
          required
        />

        <label className="block mb-1 font-bold text-gray-700">Password</label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#D1009C]"
          required
        />

        <div className="w-full mb-4 flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            name="rememberMe"
            className="mr-2"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label htmlFor="rememberMe" className="text-gray-700 font-bold">Ricordami</label>
        </div>

        <button
          type="submit"
          className="w-full bg-[#D1009C] hover:bg-pink-800 text-white font-bold py-3 rounded-lg transition duration-200"
        >
          Accedi
        </button>
        {message && (
          <p className="text-center text-sm text-red-600 mt-4">{message}</p>
        )}
      </form>
    </div>
  );
};

export default LoginForm;
