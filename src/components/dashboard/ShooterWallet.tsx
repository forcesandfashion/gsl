import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Plus, Send, History, Download, Upload, CreditCard } from "lucide-react";

// Mock transaction data
const mockTransactions = [
  { id: 1, type: 'credit', amount: 5000, description: 'Added via UPI', date: '2023-10-15', time: '14:30' },
  { id: 2, type: 'debit', amount: 1200, description: 'Range booking - 10m Air Pistol', date: '2023-10-12', time: '10:15' },
  { id: 3, type: 'credit', amount: 3000, description: 'Added via Card', date: '2023-10-10', time: '16:45' },
  { id: 4, type: 'debit', amount: 800, description: 'Ammunition purchase', date: '2023-10-05', time: '11:20' },
  { id: 5, type: 'credit', amount: 2000, description: 'Added via UPI', date: '2023-10-01', time: '09:30' },
];

export default function ShooterWallet() {
  const [balance] = useState(8200); // Mock balance
  const [activeAction, setActiveAction] = useState<'add' | 'send' | null>(null);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  const handleAddMoney = () => {
    // In a real app, this would integrate with a payment gateway
    alert(`Adding ₹${amount} to wallet...`);
    setAmount('');
    setActiveAction(null);
  };

  const handleSendMoney = () => {
    // In a real app, this would process the transaction
    alert(`Sending ₹${amount} to ${recipient}...`);
    setAmount('');
    setRecipient('');
    setActiveAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      <div className="bg-blue-700 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white opacity-80">Current Balance</p>
            <p className="text-3xl text-[#ff6b6b] font-bold">₹{balance.toLocaleString('en-IN')}</p>
            <p className="text-sm text-white mt-2 opacity-80">Available for payments and transfers</p>
          </div>
          <Wallet className="w-12 h-12 opacity-80 text-[#ff6b6b]" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-4">
        <Button 
          onClick={() => setActiveAction('add')}
          className="flex flex-col items-center justify-center h-20 bg-blue-700 hover:bg-[#ff6b6b] text-white p-2"
        >
          <Plus className="w-6 h-6 mb-1" />
          <span className="text-sm">Add Money</span>
        </Button>
        
        <Button 
          onClick={() => setActiveAction('send')}
          className="flex flex-col items-center justify-center h-20 bg-[#ff6b6b] hover:bg-blue-700 text-white p-2"
        >
          <Send className="w-6 h-6 mb-1" />
          <span className="text-sm">Send Money</span>
        </Button>
        
        <Button className="flex flex-col items-center justify-center h-20 bg-blue-700 hover:bg-[#ff6b6b] text-white p-2">
          <History className="w-6 h-6 mb-1" />
          <span className="text-sm">History</span>
        </Button>
      </div>

      {/* Add Money Form */}
      {activeAction === 'add' && (
        <div className="bg-white rounded-lg p-4 shadow-md">
          <h3 className="text-lg text-blue-700 font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#ff6b6b]" /> Add Money to Wallet
          </h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setAmount('500')}
                variant="outline"
                className={amount === '500' ? 'bg-blue-100' : ''}
              >
                ₹500
              </Button>
              <Button 
                onClick={() => setAmount('1000')}
                variant="outline"
                className={amount === '1000' ? 'bg-blue-100' : ''}
              >
                ₹1000
              </Button>
              <Button 
                onClick={() => setAmount('2000')}
                variant="outline"
                className={amount === '2000' ? 'bg-blue-100' : ''}
              >
                ₹2000
              </Button>
              <Button 
                onClick={() => setAmount('5000')}
                variant="outline"
                className={amount === '5000' ? 'bg-blue-100' : ''}
              >
                ₹5000
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddMoney} className="flex-1 bg-[#ff6b6b] hover:bg-blue-700">
                <CreditCard className="w-4 h-4 mr-2" /> Add Money
              </Button>
              <Button onClick={() => setActiveAction(null)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Money Form */}
      {activeAction === 'send' && (
        <div className="bg-white rounded-lg p-4 shadow-md">
          <h3 className="text-lg text-blue-700 font-semibold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-[#ff6b6b]" /> Send Money
          </h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Recipient ID or Phone</Label>
              <Input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter recipient ID or phone number"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sendAmount">Amount (₹)</Label>
              <Input
                id="sendAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendMoney} className="flex-1 bg-[#ff6b6b] hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" /> Send Money
              </Button>
              <Button onClick={() => setActiveAction(null)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-lg p-4 shadow-md">
        <h3 className="text-lg text-blue-700 font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-[#ff6b6b]" /> Recent Transactions
        </h3>
        <div className="space-y-3">
          {mockTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-gray-500">{transaction.date} at {transaction.time}</p>
              </div>
              <div className={`text-right ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                <p className="font-bold">{transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}</p>
                <p className="text-xs capitalize">{transaction.type}</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4">
          <Download className="w-4 h-4 mr-2" /> Download Statement
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-14">
            <Upload className="w-4 h-4 mr-2" /> Pay Bill
          </Button>
          <Button variant="outline" className="h-14">
            <CreditCard className="w-4 h-4 mr-2" /> Set Auto-Add
          </Button>
        </div>
      </div>
    </div>
  );
}