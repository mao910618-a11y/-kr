import React from 'react';
import { ExpenseItem } from '../types';
import { ArrowRight, Receipt, CircleDollarSign } from 'lucide-react';

interface SettleViewProps {
  expenses: ExpenseItem[];
  tripUsers: string[];
  exchangeRate: number;
}

export const SettleView: React.FC<SettleViewProps> = ({ expenses, tripUsers, exchangeRate }) => {
  // 1. Calculate Balances
  const balances: Record<string, number> = {};
  const paidTotals: Record<string, number> = {};
  
  // Init
  tripUsers.forEach(u => {
      balances[u] = 0;
      paidTotals[u] = 0;
  });

  expenses.forEach(item => {
    // Legacy support: if splitBy is missing, assume split logic based on isShared
    const beneficiaries = item.splitBy && item.splitBy.length > 0 
        ? item.splitBy 
        : (item.isShared ? tripUsers : [item.payer]);

    // Skip purely private items (beneficiary is only payer) from the *Debt* calculation
    // But we might want to track "Total Spend" separately. 
    // Here we focus on debt settlement.
    
    // Check if payer exists in current users (in case user was deleted)
    if (paidTotals[item.payer] !== undefined) {
        paidTotals[item.payer] += item.cost;
    }

    // Only split if there is more than 1 person or the 1 person is NOT the payer (gift?)
    // Actually, simple logic:
    // Payer gets +Cost
    // Each Beneficiary gets -(Cost / Count)
    
    // We only care about settlement here, so ignore private items where Payer == Beneficiary
    if (beneficiaries.length === 1 && beneficiaries[0] === item.payer) {
        return; 
    }

    const splitAmount = item.cost / beneficiaries.length;
    
    // Payer CREDITED
    if (balances[item.payer] !== undefined) {
        balances[item.payer] += item.cost;
    }

    // Beneficiaries DEBITED
    beneficiaries.forEach(b => {
        if (balances[b] !== undefined) {
            balances[b] -= splitAmount;
        }
    });
  });

  // 2. Prepare Data for Algorithm
  const debtData = Object.entries(balances).map(([name, balance]) => ({
    name,
    balance
  }));

  const debtors = debtData.filter(d => d.balance < -1).sort((a, b) => a.balance - b.balance); // Ascending
  const creditors = debtData.filter(d => d.balance > 1).sort((a, b) => b.balance - a.balance); // Descending

  const suggestions = [];
  let i = 0;
  let j = 0;

  // Working copies
  const dBalances = debtors.map(d => d.balance);
  const cBalances = creditors.map(c => c.balance);

  while (i < debtors.length && j < creditors.length) {
    const debt = Math.abs(dBalances[i]);
    const credit = cBalances[j];
    
    const amount = Math.min(debt, credit);

    if (amount > 1) { 
       suggestions.push({
         from: debtors[i].name,
         to: creditors[j].name,
         amount: Math.round(amount)
       });
    }

    dBalances[i] += amount;
    cBalances[j] -= amount;

    if (Math.abs(dBalances[i]) < 1) i++;
    if (cBalances[j] < 1) j++;
  }

  const totalTripCost = Object.values(paidTotals).reduce((a, b) => a + b, 0);

  const getBarWidth = (amount: number) => {
    // Find max paid to scale bars relative to the biggest spender, not total cost
    const maxPaid = Math.max(...Object.values(paidTotals), 1);
    return `${Math.min((amount / maxPaid) * 100, 100)}%`;
  };

  const getPayerColor = (name: string) => {
    if (name === 'Me') return 'bg-gray-800 text-white';
    const colors = ['bg-blue-100 text-blue-600','bg-green-100 text-green-600','bg-orange-100 text-orange-600','bg-purple-100 text-purple-600','bg-pink-100 text-pink-600','bg-teal-100 text-teal-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="px-5 pb-10 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pt-2">
         <div className="p-2 bg-retro-text text-retro-bg rounded-lg">
           <Receipt size={24} />
         </div>
         <div>
            <h1 className="text-xl font-pixel text-retro-text leading-none mt-1">SETTLEMENT</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Total Spend: ₩{totalTripCost.toLocaleString()}
            </p>
         </div>
      </div>

      {/* 1. Leaderboard / Totals */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 overflow-hidden relative">
         <h2 className="text-xs font-black text-gray-800 tracking-widest uppercase mb-4 flex items-center gap-2">
            <CircleDollarSign size={14} className="text-yellow-600" />
            Total Paid (Includes Private)
         </h2>
         
         <div className="space-y-4">
            {Object.entries(paidTotals)
              .sort(([,a], [,b]) => b - a)
              .map(([name, paid]) => (
               <div key={name} className="relative">
                  <div className="flex justify-between text-xs font-bold mb-1 z-10 relative">
                     <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full inline-block ${getPayerColor(name)}`}></span>
                        {name}
                     </span>
                     <span className="font-mono">₩{paid.toLocaleString()}</span>
                  </div>
                  {/* Bar */}
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <div 
                        className={`h-full rounded-full bg-yellow-400`} 
                        style={{ width: getBarWidth(paid) }}
                     ></div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* 2. Transfer Suggestions */}
      <div className="relative">
        <div className="absolute -top-3 left-4 bg-retro-bg px-2 z-10">
           <span className="text-xs font-black text-retro-text tracking-widest uppercase bg-[#FF3366] text-white px-2 py-0.5 rounded shadow-sm transform -rotate-2 inline-block">
             ACTION PLAN
           </span>
        </div>
        
        <div className="border-[3px] border-[#2a1d1a] rounded-[1.5rem] p-5 pt-8 bg-[#E3D5CA] space-y-3 shadow-[4px_4px_0px_0px_rgba(42,29,26,0.2)]">
            {suggestions.length === 0 ? (
                <div className="text-center py-4 font-black font-mono text-lg text-[#00A86B] border-2 border-dashed border-[#00A86B] rounded-xl bg-[#E3D5CA]/50">
                    ALL SETTLED! 🎉
                </div>
            ) : (
                suggestions.map((s, idx) => (
                    <div key={idx} className="bg-[#FAF9F6] p-4 rounded-xl shadow-sm border border-[#2a1d1a]/10 flex items-center justify-between relative overflow-hidden">
                        {/* Cutout decoration */}
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#E3D5CA] rounded-full"></div>
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#E3D5CA] rounded-full"></div>

                        <div className="flex items-center gap-3">
                            <div className={`px-2 py-1 rounded text-xs font-black uppercase ${getPayerColor(s.from)}`}>
                                {s.from}
                            </div>
                            <div className="text-gray-400">
                                <ArrowRight size={14} strokeWidth={3} />
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-black uppercase ${getPayerColor(s.to)}`}>
                                {s.to}
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-sm font-black text-[#2a1d1a] font-mono">₩{s.amount.toLocaleString()}</div>
                            <div className="text-[8px] font-bold text-gray-400">NT${Math.round(s.amount * exchangeRate).toLocaleString()}</div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
