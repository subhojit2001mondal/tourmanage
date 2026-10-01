import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from "firebase/auth";
import { auth, db } from "./config";
import { doc, getDoc, setDoc } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();

// Standard login for Customers (B2C)
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  // Ensure user document exists
  const userRef = doc(db, "users", result.user.uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      email: result.user.email,
      name: result.user.displayName,
      role: "customer",
      createdAt: new Date().toISOString()
    });
  }
  return result;
};

export const customerEmailSignIn = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const customerEmailSignUp = async (email: string, pass: string, name: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  await setDoc(doc(db, "users", result.user.uid), {
    email,
    name,
    role: "customer",
    createdAt: new Date().toISOString()
  });
  return result;
};

// Strict, secure login for Agencies (B2B)
export const agencyEmailSignIn = async (email: string, pass: string) => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  
  // Verify that the user is an agency and KYC is verified
  const agencyRef = doc(db, "agencies", result.user.uid);
  const agencyDoc = await getDoc(agencyRef);
  
  if (!agencyDoc.exists()) {
    await firebaseSignOut(auth);
    throw new Error("Unauthorized: Agency account not found.");
  }
  
  const agencyData = agencyDoc.data();
  if (agencyData.kycStatus !== "verified") {
    await firebaseSignOut(auth);
    throw new Error("Unauthorized: Agency KYC is not verified.");
  }
  
  return result;
};

export const signOut = () => firebaseSignOut(auth);
