import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";

export async function testFirebaseConnection() {
  console.log("🔥 Testing Firebase connection...");
  
  try {
    // Test 1: Check if db exists
    if (!db) {
      throw new Error("Database non inizializzato");
    }
    console.log("✅ Database object exists");

    // Test 2: Try to read from contratti collection
    console.log("📡 Testing read access to 'contratti' collection...");
    const querySnapshot = await getDocs(collection(db, "contratti"));
    console.log(`✅ Read access successful. Found ${querySnapshot.size} documents`);

    // Test 3: Try to create a test document
    console.log("📝 Testing write access...");
    const testDoc = {
      test: true,
      timestamp: new Date().toISOString(),
      message: "Firebase connection test"
    };
    
    const docRef = await addDoc(collection(db, "test-connection"), testDoc);
    console.log("✅ Write access successful. Test document ID:", docRef.id);

    return {
      success: true,
      readAccess: true,
      writeAccess: true,
      documentsCount: querySnapshot.size
    };

  } catch (error: any) {
    console.error("❌ Firebase connection test failed:", error);
    
    // Parse common Firebase errors
    let errorMessage = error.message;
    if (error.code === 'permission-denied') {
      errorMessage = "Accesso negato - controlla le regole di sicurezza Firestore";
    } else if (error.code === 'unauthenticated') {
      errorMessage = "Utente non autenticato";
    }

    return {
      success: false,
      error: errorMessage,
      code: error.code
    };
  }
}
