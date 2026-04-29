/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Calculator, 
  Search, 
  Ear, 
  Headphones, 
  Layers, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCcw,
  ChevronRight,
  Zap,
  Volume2,
  HardHat,
  Search as SearchIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---

type HPDType = 'earplug' | 'earmuff' | 'dual';

interface JobData {
  name: string;
  trade: string;
  lex: number;
  range: string;
}

interface ProductData {
  brand: string;
  model: string;
  type: string;
  nrr: number;
  sku?: string;
}

// Hardcoded Databases from provided template
const JOB_DB: JobData[] = [
  { name: 'Concrete finisher', trade: 'Concrete', lex: 99, range: '95–103' },
  { name: 'Concrete form setter', trade: 'Concrete', lex: 96, range: '92–100' },
  { name: 'Jackhammer operator', trade: 'Concrete / Demolition', lex: 103, range: '100–108' },
  { name: 'Demolition worker', trade: 'Demolition', lex: 101, range: '97–105' },
  { name: 'Carpenter (general)', trade: 'Carpentry', lex: 94, range: '90–98' },
  { name: 'Electrician (industrial)', trade: 'Electrical', lex: 89, range: '85–93' },
  { name: 'Welder (shipyard)', trade: 'Welding', lex: 96, range: '92–100' },
  { name: 'Ironworker', trade: 'Steel', lex: 98, range: '94–102' },
  { name: 'Chainsaw operator', trade: 'Forestry', lex: 104, range: '100–108' },
  { name: 'Sandblaster', trade: 'Surface Prep', lex: 103, range: '99–107' },
  { name: 'Office worker', trade: 'Office', lex: 65, range: '55–75' },
];

const HPD_DB: ProductData[] = [
  { brand: '3M', model: 'E-A-R Classic', type: 'earplug', nrr: 29, sku: '310-1001' },
  { brand: '3M', model: 'E-A-R Soft Yellow Neons', type: 'earplug', nrr: 33, sku: '312-1201' },
  { brand: '3M Peltor', model: 'X5A Over-the-Head', type: 'earmuff', nrr: 31, sku: 'X5A' },
  { brand: 'Howard Leight', model: 'MAX Foam Earplugs', type: 'earplug', nrr: 33, sku: 'MAX' },
  { brand: 'Honeywell', model: 'Impact Pro', type: 'earmuff', nrr: 30, sku: 'RWS-53012' },
];

// --- AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Components ---

export default function App() {
  const [hpdType, setHpdType] = useState<HPDType>('earplug');
  const [noiseLevel, setNoiseLevel] = useState<number>(85);
  const [nrr1, setNrr1] = useState<string>('');
  const [nrr2, setNrr2] = useState<string>('');
  
  // Search states
  const [jobQuery, setJobQuery] = useState('');
  const [jobResults, setJobResults] = useState<JobData[]>([]);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const [hpdQuery1, setHpdQuery1] = useState('');
  const [hpdResults1, setHpdResults1] = useState<ProductData[]>([]);
  const [isSearchingHpd1, setIsSearchingHpd1] = useState(false);
  const [selectedHpd1, setSelectedHpd1] = useState<string | null>(null);

  const [hpdQuery2, setHpdQuery2] = useState('');
  const [hpdResults2, setHpdResults2] = useState<ProductData[]>([]);
  const [isSearchingHpd2, setIsSearchingHpd2] = useState(false);
  const [selectedHpd2, setSelectedHpd2] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const searchJobs = async (query: string) => {
    setJobQuery(query);
    if (query.length < 2) {
      setJobResults([]);
      return;
    }

    const localMatches = JOB_DB.filter(j => 
      j.name.toLowerCase().includes(query.toLowerCase()) || 
      j.trade.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);

    if (localMatches.length > 0) {
      setJobResults(localMatches);
      return;
    }

    // AI Fallback
    setIsSearchingJobs(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Estimate the typical 8-hour noise exposure (Lex,8h) for the job: "${query}". Return a JSON array: [{ name: string, trade: string, lex: number, range: string }]. Return max 3.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                trade: { type: Type.STRING },
                lex: { type: Type.NUMBER },
                range: { type: Type.STRING }
              },
              required: ["name", "trade", "lex", "range"]
            }
          }
        }
      });
      const data = JSON.parse(response.text);
      setJobResults(data);
    } catch (e) {
      console.error("AI Job Search Error", e);
    } finally {
      setIsSearchingJobs(false);
    }
  };

  const searchHPD = async (query: string, field: 1 | 2) => {
    const setQuery = field === 1 ? setHpdQuery1 : setHpdQuery2;
    const setResults = field === 1 ? setHpdResults1 : setHpdResults2;
    const setIsSearching = field === 1 ? setIsSearchingHpd1 : setIsSearchingHpd2;

    setQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const localMatches = HPD_DB.filter(h => 
      h.brand.toLowerCase().includes(query.toLowerCase()) || 
      h.model.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);

    if (localMatches.length > 0) {
      setResults(localMatches);
      return;
    }

    // AI Fallback
    setIsSearching(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Look up the NRR for the HPD: "${query}". Return JSON array: [{ brand: string, model: string, type: "earplug" | "earmuff", nrr: number, sku: string }].`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                brand: { type: Type.STRING },
                model: { type: Type.STRING },
                type: { type: Type.STRING },
                nrr: { type: Type.NUMBER },
                sku: { type: Type.STRING }
              },
              required: ["brand", "model", "type", "nrr"]
            }
          }
        }
      });
      const data = JSON.parse(response.text);
      setResults(data);
    } catch (e) {
      console.error("AI HPD Search Error", e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectJob = (job: JobData) => {
    setNoiseLevel(job.lex);
    setJobQuery(job.name);
    setJobResults([]);
    setSelectedJob(`✓ set to ${job.lex} dBA (${job.range})`);
  };

  const selectProduct = (p: ProductData, field: 1 | 2) => {
    if (field === 1) {
      setNrr1(p.nrr.toString());
      setHpdQuery1(`${p.brand} ${p.model}`);
      setHpdResults1([]);
      setSelectedHpd1(`✓ set to ${p.nrr} NRR`);
      if (hpdType !== 'dual') {
        setHpdType(p.type as HPDType);
      }
    } else {
      setNrr2(p.nrr.toString());
      setHpdQuery2(`${p.brand} ${p.model}`);
      setHpdResults2([]);
      setSelectedHpd2(`✓ set to ${p.nrr} NRR`);
    }
  };

  // --- Calculation Logic ---

  const results = useMemo(() => {
    const val1 = parseFloat(nrr1);
    const val2 = parseFloat(nrr2);

    if (isNaN(val1)) return null;
    if (hpdType === 'dual' && isNaN(val2)) return null;

    let deratedNRR: number;
    let label = "";

    if (hpdType === 'earplug') {
      deratedNRR = val1 * 0.50;
      label = "Earplugs (50% derated)";
    } else if (hpdType === 'earmuff') {
      deratedNRR = val1 * 0.70;
      label = "Earmuffs (30% derated)";
    } else {
      const higher = Math.max(val1, val2);
      const lower = Math.min(val1, val2);
      deratedNRR = higher + (lower * 0.50);
      label = "Dual Protection";
    }

    const reduction = deratedNRR - 3; // CSA dBA correction
    const protectedLevel = noiseLevel - reduction;
    
    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (protectedLevel > 85 && protectedLevel <= 90) status = 'warning';
    if (protectedLevel > 90) status = 'danger';

    let csaClass = "C";
    if (noiseLevel > 90 && noiseLevel <= 95) csaClass = "B";
    if (noiseLevel > 95 && noiseLevel <= 105) csaClass = "A";
    if (noiseLevel > 105) csaClass = "Dual";

    return {
      protectedLevel,
      reduction,
      deratedNRR,
      status,
      csaClass,
      label
    };
  }, [hpdType, noiseLevel, nrr1, nrr2]);

  const resetAll = () => {
    setHpdType('earplug');
    setNoiseLevel(85);
    setNrr1('');
    setNrr2('');
    setJobQuery('');
    setJobResults([]);
    setSelectedJob(null);
    setHpdQuery1('');
    setHpdResults1([]);
    setSelectedHpd1(null);
    setHpdQuery2('');
    setHpdResults2([]);
    setSelectedHpd2(null);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#f1f0e8] font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="bg-[#1a1a2e] border-b border-orange-500/20 px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
          <h1 className="font-bold text-lg tracking-wider uppercase">HPD Calculator</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-[#9998a8] uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
          <HardHat size={12} className="text-orange-500" />
          WorkSafeBC / CSA Z94.2-14
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        
        {/* Protection Type Selector */}
        <div className="bg-[#1a1a2e] rounded-2xl border border-orange-500/20 overflow-hidden shadow-xl">
          <div className="bg-orange-500/5 px-4 py-2 border-b border-orange-500/10 text-[10px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
            <Zap size={12} />
            Protection Strategy
          </div>
          <div className="grid grid-cols-3">
            {[
              { id: 'earplug', icon: <Ear size={20} />, label: 'Earplugs', sub: '50% derating' },
              { id: 'earmuff', icon: <Headphones size={20} />, label: 'Earmuffs', sub: '30% derating' },
              { id: 'dual', icon: <Layers size={20} />, label: 'Dual', sub: 'Combined' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setHpdType(type.id as HPDType)}
                className={`flex flex-col items-center justify-center py-4 transition-all border-r border-white/5 last:border-r-0 ${
                  hpdType === type.id 
                    ? 'bg-orange-500/10 text-orange-500 shadow-inner' 
                    : 'hover:bg-white/5 text-[#9998a8]'
                }`}
              >
                {type.icon}
                <span className="text-xs font-bold mt-1.5">{type.label}</span>
                <span className="text-[9px] opacity-60 uppercase tracking-tighter mt-0.5">{type.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Job Search & Noise Exposure */}
        <div className="bg-[#1a1a2e] rounded-2xl border border-orange-500/20 p-6 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
              <SearchIcon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider">Noise Context</h3>
              <p className="text-[10px] text-[#9998a8] font-medium">Search job title to estimate exposure level</p>
            </div>
          </div>

          <div className="relative">
            <div className="relative group">
              <input
                type="text"
                value={jobQuery}
                onChange={(e) => searchJobs(e.target.value)}
                placeholder="Ex: Welder, Jackhammer, Office..."
                className="w-full bg-[#252540] border border-orange-500/10 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-[#3a3a55]"
              />
              <SearchIcon className="absolute left-3.5 top-3.5 text-[#3a3a55] group-focus-within:text-orange-500" size={16} />
              {isSearchingJobs && <Loader2 className="absolute right-3.5 top-3.5 animate-spin text-orange-500" size={16} />}
            </div>
            
            <AnimatePresence>
              {jobResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-40 left-0 right-0 mt-2 bg-[#252540] border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden"
                >
                  {jobResults.map((job, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectJob(job)}
                      className="w-full px-4 py-3 text-left hover:bg-orange-500/5 border-b border-white/5 last:border-b-0 group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm group-hover:text-orange-500 transition-colors uppercase tracking-tight">{job.name}</span>
                        <span className="text-xs font-black text-orange-500 font-mono tracking-tighter">{job.lex} dBA</span>
                      </div>
                      <div className="text-[10px] text-[#9998a8] flex justify-between mt-0.5">
                        <span className="opacity-70">{job.trade}</span>
                        <span className="font-mono opacity-50">Range: {job.range}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {selectedJob && <p className="text-[10px] text-green-500 font-bold mt-2 pl-2 uppercase tracking-wide">{selectedJob}</p>}
          </div>

          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9998a8]">Exposure Level</label>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-orange-500 font-mono">{noiseLevel}</span>
                <span className="text-xs font-bold text-[#9998a8]">dBA</span>
              </div>
            </div>
            <input
              type="range"
              min="70"
              max="130"
              value={noiseLevel}
              onChange={(e) => setNoiseLevel(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#0f0f1a] rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[8px] font-bold text-[#3a3a55] px-1">
              <span>70 dBA</span>
              <span>100 dBA (THRESHOLD)</span>
              <span>130 dBA</span>
            </div>
          </div>
        </div>

        {/* NRR Input Section */}
        <div className="bg-[#1a1a2e] rounded-2xl border border-orange-500/20 p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider">Device NRR</h3>
              <p className="text-[10px] text-[#9998a8] font-medium">Labeled Noise Reduction Rating</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="relative group">
                  <input
                    type="text"
                    value={hpdQuery1}
                    onChange={(e) => searchHPD(e.target.value, 1)}
                    placeholder={hpdType === 'earmuff' ? "Search earmuff brand & model..." : "Search earplug brand & model..."}
                    className="w-full bg-[#252540] border border-orange-500/10 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                  <SearchIcon className="absolute left-3.5 top-3.5 text-[#3a3a55]" size={16} />
                  {isSearchingHpd1 && <Loader2 className="absolute right-3.5 top-3.5 animate-spin text-orange-500" size={16} />}
                </div>
                {hpdResults1.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-2 bg-[#252540] border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden">
                    {hpdResults1.map((p, idx) => (
                      <button key={idx} onClick={() => selectProduct(p, 1)} className="w-full px-4 py-3 text-left hover:bg-orange-500/5 border-b border-white/5 last:border-b-0 flex justify-between items-center group">
                        <div>
                          <div className="font-bold text-sm group-hover:text-orange-500">{p.brand} {p.model}</div>
                          <div className="text-[10px] uppercase text-[#9998a8]">{p.type} • SKU: {p.sku || 'N/A'}</div>
                        </div>
                        <div className="text-lg font-black text-orange-500 font-mono">{p.nrr}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedHpd1 && <p className="text-[10px] text-green-500 font-bold mt-2 pl-2 tracking-wide uppercase">{selectedHpd1}</p>}
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-[#9998a8] uppercase min-w-[100px]">{hpdType === 'earmuff' ? 'Earmuff NRR' : 'Earplug NRR'}</span>
                <input
                  type="number"
                  value={nrr1}
                  onChange={(e) => setNrr1(e.target.value)}
                  placeholder="e.g. 29"
                  className="bg-transparent border-none outline-none font-mono font-bold text-xl text-orange-500 w-full"
                />
                <span className="text-xs font-bold text-[#3a3a55]">dB</span>
              </div>
            </div>

            {hpdType === 'dual' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-white/5"
              >
                <div className="relative">
                  <div className="relative group">
                    <input
                      type="text"
                      value={hpdQuery2}
                      onChange={(e) => searchHPD(e.target.value, 2)}
                      placeholder="Search secondary device NRR..."
                      className="w-full bg-[#252540] border border-orange-500/10 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-all"
                    />
                    <SearchIcon className="absolute left-3.5 top-3.5 text-[#3a3a55]" size={16} />
                    {isSearchingHpd2 && <Loader2 className="absolute right-3.5 top-3.5 animate-spin text-orange-500" size={16} />}
                  </div>
                  {hpdResults2.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-2 bg-[#252540] border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden">
                      {hpdResults2.map((p, idx) => (
                        <button key={idx} onClick={() => selectProduct(p, 2)} className="w-full px-4 py-3 text-left hover:bg-orange-500/5 border-b border-white/5 last:border-b-0 flex justify-between items-center group">
                          <div>
                            <div className="font-bold text-sm group-hover:text-orange-500">{p.brand} {p.model}</div>
                            <div className="text-[10px] uppercase text-[#9998a8]">{p.type}</div>
                          </div>
                          <div className="text-lg font-black text-orange-500 font-mono">{p.nrr}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedHpd2 && <p className="text-[10px] text-green-500 font-bold mt-2 pl-2 tracking-wide uppercase">{selectedHpd2}</p>}
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-[#9998a8] uppercase min-w-[100px]">Secondary NRR</span>
                  <input
                    type="number"
                    value={nrr2}
                    onChange={(e) => setNrr2(e.target.value)}
                    placeholder="e.g. 26"
                    className="bg-transparent border-none outline-none font-mono font-bold text-xl text-orange-500 w-full"
                  />
                  <span className="text-xs font-bold text-[#3a3a55]">dB</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {results ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              ref={resultRef}
              className="space-y-4"
            >
              {/* Main Result Card */}
              <div className={`rounded-3xl p-8 border text-center relative overflow-hidden transition-colors ${
                results.status === 'safe' ? 'bg-green-500/5 border-green-500/30' :
                results.status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/30' :
                'bg-red-500/5 border-red-500/30'
              }`}>
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                    results.status === 'safe' ? 'text-green-500' :
                    results.status === 'warning' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>Protected Exposure</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-7xl font-black font-mono tracking-tighter ${
                      results.status === 'safe' ? 'text-green-500' :
                      results.status === 'warning' ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {results.protectedLevel.toFixed(1)}
                    </span>
                    <span className="text-2xl font-bold opacity-40">dBA</span>
                  </div>
                  <div className={`mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
                    results.status === 'safe' ? 'bg-green-500 text-green-950 border-green-600' :
                    results.status === 'warning' ? 'bg-yellow-500 text-yellow-950 border-yellow-600' :
                    'bg-red-500 text-red-950 border-red-600'
                  }`}>
                    {results.status === 'safe' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {results.status}
                  </div>
                </div>
                {/* Background SVG Decoration */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                  <Volume2 size={400} className="absolute -right-20 -top-20 rotate-12" />
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9998a8]">Protected Exposure Scale</label>
                  <span className="text-xs font-bold text-orange-500 font-mono tracking-tighter">{results.protectedLevel.toFixed(1)} dBA</span>
                </div>
                
                <div className="h-4 w-full bg-[#0f0f1a] rounded-full overflow-hidden flex border border-white/5 p-0.5">
                  <div className="h-full bg-blue-500/40 w-[60%] border-r border-white/10" title="Ideal (Below 80)" />
                  <div className="h-full bg-green-500/40 w-[20%] border-r border-white/10" title="Safe (80-85)" />
                  <div className="h-full bg-yellow-500/40 w-[10%] border-r border-white/10" title="Caution (85-90)" />
                  <div className="h-full bg-red-500/40 w-[10%]" title="Danger (90+)" />
                </div>
                
                <div className="relative h-1 w-full -mt-5">
                  <motion.div 
                    initial={{ left: 0 }}
                    animate={{ left: `${Math.min(100, Math.max(0, ((results.protectedLevel - 70) / (100 - 70)) * 100))}%` }}
                    className="absolute top-0 w-1 h-6 bg-white shadow-[0_0_8px_white] -translate-y-1 rounded-full z-20"
                  />
                </div>

                <div className="flex justify-between text-[8px] font-bold text-[#3a3a55] px-1 pt-1">
                  <span>OVER-PROTECTED</span>
                  <span>IDEAL</span>
                  <span>SAFE</span>
                  <span>WARNING</span>
                  <span>DANGER</span>
                </div>
              </div>

              <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                <div className="flex justify-between items-center p-4">
                  <span className="text-[10px] font-bold text-[#9998a8] uppercase tracking-wider">Noise Level</span>
                  <span className="text-sm font-bold font-mono uppercase">{noiseLevel} dBA</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-[10px] font-bold text-[#9998a8] uppercase tracking-wider">HPD Strategy</span>
                  <span className="text-sm font-bold font-mono uppercase">{results.label}</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-[10px] font-bold text-[#9998a8] uppercase tracking-wider">Effective Reduction</span>
                  <span className="text-sm font-bold font-mono text-orange-500">- {results.reduction.toFixed(1)} dB</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-[#9998a8] uppercase tracking-wider">Required CSA Class</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-500 text-[#1a1a2e] px-3 py-1 rounded-lg text-lg font-black">{results.csaClass}</span>
                    <span className="text-[10px] font-medium opacity-60">minimum</span>
                  </div>
                </div>
              </div>

              {/* Informational Guidance */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 flex gap-4">
                <div className="text-blue-500 shrink-0">
                  <Info size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-blue-200">Regulatory Insight</h4>
                  <p className="text-xs text-blue-100/60 leading-relaxed">
                    Based on <strong>{results.csaClass === 'Dual' ? 'Extreme Noise' : `Class ${results.csaClass}`}</strong> requirements, 
                    ensure devices are fit-tested. Protected levels should ideally fall between <strong>75–85 dBA</strong>. 
                    Levels below 70 dBA may cause "over-protection" and safety isolation.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="placeholder"
              className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-12 text-center space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[#3a3a55]">
                <Calculator size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#5a5a75]">Awaiting Data</h3>
                <p className="text-xs text-[#3a3a55]">Select job or add NRR to calculate protection</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={resetAll}
          className="w-full py-4 text-[#9998a8] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:text-[#f1f0e8] transition-colors bg-white/5 rounded-2xl border border-white/5"
        >
          <RefreshCcw size={14} />
          Reset Calculator
        </button>
      </main>

      <footer className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4 opacity-40">
        <div className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3">
          <div className="w-8 h-[1px] bg-white/20" />
          Powered by Gemini AI Engine
          <div className="w-8 h-[1px] bg-white/20" />
        </div>
        <p className="text-[10px] leading-relaxed max-w-sm mx-auto font-medium">
          Calculations are based on the WorkSafeBC OHSR guidelines for NRR derating (50% for plugs, 30% for muffs) and a 3 dB correction factor for dBA comparison.
        </p>
      </footer>
    </div>
  );
}
