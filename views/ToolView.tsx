import React, { useState, useEffect } from 'react';
import { Plane, Building, Phone, Plus, Edit2, MapPin, ChevronDown, ChevronUp, Wallet, AlertTriangle, X, User, Lock, Trash2, CheckCircle } from 'lucide-react';
import { ExpenseItem } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface FlightData {
  code: string;
  date: string;
  route: string;
}

interface HotelData {
  name: string;
  checkIn: string;
  address: string;
}

interface ToolViewProps {
  expenses: ExpenseItem[];
  setExpenses?: React.Dispatch<React.SetStateAction<ExpenseItem[]>>; 
  onAdd: (item: ExpenseItem) => void;
  onDelete: (id: string) => void;
  tripUsers: string[];
  exchangeRate: number;
  onRateChange: (rate: number) => void;
}

const PriceDisplay: React.FC<{ amount: number, rate: number }> = ({ amount, rate }) => {
  const [showTwd, setShowTwd] = useState(false);
  const handleStart = () => setShowTwd(true);
  const handleEnd = () => setShowTwd(false);
  const twdAmount = Math.round(amount * rate);

  return (
    <span 
      className={`cursor-pointer transition-all duration-200 ${showTwd ? 'text-retro-accent scale-110' : 'text-[#00A86B]'}`}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
    >
      {showTwd ? `NT$${twdAmount.toLocaleString()}` : `₩${amount.toLocaleString()}`}
    </span>
  );
};

export const ToolView: React.FC<ToolViewProps> = ({ expenses, onAdd, onDelete, tripUsers, exchangeRate, onRateChange }) => {
  const [flight, setFlight] = useState<FlightData>(() => {
    const saved = localStorage.getItem('seoul-tool-flight');
    return saved ? JSON.parse(saved) : { code: 'KE692', date: '01/16', route: 'TPE -> ICN' };
  });

  const [hotel, setHotel] = useState<HotelData>(() => {
    const saved = localStorage.getItem('seoul-tool-hotel');
    return saved ? JSON.parse(saved) : { name: '明洞天空花園飯店', checkIn: '15:00', address: '首爾特別市中區明洞9街27' };
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [selectedPayer, setSelectedPayer] = useState('Me');
  // New: Split selection
  const [selectedSplit, setSelectedSplit] = useState<string[]>(tripUsers); 
  // We sync selectedSplit with tripUsers whenever tripUsers changes (and initially)
  useEffect(() => {
     // Default to selecting all users when the list changes
     if (tripUsers.length > 0) {
        setSelectedSplit(tripUsers);
     }
  }, [tripUsers.length]);


  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'flight' | 'hotel' | null>(null);
  const [isExpenseListExpanded, setIsExpenseListExpanded] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(exchangeRate.toString());

  useEffect(() => localStorage.setItem('seoul-tool-flight', JSON.stringify(flight)), [flight]);
  useEffect(() => localStorage.setItem('seoul-tool-hotel', JSON.stringify(hotel)), [hotel]);

  const handleOpenMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hotel.address) return;
    const query = encodeURIComponent(hotel.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleAddExpense = () => {
    if (!newItemName || !newItemCost) return;
    const cost = parseInt(newItemCost.replace(/[^0-9]/g, ''));
    if (isNaN(cost)) return;
    if (selectedSplit.length === 0) {
        alert("Please select at least one person to split the bill.");
        return;
    }

    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      name: newItemName,
      cost,
      payer: selectedPayer,
      isShared: selectedSplit.length > 1, // Backward compatibility
      splitBy: selectedSplit
    };
    
    onAdd(newItem);
    setNewItemName('');
    setNewItemCost('');
    // Reset split to everyone
    setSelectedSplit(tripUsers);
  };

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
     if (deleteTargetId) {
        onDelete(deleteTargetId);
        setDeleteTargetId(null);
     }
  };

  const saveRate = () => {
      const r = parseFloat(tempRate);
      if (!isNaN(r) && r > 0) {
          onRateChange(r);
          setIsEditingRate(false);
      }
  };

  const totalCostKRW = expenses
    .filter(e => e.splitBy && e.splitBy.length > 1) // Only count "Shared" expenses in total
    .reduce((sum, item) => sum + item.cost, 0);

  const getPayerColor = (name: string) => {
    if (name === 'Me') return 'bg-gray-800 text-white';
    const colors = ['bg-blue-100 text-blue-600','bg-green-100 text-green-600','bg-orange-100 text-orange-600','bg-purple-100 text-purple-600','bg-pink-100 text-pink-600','bg-teal-100 text-teal-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const toggleSplitUser = (user: string) => {
      if (selectedSplit.includes(user)) {
          setSelectedSplit(prev => prev.filter(u => u !== user));
      } else {
          setSelectedSplit(prev => [...prev, user]);
      }
  };

  return (
    <div className="px-5 space-y-5">
      
      {/* Rate Setting */}
      <div className="bg-[#F1F8E9] px-4 py-3 rounded-2xl border border-[#DCEDC8] border-dashed flex justify-between items-center">
         <div>
            <div className="text-[10px] font-bold text-[#689F38] uppercase tracking-wider">Exchange Rate (KRW → TWD)</div>
            {isEditingRate ? (
                <div className="flex items-center gap-2 mt-1">
                    <input 
                        type="number" 
                        value={tempRate} 
                        onChange={(e) => setTempRate(e.target.value)}
                        className="w-20 p-1 text-xs font-bold rounded border border-green-300 outline-none"
                    />
                    <button onClick={saveRate} className="text-[10px] bg-green-600 text-white px-2 py-1 rounded font-bold">OK</button>
                </div>
            ) : (
                <div onClick={() => { setTempRate(exchangeRate.toString()); setIsEditingRate(true); }} className="text-sm font-black text-gray-700 cursor-pointer flex items-center gap-1 group">
                    1 KRW ≈ {exchangeRate} TWD <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-green-500" />
                </div>
            )}
         </div>
         <div className="text-right hidden sm:block">
            <div className="text-[9px] text-gray-400 font-bold italic">Auto-updated from API</div>
         </div>
      </div>

      {/* ... Flight and Hotel Grids (Unchanged visually) ... */}
      <div className="grid grid-cols-2 gap-3">
        <div onClick={() => setActiveModal('flight')} className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100 relative overflow-hidden group active:scale-95 transition-transform cursor-pointer h-32 flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#FF3366]"></div>
          <div className="flex justify-between items-start z-10">
             <div className="bg-[#FF3366]/10 p-1.5 rounded-full"><Plane size={14} className="text-[#FF3366]" /></div>
             <Edit2 size={12} className="text-gray-300" />
          </div>
          <div className="z-10">
             <span className="text-[9px] font-bold text-gray-400 block mb-0.5 tracking-wider">FLIGHT</span>
             <h3 className="text-lg font-black text-gray-800 tracking-tight leading-none mb-1">{flight.code}</h3>
             <div className="text-[9px] font-bold text-gray-500 bg-gray-50 inline-block px-1.5 py-0.5 rounded border border-gray-100">{flight.date}</div>
          </div>
          <div className="absolute -bottom-2 -right-2 text-[#FF3366] opacity-[0.07] rotate-[-15deg]"><Plane size={70} /></div>
        </div>

        <div onClick={() => setActiveModal('hotel')} className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100 relative overflow-hidden group active:scale-95 transition-transform cursor-pointer h-32 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-1 h-full bg-[#0099FF]"></div>
          <div className="flex justify-between items-start z-10">
             <div className="bg-[#0099FF]/10 p-1.5 rounded-full"><Building size={14} className="text-[#0099FF]" /></div>
             <Edit2 size={12} className="text-gray-300" />
          </div>
          <div className="z-10"> 
             <span className="text-[9px] font-bold text-gray-400 block mb-0.5 tracking-wider">HOTEL</span>
             <h3 className="text-xs font-black text-gray-800 leading-tight line-clamp-2 mb-2">{hotel.name}</h3>
          </div>
          <button onClick={handleOpenMap} className="z-10 w-full flex items-center justify-center gap-1 bg-[#0099FF]/10 text-[#0099FF] py-1.5 rounded-lg text-[9px] font-bold hover:bg-[#0099FF] hover:text-white transition-colors">
             <MapPin size={10} /><span>MAP</span>
          </button>
        </div>
      </div>

      {/* ... Edit Modals (Unchanged) ... */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#FEFAE0] p-6 rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-white relative">
            <button onClick={() => setActiveModal(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-white rounded-full p-2"><X size={20} /></button>
            {activeModal === 'flight' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-[#FF3366] mb-6"><Plane size={24} /><h3 className="text-xl font-pixel text-retro-text">Flight Info</h3></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1">FLIGHT NUMBER</label><input value={flight.code} onChange={e => setFlight({...flight, code: e.target.value})} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-[#FF3366] focus:outline-none font-bold text-lg text-gray-800" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1">DATE</label><input value={flight.date} onChange={e => setFlight({...flight, date: e.target.value})} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-[#FF3366] focus:outline-none font-bold text-gray-800" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1">ROUTE</label><input value={flight.route} onChange={e => setFlight({...flight, route: e.target.value})} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-[#FF3366] focus:outline-none font-bold text-gray-800" /></div>
                <button onClick={() => setActiveModal(null)} className="w-full bg-[#FF3366] text-white py-3 rounded-xl font-bold mt-2 shadow-lg">SAVE / CLOSE</button>
              </div>
            )}
            {activeModal === 'hotel' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-[#0099FF] mb-6"><Building size={24} /><h3 className="text-xl font-pixel text-retro-text">Hotel Info</h3></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1">HOTEL NAME</label><input value={hotel.name} onChange={e => setHotel({...hotel, name: e.target.value})} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-[#0099FF] focus:outline-none font-bold text-lg text-gray-800" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1">CHECK-IN</label><input value={hotel.checkIn} onChange={e => setHotel({...hotel, checkIn: e.target.value})} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-[#0099FF] focus:outline-none font-bold text-gray-800" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1">ADDRESS</label><textarea value={hotel.address} onChange={e => setHotel({...hotel, address: e.target.value})} rows={3} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-[#0099FF] focus:outline-none font-bold text-sm text-gray-800 resize-none" /></div>
                <button onClick={() => setActiveModal(null)} className="w-full bg-[#0099FF] text-white py-3 rounded-xl font-bold mt-2 shadow-lg">SAVE / CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteTargetId} onClose={() => setDeleteTargetId(null)} onConfirm={confirmDelete} title="DELETE EXPENSE?" message="Are you sure you want to remove this transaction?" />

      {/* Expense Tracker */}
      <div className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[3px] border-white overflow-hidden">
        <div className="p-5 pb-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-black text-[#00A86B] tracking-widest uppercase flex items-center gap-1.5"><Wallet size={14} /> SHARED_WALLET</h2>
              <div className="text-right"><div className="text-2xl font-black text-gray-800 font-mono tracking-tighter">₩{totalCostKRW.toLocaleString()}</div></div>
            </div>
            
            <div className="space-y-3 mb-4">
              {/* Who Paid? */}
              <div className="flex items-center gap-2">
                 <div className="relative w-1/3">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"><User size={12} className="text-gray-400"/></div>
                    <select value={selectedPayer} onChange={(e) => setSelectedPayer(e.target.value)} className="w-full p-3 pl-7 rounded-xl bg-gray-50 border-2 border-transparent focus:border-[#00A86B] focus:bg-white outline-none text-[10px] font-bold text-gray-700 appearance-none">
                      {tripUsers.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                 </div>
                 <div className="flex-1 bg-gray-50 p-2 rounded-xl flex items-center gap-2 overflow-x-auto no-scrollbar">
                     <span className="text-[9px] font-bold text-gray-400 uppercase shrink-0">Split:</span>
                     {tripUsers.map(u => {
                         const isSelected = selectedSplit.includes(u);
                         return (
                            <button 
                                key={u}
                                onClick={() => toggleSplitUser(u)}
                                className={`shrink-0 px-2 py-1 rounded text-[9px] font-bold transition-all border border-transparent ${isSelected ? getPayerColor(u) + ' shadow-sm' : 'text-gray-300 bg-white border-gray-100 hover:border-gray-200'}`}
                            >
                                {u}
                            </button>
                         )
                     })}
                 </div>
              </div>

              <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Item Name (項目名稱)" className="w-full p-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-[#00A86B] focus:bg-white outline-none text-xs font-bold text-gray-700" />
              
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₩</span>
                  <input value={newItemCost} onChange={e => setNewItemCost(e.target.value)} type="number" placeholder="Amount (金額)" className="w-full p-3 pl-6 rounded-xl bg-gray-50 border-2 border-transparent focus:border-[#00A86B] focus:bg-white outline-none text-xs font-bold text-gray-700" />
                </div>
                <button onClick={handleAddExpense} className="bg-[#00A86B] text-white px-6 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1"><Plus size={16} /><span>ADD</span></button>
              </div>
            </div>
        </div>

        <button onClick={() => setIsExpenseListExpanded(!isExpenseListExpanded)} className={`w-full py-3 flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase transition-all border-t border-dashed border-[#00A86B]/30 ${isExpenseListExpanded ? 'bg-[#E8F5E9] text-[#00A86B]' : 'bg-[#F9FBE7] text-gray-500'}`}>
            {isExpenseListExpanded ? <>Hide History <ChevronUp size={14} /></> : <>View History ({expenses.length}) <ChevronDown size={14} /></>}
        </button>

        {isExpenseListExpanded && (
            <div className="bg-[#F1F8E9] max-h-[350px] overflow-y-auto p-2 space-y-2 animate-in slide-in-from-top-1 duration-200 shadow-inner">
              {expenses.length === 0 ? <div className="text-center py-8 text-[10px] font-bold text-gray-400 opacity-70">NO EXPENSES YET</div> : 
                expenses.slice().reverse().map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-[#00A86B]/10 shadow-sm animate-in slide-in-from-left-2 duration-200">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 ${getPayerColor(item.payer)}`}>{item.payer.charAt(0)}</div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-800 truncate">{item.name}</span>
                              {/* Icon to show split status */}
                              {(!item.splitBy || item.splitBy.length === 1) ? (
                                  <Lock size={10} className="text-gray-300" /> 
                              ) : (item.splitBy.length < tripUsers.length) ? (
                                  <span className="text-[8px] bg-orange-100 text-orange-600 px-1 rounded font-bold">Subset</span>
                              ) : null}
                          </div>
                          <span className="text-[8px] text-gray-400 font-bold">
                             Paid by {item.payer} • {item.splitBy && item.splitBy.length > 1 ? `Split: ${item.splitBy.join(', ')}` : 'Personal'}
                          </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <div className={`text-xs font-mono font-bold select-none text-right ${(item.splitBy && item.splitBy.length > 1) ? '' : 'opacity-50'}`}>
                          <PriceDisplay amount={item.cost} rate={exchangeRate} />
                      </div>
                      <button onClick={(e) => handleDeleteClick(item.id, e)} className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              }
            </div>
        )}
      </div>

      {/* Emergency Contacts */}
      <div className="rounded-[1.5rem] overflow-hidden shadow-sm transition-all duration-300 bg-white border border-red-100 mb-6">
          <button onClick={() => setIsEmergencyOpen(!isEmergencyOpen)} className={`w-full p-4 flex justify-between items-center transition-colors ${isEmergencyOpen ? 'bg-[#D32F2F] text-white' : 'bg-white text-[#D32F2F]'}`}>
            <div className="flex items-center gap-2"><Phone size={16} fill={isEmergencyOpen ? "currentColor" : "none"} /><h2 className="text-xs font-black tracking-widest uppercase">EMERGENCY</h2></div>
            {isEmergencyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isEmergencyOpen && (
            <div className="p-5 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-[#D32F2F] bg-red-50 p-3 rounded-xl border border-red-100 mb-2"><AlertTriangle size={16} /><span className="text-[10px] font-bold leading-tight">Tap numbers below to call immediately.</span></div>
              {[{ label: 'Police (報警)', number: '112' }, { label: 'Ambulance (救護車)', number: '119' }, { label: 'Tourist Info (旅遊諮詢)', number: '1330' }, { label: 'Embassy (駐韓代表處)', number: '+82-2-6329-6000' }].map((contact, idx) => (
                <a key={idx} href={`tel:${contact.number}`} className="flex justify-between items-center border-b border-gray-100 pb-2 active:bg-gray-50 active:scale-[0.99] transition-transform">
                  <span className="font-bold text-sm text-gray-700">{contact.label}</span><span className="font-black text-xl text-gray-900 font-mono tracking-tight">{contact.number}</span>
                </a>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};