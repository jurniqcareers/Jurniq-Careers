
import React, { useState, useEffect, useRef } from 'react';
import { getAcademyFees } from '../services/geminiService';

interface FeeStructureProps {
  onBack: () => void;
}

declare global {
    interface Window {
        google: any;
    }
}

const FeeStructure: React.FC<FeeStructureProps> = ({ onBack }) => {
  const [view, setView] = useState<'choice' | 'search' | 'details'>('choice');
  const [searchType, setSearchType] = useState<'school' | 'college'>('school');
  const [results, setResults] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeData, setFeeData] = useState<any>(null);

  const placesService = useRef<any>(null);

  useEffect(() => {
      const initMaps = () => {
          if (!window.google) {
              const script = document.createElement('script');
              const apiKey = "AIzaSyAs4buHwRCVk6i6FdDKvo_T09Ayp7TrEig"; 
              script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
              script.async = true;
              script.defer = true;
              script.onload = () => {
                  if (window.google && !placesService.current) {
                      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
                  }
              };
              document.head.appendChild(script);
          } else {
              if (window.google && !placesService.current) {
                  placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
              }
          }
      };
      initMaps();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (!placesService.current) { alert("Maps service not ready."); return; }
      
      const form = e.target as HTMLFormElement;
      const name = (form.elements.namedItem('searchName') as HTMLInputElement).value;
      const location = (form.elements.namedItem('searchLocation') as HTMLInputElement).value;
      
      setLoading(true);
      const typeQuery = searchType === 'college' ? 'university' : 'school';
      const query = `${typeQuery} ${name} in ${location}`;

      placesService.current.textSearch({ query, fields: ['name', 'formatted_address', 'place_id'] }, (res: any[], status: any) => {
          setLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              setResults(res);
          } else {
              setResults([]);
          }
      });
  };

  const handleDetails = (placeId: string) => {
      if (!placesService.current) return;
      setLoading(true);
      
      placesService.current.getDetails({
          placeId,
          fields: ['place_id', 'name', 'formatted_address', 'international_phone_number', 'website', 'rating', 'user_ratings_total', 'photos', 'reviews', 'business_status']
      }, (place: any, status: any) => {
          setLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              setSelectedPlace(place);
              setView('details');
              // Simulate AI Fetch
              setTimeout(() => {
                  setAiData(getMockEnrichmentData(place.name));
              }, 1500);
          }
      });
  };

  const getMockEnrichmentData = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes("delhi public school") || n.includes("dps")) return { streams: ['Science', 'Commerce', 'Humanities'], annualFee: 'Approx. ₹2,50,000' };
      if (n.includes("iit")) return { streams: ['Engineering', 'Technology'], annualFee: 'Approx. ₹2,20,000' };
      return { streams: [], annualFee: null };
  };

  const fetchFeeStructure = async () => {
      setFeeModalOpen(true);
      setFeeData(null); // Loading state inside modal
      
      const fees = await getAcademyFees(selectedPlace.name, selectedPlace.formatted_address);
      setFeeData(fees);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">School & College Finder</h1>
                <button onClick={onBack} className="text-gray-500 hover:text-gray-800 font-medium">Back to Dashboard</button>
            </div>

            {view === 'choice' && (
                <div className="grid md:grid-cols-2 gap-8 mt-12">
                    <div onClick={() => { setSearchType('school'); setView('search'); setResults([]); }} className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl transition transform hover:-translate-y-1">
                        <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fschool_800px.jpg?alt=media&token=6346a908-62f0-4e68-bd61-7d9c179b139b" className="w-full h-48 object-cover" alt="Search Schools" />
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-800">Search Schools</h2>
                            <p className="text-gray-600 mt-2">Find the best schools based on location and curriculum.</p>
                        </div>
                    </div>
                    <div onClick={() => { setSearchType('college'); setView('search'); setResults([]); }} className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl transition transform hover:-translate-y-1">
                        <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fcollege_800px.jpg?alt=media&token=3007420a-9257-4f86-8ae2-352a8dd580f1" className="w-full h-48 object-cover" alt="Search Colleges" />
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-800">Search Colleges</h2>
                            <p className="text-gray-600 mt-2">Explore top colleges for higher education.</p>
                        </div>
                    </div>
                </div>
            )}

            {view === 'search' && (
                <div className="animate-fade-in-up">
                    <button onClick={() => { setView('choice'); setResults([]); }} className="text-gray-500 mb-6 flex items-center gap-2"><i className="fas fa-arrow-left"></i> Change Type</button>
                    
                    <div className="bg-white p-8 rounded-xl shadow-md mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Find {searchType === 'school' ? 'Schools' : 'Colleges'}</h2>
                        <form onSubmit={handleSearch} className="grid md:grid-cols-3 gap-4">
                            <input name="searchName" placeholder="Name / Keyword (e.g. DPS)" className="p-3 border rounded-lg" required />
                            <input name="searchLocation" placeholder="Location (e.g. Delhi)" className="p-3 border rounded-lg" required />
                            <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">Search</button>
                        </form>
                    </div>

                    {loading ? (
                        <div className="text-center py-10"><div className="loader !w-10 !h-10"></div></div>
                    ) : (
                        <div className="space-y-4">
                            {results.map((place, i) => (
                                <div key={i} onClick={() => handleDetails(place.place_id)} className="bg-white p-6 rounded-lg shadow hover:shadow-md cursor-pointer flex justify-between items-center group">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600">{place.name}</h3>
                                        <p className="text-gray-500 text-sm">{place.formatted_address}</p>
                                    </div>
                                    <span className="text-blue-500">&rarr;</span>
                                </div>
                            ))}
                            {results.length === 0 && <p className="text-center text-gray-500">Enter search terms to find results.</p>}
                        </div>
                    )}
                </div>
            )}

            {view === 'details' && selectedPlace && (
                <div className="animate-fade-in-up">
                    <button onClick={() => setView('search')} className="text-gray-500 mb-6 flex items-center gap-2"><i className="fas fa-arrow-left"></i> Back to Results</button>
                    
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="h-64 bg-gray-200 relative">
                            {selectedPlace.photos?.[0] ? (
                                <img src={selectedPlace.photos[0].getUrl({ maxWidth: 1200 })} className="w-full h-full object-cover" alt={selectedPlace.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🖼️</div>
                            )}
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent p-8">
                                <h1 className="text-3xl font-bold text-white">{selectedPlace.name}</h1>
                                <p className="text-white/80">{selectedPlace.formatted_address}</p>
                            </div>
                        </div>

                        <div className="p-8 grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-8">
                                {/* AI Data */}
                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><i className="fas fa-robot"></i> AI Insights</h3>
                                    {aiData ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-blue-600 uppercase font-bold">Likely Streams</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {aiData.streams.length ? aiData.streams.map((s: string) => <span key={s} className="bg-white px-2 py-1 rounded text-xs border">{s}</span>) : <span className="text-sm text-gray-500">N/A</span>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-blue-600 uppercase font-bold">Est. Annual Fee</p>
                                                <p className="text-xl font-bold text-gray-800">{aiData.annualFee || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-blue-600"><div className="loader !w-4 !h-4 !border-blue-600"></div> Gathering intelligence...</div>
                                    )}
                                </div>

                                {/* Details */}
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Details</h3>
                                    <div className="space-y-3 text-gray-700">
                                        <p><i className="fas fa-phone w-6 text-center text-gray-400"></i> {selectedPlace.international_phone_number || 'N/A'}</p>
                                        <p><i className="fas fa-globe w-6 text-center text-gray-400"></i> {selectedPlace.website ? <a href={selectedPlace.website} target="_blank" className="text-blue-600 hover:underline">Website</a> : 'N/A'}</p>
                                        <p><i className="fas fa-star w-6 text-center text-gray-400"></i> {selectedPlace.rating} ({selectedPlace.user_ratings_total} reviews)</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <button onClick={fetchFeeStructure} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg mb-4">
                                    Check Fee Structure (AI)
                                </button>
                                <div className="bg-gray-50 p-4 rounded-xl border">
                                    <h4 className="font-bold text-sm mb-3">Google Reviews</h4>
                                    <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                                        {selectedPlace.reviews?.map((r: any, i: number) => (
                                            <div key={i} className="text-sm">
                                                <p className="font-semibold text-gray-800 flex justify-between">{r.author_name} <span className="text-yellow-500">★{r.rating}</span></p>
                                                <p className="text-gray-600 line-clamp-3">{r.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fee Modal */}
            {feeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setFeeModalOpen(false)}>
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold mb-4">Fee Structure Estimate</h3>
                        {feeData ? (
                            <div className="space-y-6">
                                {feeData === 'NOT_FOUND' ? (
                                    <p className="text-gray-500">We could not find public fee information for this institution. Please contact them directly.</p>
                                ) : (
                                    <>
                                        <div className="prose text-sm text-gray-700 max-w-none" dangerouslySetInnerHTML={{ __html: feeData }} />
                                        <p className="text-xs text-gray-400 italic text-center mt-4 border-t pt-2">* AI Generated Estimate based on public web data. Verify with institution.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8"><div className="loader mx-auto"></div><p className="mt-4 text-gray-500">Consulting AI database...</p></div>
                        )}
                        <button onClick={() => setFeeModalOpen(false)} className="w-full mt-6 bg-gray-200 font-bold py-2 rounded-lg hover:bg-gray-300">Close</button>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};

export default FeeStructure;
