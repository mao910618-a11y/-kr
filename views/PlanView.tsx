import React, { useState, useEffect } from 'react';
import { Plus, Navigation, ShoppingBag, Utensils, Train, MapPin, X, ChevronDown, ChevronUp, Cloud, Sun, CloudRain, CloudSnow, Edit2, Trash2, Wand2 } from 'lucide-react';
import { ItineraryItem, Category, WeatherInfo } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { getAIWeatherForecast } from '../services/geminiService';

interface PlanViewProps {
  items: ItineraryItem[];
  setItems?: React.Dispatch<React.SetStateAction<ItineraryItem[]>>; 
  onAdd: (item: ItineraryItem) => void;
  onUpdate: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
}

// Initial placeholder data (Hardcoded as fallback)
const INITIAL_DATES: WeatherInfo[] = [
    { date: '2026-01-16', label: '01/16', dayNum: 1, condition: 'cloudy', temp: '4°C' },
    { date: '2026-01-17', label: '01/17', dayNum: 2, condition: 'sunny', temp: '2°C' },
    { date: '2026-01-18', label: '01/18', dayNum: 3, condition: 'snow', temp: '0°C' },
    { date: '2026-01-19', label: '01/19', dayNum: 4, condition: 'sunny', temp: '2°C' },
    { date: '2026-01-20', label: '01/20', dayNum: 5, condition: 'cloudy', temp: '3°C' },
];

export const PlanView: React.FC<PlanViewProps> = ({ items, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>('2026-01-16'); 
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string>('2026-01-16');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Use state for dates to allow updates
  const [dates, setDates] = useState<WeatherInfo[]>(() => {
    const saved = localStorage.getItem('seoul-trip-weather');
    return saved ? JSON.parse(saved) : INITIAL_DATES;
  });

  useEffect(() => {
    localStorage.setItem('seoul-trip-weather', JSON.stringify(dates));
  }, [dates]);

  const fetchAIWeather = async () => {
    setIsWeatherLoading(true);
    const dateStrings = dates.map(d => d.date);
    const predictions = await getAIWeatherForecast(dateStrings);
    
    if (predictions && predictions.length > 0) {
        setDates(prev => prev.map(d => {
            const pred = predictions.find((p: any) => p.date === d.date);
            if (pred) {
                return { ...d, condition: pred.condition, temp: pred.temp };
            }
            return d;
        }));
    }
    setIsWeatherLoading(false);
  };

  const getWeatherIcon = (type: string, size = 20, className = "") => {
    switch(type) {
      case 'sunny': return <Sun size={size} className={`text-orange-400 ${className}`} />;
      case 'rain': return <CloudRain size={size} className={`text-blue-400 ${className}`} />;
      case 'snow': return <CloudSnow size={size} className={`text-indigo-400 ${className}`} />;
      default: return <Cloud size={size} className={`text-sky-400 ${className}`} />;
    }
  };

  const getCategoryIcon = (cat: Category) => {
    switch (cat) {
      case 'shopping': return <ShoppingBag size={14} />;
      case 'dining': return <Utensils size={14} />;
      case 'transport': return <Train size={14} />;
      default: return <MapPin size={14} />;
    }
  };

  const getCategoryStyle = (cat: Category) => {
    switch (cat) {
      case 'shopping': return 'bg-blue-50 text-blue-600';
      case 'dining': return 'bg-orange-50 text-orange-600';
      case 'transport': return 'bg-green-50 text-green-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const toggleDay = (date: string) => setExpandedDay(expandedDay === date ? null : date);
  
  // Allow manual toggling of weather condition by clicking the icon
  const cycleWeather = (date: string, e: React.MouseEvent) => {
      e.stopPropagation(); // prevent collapsing accordion
      const conditions: ('sunny' | 'cloudy' | 'rain' | 'snow')[] = ['sunny', 'cloudy', 'rain', 'snow'];
      setDates(prev => prev.map(d => {
          if (d.date === date) {
              const currentIdx = conditions.indexOf(d.condition as any);
              const nextIdx = (currentIdx + 1) % conditions.length;
              return { ...d, condition: conditions[nextIdx] };
          }
          return d;
      }));
  };

  const handleOpenMaps = (location: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const query = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleAddClick = (date: string) => {
    setEditingItem(null);
    setSelectedDateForAdd(date);
    setIsModalOpen(true);
  };

  const handleEditClick = (item: ItineraryItem, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      onDelete(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  return (
    <>
      <div className="relative z-10 px-5 space-y-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-200 via-pink-200 to-yellow-200 opacity-50"></div>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Sun size={16} className="text-blue-400" />
                <span className="text-[10px] font-bold text-blue-500 tracking-[0.2em] font-sans uppercase">WEATHER SCAN</span>
            </div>
            <button 
                onClick={fetchAIWeather}
                disabled={isWeatherLoading}
                className="text-[9px] font-bold bg-blue-50 text-blue-500 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors"
            >
                {isWeatherLoading ? (
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <Wand2 size={10} />
                )}
                AI FORECAST
            </button>
          </div>

          <div className="flex justify-between gap-1 overflow-x-auto no-scrollbar py-1">
            {dates.map((d) => (
              <div key={d.date} onClick={(e) => cycleWeather(d.date, e)} className="flex flex-col items-center min-w-[50px] p-1.5 rounded-xl bg-gray-50 border border-gray-100/50 hover:bg-blue-50 transition-colors cursor-pointer group active:scale-95">
                <span className="text-[9px] font-bold text-gray-400 mb-1 group-hover:text-blue-400">{d.label}</span>
                <div className="mb-1 transform group-hover:scale-110 transition-transform">{getWeatherIcon(d.condition, 20)}</div>
                <span className="text-[10px] font-black text-gray-600 group-hover:text-gray-800">{d.temp}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {dates.map((d) => {
            const isExpanded = expandedDay === d.date;
            const dayItems = items.filter(i => i.date === d.date).sort((a, b) => a.time.localeCompare(b.time));
            return (
              <div key={d.date} className="bg-white rounded-[1.5rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-[2px] border-white overflow-hidden transition-all duration-300">
                <div onClick={() => toggleDay(d.date)} className="p-4 cursor-pointer active:bg-gray-50 relative">
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="bg-[#FF3366] text-white text-[9px] font-bold px-2 py-0.5 rounded-sm shadow-sm transform -rotate-2 origin-bottom-left tracking-wide font-sans">{d.date.replace(/-/g, '.')}</div>
                    <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 font-sans">首爾 (Seoul)</div>
                  </div>
                  <div className="flex justify-between items-end mt-1.5">
                    <h2 className="text-3xl font-black text-gray-800 font-sans tracking-tight leading-none">DAY <span className="text-2xl">{d.dayNum}</span></h2>
                    <div className="bg-gray-100/80 px-3 py-1 rounded-full flex items-center gap-1.5">{getWeatherIcon(d.condition, 14)}<span className="text-xs font-bold text-gray-600">{d.temp}</span></div>
                  </div>
                  <div className="flex justify-center mt-2 -mb-2 opacity-10">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-6 bg-gray-50/50 border-t border-dashed border-gray-200 pt-5 animate-in slide-in-from-top-2 duration-200">
                    {dayItems.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <p className="text-gray-400 text-xs font-bold mb-1">NO PLANS YET</p>
                        <p className="text-gray-400 text-[9px]">Start your adventure</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dayItems.map((item) => (
                          <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3 items-start relative pr-2">
                            <div className="flex flex-col items-center min-w-[40px] pt-1">
                              <span className="text-xs font-black text-gray-800 font-sans">{item.time}</span>
                              <div className={`mt-1.5 w-6 h-6 flex items-center justify-center rounded-full ${getCategoryStyle(item.category)} bg-opacity-20`}>{getCategoryIcon(item.category)}</div>
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1">{item.title}</h3>
                              <div className="flex items-center gap-1 text-gray-400 text-[10px] truncate mb-2"><MapPin size={10} /><span className="truncate font-medium">{item.location}</span></div>
                              <div className="flex gap-2">
                                <button onClick={(e) => handleOpenMaps(item.location, e)} className="text-[9px] font-bold bg-[#283618] text-white px-2 py-1 rounded-md flex items-center gap-1 hover:bg-black transition-colors"><Navigation size={9} /> <span>NAVIGATE</span></button>
                                <div className="w-px h-auto bg-gray-200 mx-1"></div>
                                <button onClick={(e) => handleEditClick(item, e)} className="text-[9px] font-bold bg-gray-100 text-gray-500 p-1.5 rounded-md hover:bg-gray-200 transition-colors" title="Edit"><Edit2 size={12} /></button>
                                <button onClick={(e) => handleDeleteClick(item.id, e)} className="text-[9px] font-bold bg-red-50 text-red-500 p-1.5 rounded-md hover:bg-red-100 transition-colors" title="Delete"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => handleAddClick(d.date)} className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-bold hover:border-retro-accent hover:text-retro-accent transition-colors flex items-center justify-center gap-2 bg-white"><Plus size={14} /> ADD ACTIVITY</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmModal isOpen={!!deleteTargetId} onClose={() => setDeleteTargetId(null)} onConfirm={confirmDelete} title="DELETE PLAN?" message="Are you sure you want to remove this activity from your itinerary?" />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#FEFAE0] p-6 rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-white relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <button onClick={handleModalClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1"><X size={20} /></button>
            <h3 className="text-2xl font-pixel text-retro-text mb-8 mt-2">{editingItem ? 'Edit Plan ✏️' : 'New Plan ✨'}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const title = formData.get('title') as string;
              const location = formData.get('location') as string;
              const date = formData.get('date') as string;
              const time = formData.get('time') as string;
              const category = formData.get('category') as Category;

              if (editingItem) {
                onUpdate({ ...editingItem, title, location, date, time, category });
              } else {
                onAdd({ id: Date.now().toString(), title, location, date, time, category, completed: false });
              }
              handleModalClose();
            }} className="space-y-5">
              
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1 tracking-wide">ACTIVITY</label><input name="title" required defaultValue={editingItem?.title} placeholder="What are we doing?" className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-black focus:outline-none font-bold text-gray-800 placeholder:text-gray-300" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1 tracking-wide">LOCATION</label><input name="location" required defaultValue={editingItem?.location} placeholder="Where is it?" className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-black focus:outline-none font-bold text-gray-800 placeholder:text-gray-300" /></div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1 tracking-wide">DATE</label><div className="relative"><select name="date" defaultValue={editingItem ? editingItem.date : selectedDateForAdd} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-black focus:outline-none font-bold text-gray-800 appearance-none">{dates.map(d => <option key={d.date} value={d.date}>{d.label}</option>)}</select><ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /></div></div>
                <div className="flex-1 space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1 tracking-wide">TIME</label><input name="time" type="time" defaultValue={editingItem?.time || "12:00"} className="w-full p-4 rounded-xl bg-white border-2 border-transparent focus:border-black focus:outline-none font-bold text-gray-800" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 ml-1 tracking-wide">CATEGORY</label>
                 <div className="grid grid-cols-4 gap-2">
                    {[{ val: 'shopping', icon: ShoppingBag, label: 'SHOP', color: 'blue' }, { val: 'dining', icon: Utensils, label: 'EAT', color: 'orange' }, { val: 'transport', icon: Train, label: 'MOVE', color: 'green' }, { val: 'sightseeing', icon: MapPin, label: 'VIEW', color: 'purple' }].map(({val, icon: Icon, label, color}) => (
                        <label key={val} className="cursor-pointer group"><input type="radio" name="category" value={val} className="peer hidden" defaultChecked={editingItem ? editingItem.category === val : val === 'shopping'} /><div className={`flex flex-col items-center justify-center p-3 rounded-xl bg-white border-2 border-transparent peer-checked:border-${color}-400 peer-checked:bg-${color}-50 transition-all group-hover:bg-gray-50`}><Icon size={20} className={`mb-1.5 text-${color}-500`}/><span className={`text-[9px] font-bold text-gray-400 peer-checked:text-${color}-600`}>{label}</span></div></label>
                    ))}
                 </div>
              </div>
              <button type="submit" className="w-full bg-[#283618] text-[#FEFAE0] py-4 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-transform mt-4 flex items-center justify-center gap-2">{editingItem ? <Edit2 size={20} /> : <Plus size={20} />}{editingItem ? 'UPDATE PLAN' : 'ADD TO PLAN'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
