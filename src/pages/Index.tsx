import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../client/firebase"; // ✅ percorso corretto

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("✔️ Verifica in corso...");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setMessage(`✅ Accesso effettuato come ${user.email}`);
    } catch (error: any) {
      console.error("❌ Errore Firebase:", error);
      setMessage("❌ Email o password errati.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "100px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#F2C927" }}>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", width: "300px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: "10px", padding: "10px" }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: "10px", padding: "10px" }}
          required
        />
        <button
          type="submit"
          style={{
            padding: "10px",
            backgroundColor: "#F2C927",
            color: "#000",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
          }}
        >
          Accedi
        </button>
      </form>
      <p style={{ marginTop: "20px", color: "red" }}>{message}</p>
    </div>
  );
};

export default Index;