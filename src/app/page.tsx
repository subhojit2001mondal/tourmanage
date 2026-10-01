"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase/config";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  signInWithGoogle, 
  signInAgencyWithGoogle, 
  customerEmailSignIn, 
  customerEmailSignUp, 
  agencyEmailSignIn,
  agencyEmailSignUp,
  signOut,
  checkUserRole 
} from "@/lib/firebase/auth";
import { handleFirestoreError, OperationType } from "@/lib/firebase/errors";
import { Package } from "@/types/schema";
import Link from "next/link";
import { 
  PlaneTakeoff, 
  MapPin, 
  Utensils, 
  Hotel, 
  Search, 
  ShieldCheck, 
  LogOut, 
  Building2, 
  X,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"agency" | "customer" | "guest">("guest");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHotel, setSelectedHotel] = useState<string>("all");
  const [filterFlights, setFilterFlights] = useState(false);
  const [filterMeals, setFilterMeals] = useState(false);

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"customer-login" | "customer-signup" | "agency-login" | "agency-signup">("customer-login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Package detail preview modal
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const role = await checkUserRole(currentUser);
        setUserRole(role);
      } else {
        setUserRole("guest");
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Listen to all travel packages
    const q = query(collection(db, "packages"), orderBy("createdAt", "desc"));
    const unsubscribePackages = onSnapshot(
      q,
      (snapshot) => {
        const list: Package[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Package);
        });
        setPackages(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore packages listener error:", error);
        handleFirestoreError(error, OperationType.LIST, "packages");
      }
    );
    return () => unsubscribePackages();
  }, []);

  const handleGoogleSignIn = async (asAgency: boolean) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      if (asAgency) {
        await signInAgencyWithGoogle(authName || "Partner Agency");
      } else {
        await signInWithGoogle();
      }
      setAuthModalOpen(false);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Google authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "customer-login") {
        await customerEmailSignIn(authEmail, authPassword);
      } else if (authMode === "customer-signup") {
        await customerEmailSignUp(authEmail, authPassword, authName || "Traveler");
      } else if (authMode === "agency-login") {
        await agencyEmailSignIn(authEmail, authPassword);
      } else if (authMode === "agency-signup") {
        await agencyEmailSignUp(authEmail, authPassword, authName || "Agency Partner");
      }
      setAuthModalOpen(false);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch =
      (pkg.destination || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHotel =
      selectedHotel === "all" || pkg.includedItems?.hotels === selectedHotel;
    const matchesFlights = !filterFlights || pkg.includedItems?.flights;
    const matchesMeals = !filterMeals || pkg.includedItems?.meals;
    return matchesSearch && matchesHotel && matchesFlights && matchesMeals;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <PlaneTakeoff className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                TourMatch<span className="text-blue-600">.</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/agency-dashboard"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200"
                >
                  <Building2 className="w-4 h-4" />
                  Agency Dashboard
                </Link>

                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {user.displayName || user.email?.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">
                    {userRole === "agency" ? "Agency Member" : "Customer"}
                  </span>
                </div>

                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode("customer-login");
                    setAuthModalOpen(true);
                  }}
                  className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 sm:px-4 py-2 rounded-xl hover:bg-slate-100 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode("agency-signup");
                    setAuthModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-xs transition transform hover:-translate-y-0.5"
                >
                  <Building2 className="w-4 h-4" />
                  Agency Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 via-blue-950 to-slate-900 text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-200 mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            Verified Travel Agencies & Real-time Market Rates
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Curated Tour Packages, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200">
              Priced Transparently.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Browse verified itineraries crafted directly by experienced travel agencies. Compare inclusions, hotels, and prices with zero hidden fees.
          </p>

          {/* Quick Search Card */}
          <div className="mt-8 bg-white rounded-2xl p-3 shadow-xl border border-white/20 text-slate-900 flex flex-col md:flex-row gap-3 items-center">
            <div className="flex-1 flex items-center gap-3 px-3 py-2 w-full">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destination, city, or package title..."
                className="w-full text-sm outline-none text-slate-800 placeholder-slate-400 bg-transparent font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-3">
              <select
                value={selectedHotel}
                onChange={(e) => setSelectedHotel(e.target.value)}
                className="text-xs font-medium bg-slate-100 rounded-xl px-3 py-2.5 outline-none text-slate-700"
              >
                <option value="all">Any Hotel</option>
                <option value="3-star">3-Star</option>
                <option value="4-star">4-Star</option>
                <option value="5-star">5-Star</option>
              </select>

              <button
                onClick={() => setFilterFlights(!filterFlights)}
                className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition flex items-center gap-1 ${
                  filterFlights
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <PlaneTakeoff className="w-3.5 h-3.5" />
                Flights
              </button>

              <button
                onClick={() => setFilterMeals(!filterMeals)}
                className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition flex items-center gap-1 ${
                  filterMeals
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                Meals
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Featured Packages</h2>
            <p className="text-sm text-slate-500 mt-1">
              {loading
                ? "Connecting to live catalog..."
                : `Showing ${filteredPackages.length} package${filteredPackages.length === 1 ? "" : "s"} available for booking`}
            </p>
          </div>

          <Link
            href="/agency-dashboard/create"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 hover:bg-blue-100 transition"
          >
            Are you an agency? Publish Package <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-24 text-center text-slate-500">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-medium">Loading live travel packages...</p>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No packages found</h3>
            <p className="text-slate-600 text-sm mt-2">
              {searchQuery
                ? `No travel packages matched "${searchQuery}". Try clearing search filters.`
                : "No tour packages have been published yet. Be the first agency to publish a tour package!"}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              )}
              <Link
                href="/agency-dashboard/create"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
              >
                Create Travel Package
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header Banner */}
                  <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                        <MapPin className="w-3 h-3 text-blue-300" />
                        {pkg.destination}
                      </span>
                      <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                        {pkg.duration} Days
                      </span>
                    </div>

                    <h3 className="font-bold text-xl leading-snug tracking-tight text-white group-hover:text-blue-200 transition">
                      {pkg.title}
                    </h3>
                  </div>

                  {/* Details Body */}
                  <div className="p-6">
                    {/* Price and Badge */}
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <span className="text-xs text-slate-500">Starting from</span>
                        <div className="text-2xl font-black text-slate-900">
                          ${pkg.price}
                          <span className="text-xs font-medium text-slate-500 ml-1">/ person</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Rate
                      </div>
                    </div>

                    {/* Inclusions */}
                    <div className="space-y-2 border-t border-slate-100 pt-4 mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Package Inclusions</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`flex items-center gap-2 p-2 rounded-xl ${pkg.includedItems?.flights ? 'bg-blue-50 text-blue-800' : 'bg-slate-50 text-slate-400'}`}>
                          <PlaneTakeoff className="w-4 h-4 shrink-0" />
                          <span>{pkg.includedItems?.flights ? 'Round-trip Flights' : 'No Flights'}</span>
                        </div>
                        <div className={`flex items-center gap-2 p-2 rounded-xl ${pkg.includedItems?.meals ? 'bg-blue-50 text-blue-800' : 'bg-slate-50 text-slate-400'}`}>
                          <Utensils className="w-4 h-4 shrink-0" />
                          <span>{pkg.includedItems?.meals ? 'Meals Included' : 'No Meals'}</span>
                        </div>
                      </div>
                      {pkg.includedItems?.hotels && pkg.includedItems.hotels !== 'none' && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-medium">
                          <Hotel className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>{pkg.includedItems.hotels} Accommodation</span>
                        </div>
                      )}
                    </div>

                    {/* Itinerary Snippet */}
                    {pkg.itinerary && pkg.itinerary.length > 0 && (
                      <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <span className="font-semibold text-slate-700 block mb-1">Itinerary Highlights:</span>
                        <p className="line-clamp-2 italic text-slate-500">
                          {pkg.itinerary.filter(Boolean).slice(0, 2).join(" • ")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setBookingSuccess(false);
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center justify-center gap-2 group-hover:bg-blue-600"
                  >
                    View Details & Inquire <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Package Detail Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedPackage(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-2">
              <MapPin className="w-4 h-4" /> {selectedPackage.destination}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {selectedPackage.title}
            </h2>

            <div className="flex items-center gap-4 mt-3 pb-6 border-b border-slate-100">
              <div className="text-2xl font-black text-blue-600">
                ${selectedPackage.price}
                <span className="text-xs font-medium text-slate-500 ml-1">/ person</span>
              </div>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                {selectedPackage.duration} Days
              </span>
            </div>

            {/* Inclusions summary */}
            <div className="py-6 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 mb-3">Included in this trip</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold block text-slate-700">Flight</span>
                  <span className="text-slate-500">{selectedPackage.includedItems?.flights ? "Roundtrip Included" : "Not Included"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold block text-slate-700">Meals</span>
                  <span className="text-slate-500">{selectedPackage.includedItems?.meals ? "Daily Meals Included" : "Self-sponsored"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold block text-slate-700">Hotel</span>
                  <span className="text-slate-500">{selectedPackage.includedItems?.hotels || "Standard"}</span>
                </div>
              </div>
            </div>

            {/* Daily Itinerary */}
            <div className="py-6">
              <h3 className="font-bold text-sm text-slate-900 mb-4">Day-by-Day Schedule</h3>
              <div className="space-y-4">
                {selectedPackage.itinerary?.map((day, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-700 flex-1 border border-slate-100">
                      <span className="font-bold block text-slate-900 mb-1">Day {idx + 1}</span>
                      <p>{day || "Activities and sightseeing scheduled for this day."}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inquire Action */}
            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
              {bookingSuccess ? (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-center text-sm font-semibold border border-emerald-200">
                  Inquiry submitted! The partner agency will contact you shortly.
                </div>
              ) : (
                <button
                  onClick={() => setBookingSuccess(true)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition"
                >
                  Send Booking Inquiry to Agency
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => {
                setAuthModalOpen(false);
                setAuthError("");
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <PlaneTakeoff className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                {authMode === "customer-login" && "Traveler Sign In"}
                {authMode === "customer-signup" && "Create Traveler Account"}
                {authMode === "agency-login" && "Agency Partner Sign In"}
                {authMode === "agency-signup" && "Register Travel Agency"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {authMode.includes("agency")
                  ? "Access agency tools and market pricing insights"
                  : "Discover and book your next vacation package"}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                {authError}
              </div>
            )}

            {/* Google Fast Sign In */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn(authMode.includes("agency"))}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 transition mb-4 shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase">Or with email</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
              {(authMode === "customer-signup" || authMode === "agency-signup") && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {authMode === "agency-signup" ? "Agency / Business Name" : "Your Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder={authMode === "agency-signup" ? "e.g. Horizon Expeditions" : "e.g. Jane Doe"}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs mt-2"
              >
                {authLoading ? "Processing..." : "Continue"}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-5 text-center text-xs text-slate-500 space-y-2">
              {authMode === "customer-login" && (
                <>
                  <p>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("customer-signup")}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Sign Up
                    </button>
                  </p>
                  <p>
                    Are you a travel agency?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("agency-login")}
                      className="text-slate-800 font-bold hover:underline"
                    >
                      Agency Sign In
                    </button>
                  </p>
                </>
              )}

              {authMode === "customer-signup" && (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("customer-login")}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}

              {authMode === "agency-login" && (
                <>
                  <p>
                    Need an agency partner account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("agency-signup")}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Register Agency
                    </button>
                  </p>
                  <p>
                    Looking to book a trip?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("customer-login")}
                      className="text-slate-800 font-bold hover:underline"
                    >
                      Traveler Login
                    </button>
                  </p>
                </>
              )}

              {authMode === "agency-signup" && (
                <p>
                  Already an agency partner?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("agency-login")}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Agency Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <PlaneTakeoff className="w-4 h-4 text-blue-600" />
            TourMatch Platform
          </div>
          <div>
            Powered by Firebase Firestore & Authentication in real-time.
          </div>
        </div>
      </footer>
    </div>
  );
}
