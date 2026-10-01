"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase/config";
import { collection, addDoc, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Package } from "@/types/schema";
import { handleFirestoreError, OperationType } from "@/lib/firebase/errors";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  CalendarDays, 
  PlaneTakeoff, 
  Utensils, 
  Hotel, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  BadgeCheck
} from "lucide-react";
import Image from "next/image";

export default function CreatePackageWizard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState<number | "">("");
  const [itinerary, setItinerary] = useState<string[]>([""]);
  const [includedItems, setIncludedItems] = useState<{
    flights: boolean;
    meals: boolean;
    hotels: "3-star" | "4-star" | "5-star" | "none";
  }>({
    flights: false,
    meals: false,
    hotels: "none",
  });
  const [price, setPrice] = useState<number | "">("");

  // Competitor Insight State
  const [averagePrice, setAveragePrice] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (step === 4 && destination) {
      const fetchCompetitorData = async () => {
        try {
          const q = query(
            collection(db, "packages"),
            where("destination", "==", destination)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            let total = 0;
            snapshot.forEach((doc) => {
              total += doc.data().price || 0;
            });
            setAveragePrice(total / snapshot.size);
          } else {
            setAveragePrice(null);
          }
        } catch (err) {
          console.error("Failed to fetch competitor data:", err);
        }
      };
      fetchCompetitorData();
    }
  }, [step, destination]);

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const addItineraryDay = () => setItinerary([...itinerary, ""]);
  const removeItineraryDay = (index: number) => {
    const newItinerary = [...itinerary];
    newItinerary.splice(index, 1);
    setItinerary(newItinerary);
  };
  const updateItineraryDay = (index: number, value: string) => {
    const newItinerary = [...itinerary];
    newItinerary[index] = value;
    setItinerary(newItinerary);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Ensure agency profile exists
      const agencyRef = doc(db, "agencies", user.uid);
      const agencySnap = await getDoc(agencyRef);
      if (!agencySnap.exists()) {
        await setDoc(agencyRef, {
          id: user.uid,
          email: user.email || "",
          name: user.displayName || "Agency Partner",
          kycStatus: "verified",
          createdAt: new Date().toISOString(),
        });
      }

      const newPackage: Omit<Package, "id"> = {
        agencyId: user.uid,
        title,
        destination,
        duration: Number(duration),
        price: Number(price),
        itinerary,
        includedItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "packages"), newPackage);
      alert("Package created successfully!");
      router.push("/agency-dashboard");
    } catch (error) {
      console.error("Error creating package: ", error);
      handleFirestoreError(error, OperationType.CREATE, "packages");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    "Basic Details",
    "Itinerary Builder",
    "Inclusions",
    "Pricing & Publish",
  ];

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Banner Section */}
      <div className="hidden lg:flex lg:w-1/3 relative flex-col justify-between p-12 text-white overflow-hidden">
        <Image
          src="/luxury-bg.jpg"
          alt="Luxury Resort"
          fill
          className="object-cover z-0"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 z-10" />
        
        <div className="relative z-20">
          <div className="flex items-center space-x-2 mb-16">
            <PlaneTakeoff className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold tracking-tight">TourMatch<span className="text-blue-400">.</span></span>
          </div>
          
          <h1 className="text-4xl font-semibold leading-tight mb-6">
            Craft Extraordinary Experiences.
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed max-w-md">
            Build competitive travel packages with real-time market insights. High-quality offerings attract more clients.
          </p>
        </div>

        <div className="relative z-20">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="font-medium text-white mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-400" /> Market Insight
            </h3>
            <p className="text-sm text-gray-300">
              Packages priced within 10% of the market average have a 3x higher conversion rate.
            </p>
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-2/3 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 max-w-3xl w-full mx-auto p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          
          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{stepTitles[step - 1]}</h2>
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Step {step} of 4
              </span>
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                    step >= i ? "bg-blue-600" : "bg-gray-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full"
              >
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Package Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Majestic Maldives Getaway"
                        className="w-full border border-gray-200 bg-gray-50 rounded-xl p-4 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" /> Core Destination
                        </label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="e.g. Maldives"
                          className="w-full border border-gray-200 bg-gray-50 rounded-xl p-4 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <CalendarDays className="w-4 h-4 mr-2 text-gray-400" /> Duration (Days)
                        </label>
                        <input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          placeholder="e.g. 5"
                          min="1"
                          className="w-full border border-gray-200 bg-gray-50 rounded-xl p-4 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    {itinerary.map((dayDesc, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={index} 
                        className="flex flex-col space-y-3 p-5 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <label className="flex items-center text-sm font-bold text-gray-800">
                            <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full mr-3 text-xs">
                              {index + 1}
                            </span>
                            Day {index + 1}
                          </label>
                          {itinerary.length > 1 && (
                            <button
                              onClick={() => removeItineraryDay(index)}
                              className="text-gray-400 hover:text-red-500 text-sm font-medium transition"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <textarea
                          value={dayDesc}
                          onChange={(e) => updateItineraryDay(index, e.target.value)}
                          placeholder={`Describe the activities, locations, and highlights for Day ${index + 1}...`}
                          className="w-full border-none bg-white rounded-xl p-4 text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
                          rows={3}
                        />
                      </motion.div>
                    ))}
                    <button
                      onClick={addItineraryDay}
                      className="w-full border-2 border-dashed border-gray-200 text-gray-500 font-medium rounded-2xl p-4 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                    >
                      + Add Another Day
                    </button>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label 
                        className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          includedItems.flights ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={includedItems.flights}
                          onChange={(e) => setIncludedItems({ ...includedItems, flights: e.target.checked })}
                          className="hidden"
                        />
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-4 ${
                          includedItems.flights ? 'bg-blue-600 text-white' : 'bg-gray-200'
                        }`}>
                          {includedItems.flights && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center">
                            <PlaneTakeoff className="w-4 h-4 mr-2" /> Flights Included
                          </p>
                          <p className="text-sm text-gray-500 mt-1">Round-trip airfare is covered</p>
                        </div>
                      </label>

                      <label 
                        className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          includedItems.meals ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={includedItems.meals}
                          onChange={(e) => setIncludedItems({ ...includedItems, meals: e.target.checked })}
                          className="hidden"
                        />
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-4 ${
                          includedItems.meals ? 'bg-blue-600 text-white' : 'bg-gray-200'
                        }`}>
                          {includedItems.meals && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center">
                            <Utensils className="w-4 h-4 mr-2" /> Meals Included
                          </p>
                          <p className="text-sm text-gray-500 mt-1">Breakfast, lunch, and dinner</p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                        <Hotel className="w-4 h-4 mr-2" /> Hotel Category
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {["none", "3-star", "4-star", "5-star"].map((rating) => (
                          <button
                            key={rating}
                            onClick={() =>
                              setIncludedItems({
                                ...includedItems,
                                hotels: rating as "3-star" | "4-star" | "5-star" | "none",
                              })
                            }
                            className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                              includedItems.hotels === rating
                                ? "border-blue-600 bg-blue-600 text-white shadow-md"
                                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {rating === "none" ? "Not Included" : rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <DollarSign className="w-4 h-4 mr-1 text-gray-400" /> Package Price (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-bold">$</span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full border-2 border-gray-200 bg-white rounded-2xl py-5 pl-12 pr-6 text-3xl font-bold text-gray-900 focus:ring-0 focus:border-blue-500 transition-all outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Competitor Insight Widget */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-blue-100/50 shadow-inner">
                      <h3 className="text-sm font-bold tracking-wide text-indigo-900 uppercase mb-4 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" /> Live Market Insight
                      </h3>
                      
                      {averagePrice !== null ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-indigo-700/80 text-sm font-medium">Average for {destination}</p>
                              <p className="text-3xl font-bold text-indigo-900 mt-1">${Math.round(averagePrice)}</p>
                            </div>
                          </div>
                          
                          <div className="h-px w-full bg-indigo-100 my-4" />

                          {price && price > averagePrice * 1.15 && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-orange-100/80 border border-orange-200 text-orange-800 rounded-xl flex items-start">
                              <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <strong className="block mb-1">Premium Pricing Detected</strong>
                                Your price is +{Math.round(((price / averagePrice) - 1) * 100)}% above average. Ensure your itinerary details reflect the premium value to convert leads!
                              </div>
                            </motion.div>
                          )}
                          
                          {price && price < averagePrice * 0.85 && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-xl flex items-start">
                              <BadgeCheck className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <strong className="block mb-1">Highly Competitive</strong>
                                Your price is {Math.round((1 - (price / averagePrice)) * 100)}% below average. This is highly attractive for volume bookings.
                              </div>
                            </motion.div>
                          )}
                          
                          {price && price >= averagePrice * 0.85 && price <= averagePrice * 1.15 && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-blue-100/80 border border-blue-200 text-blue-800 rounded-xl flex items-start">
                              <CheckCircle2 className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <strong className="block mb-1">Sweet Spot</strong>
                                You are priced right at the market average. This is the optimal range for steady bookings.
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-indigo-400 text-sm mb-2">Analyzing market data...</p>
                          <p className="text-indigo-900 font-medium">
                            {destination ? `No packages found for ${destination} yet.` : "Enter a destination first to see insights."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all ${
                step === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Back
            </button>
            
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex items-center px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Next <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !title || !destination || !price}
                className={`flex items-center px-10 py-3 rounded-xl font-bold text-white shadow-md transition-all ${
                  isSubmitting || !title || !destination || !price
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"
                }`}
              >
                {isSubmitting ? "Publishing..." : "Publish Package"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
