import { create } from 'zustand';
import { collection, addDoc, query, where, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, Balance, COLLECTIONS } from '../lib/firebase';

interface BalanceState {
  balance: number;
  transactions: Balance[];
  loading: boolean;
  error: string | null;
  addTransaction: (transaction: Omit<Balance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  fetchBalance: (userId: string) => Promise<void>;
  calculateTotalBalance: () => number;
  calculateMonthlySavings: () => number;
  calculateMonthlyExpenses: () => number;
  calculateRemainingBudget: () => number;
  resetBalance: (userId: string) => Promise<void>;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balance: 0,
  transactions: [],
  loading: false,
  error: null,

  addTransaction: async (transaction) => {
    try {
      const newTransaction = {
        ...transaction,
        createdAt: Timestamp.now().toDate(),
        updatedAt: Timestamp.now().toDate(),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.BALANCE), newTransaction);
      
      set((state) => ({
        transactions: [...state.transactions, { ...newTransaction, id: docRef.id }],
      }));

      // Recalculate balance after adding transaction
      await get().fetchBalance(transaction.userId);
    } catch (error) {
      console.error('Error adding transaction:', error);
      set({ error: 'Failed to add transaction' });
    }
  },

  fetchBalance: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const balanceRef = collection(db, COLLECTIONS.BALANCE);
      const q = query(balanceRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const transactions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Balance;
      });

      set({ transactions, loading: false });
    } catch (error) {
      console.error('Error fetching balance:', error);
      set({ error: 'Failed to fetch balance', loading: false });
    }
  },

  resetBalance: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const balanceRef = collection(db, COLLECTIONS.BALANCE);
      const q = query(balanceRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      // Delete all transactions for the user
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      set({ transactions: [], loading: false });
    } catch (error) {
      console.error('Error resetting balance:', error);
      set({ error: 'Failed to reset balance', loading: false });
    }
  },

  calculateTotalBalance: () => {
    const { transactions } = get();
    return transactions.reduce((total, transaction) => {
      return total + (transaction.type === 'deposit' ? transaction.amount : -transaction.amount);
    }, 0);
  },

  calculateMonthlySavings: () => {
    const totalBalance = get().calculateTotalBalance();
    const monthlyExpenses = get().calculateMonthlyExpenses();
    return totalBalance - monthlyExpenses;
  },

  calculateMonthlyExpenses: () => {
    const { transactions } = get();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return transactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear &&
          transaction.type === 'withdrawal'
        );
      })
      .reduce((total, transaction) => total + transaction.amount, 0);
  },

  calculateRemainingBudget: () => {
    const totalBalance = get().calculateTotalBalance();
    const monthlyExpenses = get().calculateMonthlyExpenses();
    const totalGoals = 0; // You can implement this by fetching goals from GoalsStore
    return totalBalance - (monthlyExpenses + totalGoals);
  },
}));