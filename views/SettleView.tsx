import React from 'react';
import { ExpenseItem } from '../types';
import { ArrowRight, Receipt, CircleDollarSign, AlertCircle } from 'lucide-react';

interface SettleViewProps {
  expenses: ExpenseItem[];
  tripUsers: string[];
  exchangeRate: number;
}

export const SettleView: React.FC<SettleViewProps> = ({ expenses, tripUsers, exchangeRate }) => {
  // 1. Calculate Balances
  const balances: Record<string, number> = {};
  const paidTotals: Record<string, number> = {};
  
  // CRITICAL FIX: Collect ALL users involved in expenses, not just current tripUsers.
  // This ensures that if a user was removed but still has debts/credits, they appear in the math.
  const allParticipants = new Set<string>(tripUsers);
  expenses.forEach(e => {
    if (e.payer) allParticipants.add(e.payer);
    if (e.splitBy && Array.isArray(e.splitBy)) {
        e.splitBy.forEach(u => allParticipants.add(u));
    }
  });

  const participantsList = Array.from(allParticipants);

  // Init balances for everyone found
  participantsList.forEach(u => {
      balances[u] = 0;
      paidTotals[u] = 0;
  });

  expenses.forEach(item => {
    // Determine beneficiaries.
    // If splitBy exists, use it. 
    // If not (Legacy), fallback to isShared logic using the GLOBAL tripUsers (or just the payer if private).
    // Note: Legacy fallback might be inaccurate if tripUsers changed, but new items use splitBy.
    const beneficiaries = item.splitBy && item.splitBy.length > 0 
        ? item.splitBy 
        : (item.isShared ? tripUsers : [item.payer]);

    // Check if payer is valid (should always be true now with allParticipants)
    if (paidTotals[item.payer] !== undefined) {
        paidTotals[item.payer] += item.cost;
    }

    // Ignore purely private items (Self-paid) from DEBT calculation.
    // Logic: If I pay 100 split by [Me], cost is 100, I pay 100. Net 0. 
    // We skip this to simplify the algorithm, but adding it wouldn't break the math (it adds +100 and -100).
    if (beneficiaries.length === 1 && beneficiaries[0] === item.payer) {
        return; 
    }

    const splitAmount = item.cost / beneficiaries.length;
    
    // Payer CREDITED (They paid, so they are owed money)
    if (balances[item.payer] !== undefined) {
        balances[item.payer] += item.cost;
    }

    // Beneficiaries DEBITED (They consumed, so they owe money)
    beneficiaries.forEach(b => {
        // Only debit if this person is tracked in our system
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

  // Separate into Debtors (-) and Creditors (+)
  // Filter out tiny floating point errors (< 1 KRW)
  const debtors = debtData.filter(d => d.balance < -1).sort((a, b) => a.balance - b.balance); // Ascending (Largest debt first: -100, -50)
  const creditors = debtData.filter(d => d.balance > 1).sort((a, b) => b.balance - a.balance); // Descending (Largest credit first: 100, 50)

  const suggestions = [];
  let i = 0; // Iterator for debtors
  let j = 0; // Iterator for creditors

  // Working copies of balances to mutate during calculation
  const dBalances = debtors.map(d => d.balance);
  const cBalances = creditors.map(c => c.balance);

  // Greedy Algorithm for Debt Settlement
  while (i < debtors.length && j < creditors.length) {
    const debt = Math.abs(dBalances[i]);
    const credit = cBalances[j];
    
    // The amount to settle is the minimum of what's owed vs what's receivable
    const amount = Math.min(debt, credit);

    if (amount > 1) { 
       suggestions.push({
         from: debtors[i].name,
         to: creditors[j].name,
         amount: Math.round(amount)
       });
    }

    // Adjust balances
    dBalances[i] += amount; // Debt gets closer to 0 (e.g. -100 + 50 = -50)
    cBalances[j] -= amount; // Credit gets closer to 0 (e.g. 100 - 50 = 50)

    // Move to next person if settled
    if (Math.abs(dBalances[i]) < 1) i++;
    if (cBalances[j] < 1) j++;
  }

  const totalTripCost = Object.values(paidTotals).reduce((a, b) => a + b, 0);

  const getBarWidth = (amount: number) => {
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

  // Check if there are "Ghost" users (Involved in money but not in active list)
  const ghostUsers = participantsList.filter(u => !tripUsers.includes(u));

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

      {ghostUsers.length > 0 && (
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-2">
             <AlertCircle size={16} className="text-orange-500 mt-0.5 shrink-0" />
             <div>
                <p className="text-xs font-bold text-orange-700">Inactive Users Found</p>
                <p className="text-[10px] text-orange-600 leading-tight mt-1">
                   Some expenses involve users who are no longer in the list ({ghostUsers.join(', ')}). They are included here to ensure the math balances out.
                </p>
             </div>
          </div>
      )}

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
                        {name} {(!tripUsers.includes(name)) && <span className="text-[8px] text-gray-300">(Inactive)</span>}
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