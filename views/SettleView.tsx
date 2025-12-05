import React from 'react';
import { ExpenseItem } from '../types';
import { ArrowRight, Receipt, CircleDollarSign } from 'lucide-react';

interface SettleViewProps {
  expenses: ExpenseItem[];
  tripUsers: string[];
}

// Mock Exchange Rate
const EXCHANGE_RATE = 0.0235;

export const SettleView: React.FC<SettleViewProps> = ({ expenses, tripUsers }) => {
  // Filter for ONLY shared expenses
  const sharedExpenses = expenses.filter(item => item.isShared);

  // 1. Calculate Totals for Shared Expenses
  const totals: Record<string, number> = {};
  tripUsers.forEach(u => totals[u] = 0);
  
  sharedExpenses.forEach(item => {
    // Check if payer is still in the user list to avoid issues if a user was deleted but their expenses remain
    if (totals[item.payer] !== undefined) {
      totals[item.payer] += item.cost;
    } else {
        // Optional: If payer was deleted, you might want to handle it, e.g., add them back temporarily or ignore. 
        // For now, we ignore expenses from deleted users in the settlement balance to keep math consistent with current users.
    }
  });

  const totalTripCost = Object.values(totals).reduce((a, b) => a + b, 0);
  // We assume all shared expenses are shared equally by all users defined in tripUsers
  const averagePerPerson = tripUsers.length > 0 ? totalTripCost / tripUsers.length : 0;

  // 2. Calculate Balances (Who owes what)
  // Positive balance = Paid more than average (Others owe them)
  // Negative balance = Paid less than average (They owe others)
  const balances = Object.entries(totals).map(([name, paid]) => ({
    name,
    paid,
    balance: paid - averagePerPerson
  }));

  // 3. Settlement Algorithm
  const debtors = balances.filter(b => b.balance < -1).sort((a, b) => a.balance - b.balance); // Ascending (Most negative first)
  const creditors = balances.filter(b => b.balance > 1).sort((a, b) => b.balance - a.balance); // Descending (Most positive first)

  const suggestions = [];
  let i = 0;
  let j = 0;

  // Working copies of balances to decrement
  const dBalances = debtors.map(d => d.balance);
  const cBalances = creditors.map(c => c.balance);

  while (i < debtors.length && j < creditors.length) {
    const debt = Math.abs(dBalances[i]);
    const credit = cBalances[j];
    
    // The amount to transfer is the minimum of what the debtor owes and what the creditor is owed
    const amount = Math.min(debt, credit);

    if (amount > 1) { // Ignore insignificant amounts
       suggestions.push({
         from: debtors[i].name,
         to: creditors[j].name,
         amount: Math.round(amount)
       });
    }

    // Adjust balances
    dBalances[i] += amount;
    cBalances[j] -= amount;

    // Move to next person if settled
    if (Math.abs(dBalances[i]) < 1) i++;
    if (cBalances[j] < 1) j++;
  }

  const getBarWidth = (amount: number) => {
    if (totalTripCost === 0) return '0%';
    return `${Math.min((amount / totalTripCost) * 100, 100)}%`;
  };

  const getPayerColor = (name: string) => {
    if (name === 'Me') return 'bg-gray-800 text-white';
    
    // Simple hashing for consistent colors
    const colors = [
        'bg-blue-100 text-blue-600',
        'bg-green-100 text-green-600',
        'bg-orange-100 text-orange-600',
        'bg-purple-100 text-purple-600',
        'bg-pink-100 text-pink-600',
        'bg-teal-100 text-teal-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
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
                Shared Cost: ₩{totalTripCost.toLocaleString()}
                {expenses.length !== sharedExpenses.length && (
                    <span className="ml-2 text-retro-accent">(Personal items excluded)</span>
                )}
            </p>
         </div>
      </div>

      {/* 1. Leaderboard / Totals */}
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 overflow-hidden relative">
         <h2 className="text-xs font-black text-gray-800 tracking-widest uppercase mb-4 flex items-center gap-2">
            <CircleDollarSign size={14} className="text-yellow-600" />
            Total Paid (Who paid most?)
         </h2>
         
         <div className="space-y-4">
            {balances.length > 0 ? balances
              .sort((a, b) => b.paid - a.paid)
              .map((person) => (
               <div key={person.name} className="relative">
                  <div className="flex justify-between text-xs font-bold mb-1 z-10 relative">
                     <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full inline-block ${getPayerColor(person.name)}`}></span>
                        {person.name}
                     </span>
                     <span className="font-mono">₩{person.paid.toLocaleString()}</span>
                  </div>
                  {/* Bar */}
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <div 
                        className={`h-full rounded-full ${person.balance >= 0 ? 'bg-yellow-400' : 'bg-gray-300'}`} 
                        style={{ width: getBarWidth(person.paid) }}
                     ></div>
                  </div>
               </div>
            )) : (
              <div className="text-center text-gray-400 text-xs py-2">No passengers added.</div>
            )}
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
            {totalTripCost === 0 ? (
                <div className="text-center py-4 opacity-50 font-bold font-mono text-sm text-[#2a1d1a]">
                    {expenses.length > 0 ? "ONLY PERSONAL EXPENSES RECORDED" : "NO SHARED EXPENSES YET"}
                </div>
            ) : suggestions.length === 0 ? (
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
                            <div className="text-[8px] font-bold text-gray-400">NT${Math.round(s.amount * EXCHANGE_RATE).toLocaleString()}</div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};