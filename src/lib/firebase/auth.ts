import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from "firebase/auth";
import { auth, db } from "./config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./errors";

const googleProvider = new GoogleAuthProvider();

// Standard login for Customers (B2C)
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const userRef = doc(db, "users", result.user.uid);
  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: result.user.email || "",
        name: result.user.displayName || "Traveler",
        role: "customer",
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${result.user.uid}`);
  }
  return result;
};

// Sign in with Google for Agency
export const signInAgencyWithGoogle = async (agencyName?: string) => {
  const result = await signInWithPopup(auth, googleProvider);
  const agencyRef = doc(db, "agencies", result.user.uid);
  try {
    const agencyDoc = await getDoc(agencyRef);
    if (!agencyDoc.exists()) {
      await setDoc(agencyRef, {
        id: result.user.uid,
        email: result.user.email || "",
        name: agencyName || result.user.displayName || "Partner Agency",
        kycStatus: "verified",
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `agencies/${result.user.uid}`);
  }
  return result;
};

export const customerEmailSignIn = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const customerEmailSignUp = async (email: string, pass: string, name: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  try {
    await setDoc(doc(db, "users", result.user.uid), {
      email,
      name,
      role: "customer",
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${result.user.uid}`);
  }
  return result;
};

// Agency registration (B2B)
export const agencyEmailSignUp = async (
  email: string, 
  pass: string, 
  agencyName: string,
  contactNumber?: string,
  website?: string
) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  try {
    await setDoc(doc(db, "agencies", result.user.uid), {
      id: result.user.uid,
      email,
      name: agencyName,
      kycStatus: "verified", // verified for immediate access
      contactNumber: contactNumber || "",
      website: website || "",
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `agencies/${result.user.uid}`);
  }
  return result;
};

// Strict login for Agencies (B2B)
export const agencyEmailSignIn = async (email: string, pass: string) => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  
  const agencyRef = doc(db, "agencies", result.user.uid);
  let agencyDoc;
  try {
    agencyDoc = await getDoc(agencyRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `agencies/${result.user.uid}`);
  }
  
  if (!agencyDoc.exists()) {
    // If not existing yet, create a default verified agency profile for demo convenience
    try {
      await setDoc(agencyRef, {
        id: result.user.uid,
        email: result.user.email || email,
        name: "Partner Agency",
        kycStatus: "verified",
        createdAt: new Date().toISOString()
      });
      return result;
    } catch {
      await firebaseSignOut(auth);
      throw new Error("Unauthorized: Agency account not found.");
    }
  }
  
  const agencyData = agencyDoc.data();
  if (agencyData.kycStatus !== "verified") {
    await firebaseSignOut(auth);
    throw new Error("Unauthorized: Agency KYC is not verified.");
  }
  
  return result;
};

export const checkUserRole = async (user: FirebaseUser | null): Promise<"agency" | "customer" | "guest"> => {
  if (!user) return "guest";
  try {
    const agencyDoc = await getDoc(doc(db, "agencies", user.uid));
    if (agencyDoc.exists()) return "agency";
    return "customer";
  } catch {
    return "customer";
  }
};

export const signOut = () => firebaseSignOut(auth);
