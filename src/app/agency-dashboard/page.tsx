"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase/config";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Package, Agency } from "@/types/schema";
import { handleFirestoreError, OperationType } from "@/lib/firebase/errors";
import { signOut } from "@/lib/firebase/auth";
import Link from "next/link";
import { 
  PlaneTakeoff, 
  Plus, 
  MapPin, 
  CalendarDays, 
  DollarSign, 
  Trash2, 
  BadgeCheck, 
  Utensils, 
  Hotel,
  LogOut,
  Layers,
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default function AgencyDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch or initialize agency doc
        try {
          const agencyRef = doc(db, "agencies", currentUser.uid);
          const snap = await getDoc(agencyRef);
          if (snap.exists()) {
            setAgency(snap.data() as Agency);
          } else {
            const defaultAgency: Agency = {
              id: currentUser.uid,
              email: currentUser.email || "",
              name: currentUser.displayName || "Partner Agency",
              kycStatus: "verified",
              createdAt: new Date().toISOString(),
            };
            await setDoc(agencyRef, defaultAgency);
            setAgency(defaultAgency);
          }
        } catch (err) {
          console.error("Failed to load agency:", err);
        }
      } else {
        router.push("/");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "packages"),
      where("agencyId", "==", user.uid)
    );

    const unsubscribeDocs = onSnapshot(
      q,
      (snapshot) => {
        const pkgs: Package[] = [];
        snapshot.forEach((d) => {
          pkgs.push({ id: d.id, ...d.data() } as Package);
        });
        setPackages(pkgs);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "packages");
      }
    );

    return () => unsubscribeDocs();
  }, [user]);

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      await deleteDoc(doc(db, "packages", packageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `packages/${packageId}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const avgPrice = packages.length
    ? Math.round(packages.reduce((sum, p) => sum + (p.price || 0), 0) / packages.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <PlaneTakeoff className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900">TourMatch</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                Agency Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{agency?.name || user?.email}</span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <BadgeCheck className="w-3.5 h-3.5" /> Verified
              </span>
            </div>

            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
            >
              Public View
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Banner with metrics */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome, {agency?.name || "Agency Partner"}
            </h1>
            <p className="text-slate-600 mt-1">
              Manage your published tour packages and monitor competitive market insights.
            </p>
          </div>

          <Link
            href="/agency-dashboard/create"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Create New Package
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-500">Active Packages</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{packages.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-500">Average Price</p>
              <p className="text-3xl font-black text-slate-900 mt-1">${avgPrice}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-500">KYC Status</p>
              <p className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                <BadgeCheck className="w-6 h-6" />
                Verified
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Package Catalog */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your Tour Packages</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {packages.length === 0
                  ? "No packages published yet."
                  : `Showing ${packages.length} travel package${packages.length > 1 ? "s" : ""}.`}
              </p>
            </div>

            {packages.length > 0 && (
              <Link
                href="/agency-dashboard/create"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                + Add Another <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              Loading your packages...
            </div>
          ) : packages.length === 0 ? (
            <div className="py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <PlaneTakeoff className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No packages yet</h3>
              <p className="text-slate-600 max-w-md mx-auto mt-2 text-sm">
                Get started by creating your first travel package using our step-by-step wizard with live market pricing insights.
              </p>
              <Link
                href="/agency-dashboard/create"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Create Tour Package
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                          <MapPin className="w-3 h-3" /> {pkg.destination}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                        title="Delete package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-bold text-lg text-slate-900 leading-snug line-clamp-2 mb-2">
                      {pkg.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-600 mb-4">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        {pkg.duration} Days
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <DollarSign className="w-3.5 h-3.5" />
                        {pkg.price} / person
                      </span>
                    </div>

                    {/* Inclusions summary */}
                    <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 text-xs">
                      {pkg.includedItems?.flights && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                          <PlaneTakeoff className="w-3 h-3" /> Flights
                        </span>
                      )}
                      {pkg.includedItems?.meals && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                          <Utensils className="w-3 h-3" /> Meals
                        </span>
                      )}
                      {pkg.includedItems?.hotels && pkg.includedItems.hotels !== "none" && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                          <Hotel className="w-3 h-3" /> {pkg.includedItems.hotels}
                        </span>
                      )}
                    </div>

                    {/* Itinerary highlights */}
                    {pkg.itinerary && pkg.itinerary.length > 0 && (
                      <div className="mt-3 text-xs text-slate-500 line-clamp-2">
                        {pkg.itinerary.filter(Boolean).slice(0, 2).map((item, i) => (
                          <p key={i} className="truncate">• {item}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Created: {new Date(pkg.createdAt).toLocaleDateString()}</span>
                    <span className="font-semibold text-blue-600">Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
