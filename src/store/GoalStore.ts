import { create } from 'zustand';
import { db, COLLECTIONS, Goal } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

// Define the store type
interface GoalsStore {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  setGoals: (goals: Goal[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchGoals: (userId: string) => Promise<void>;
  createGoal: (goal: Goal) => Promise<void>;
  updateGoal: (goalId: string, updatedGoal: Goal) => Promise<void>;
  deleteGoal: (goalId: string, userId: string) => Promise<void>;
}

// Create the store
export const useGoalsStore = create<GoalsStore>((set) => ({
  goals: [],
  loading: false,
  error: null,

  setGoals: (goals: Goal[]) => set({ goals }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),

  // Fetch goals for a specific user
  fetchGoals: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const goalsCollection = collection(db, COLLECTIONS.GOALS);
      const q = query(goalsCollection, where('userId', '==', userId)); // Filter by userId
      const querySnapshot = await getDocs(q);
      const userGoals = querySnapshot.docs.map((doc) => ({
        ...(doc.data() as Goal),
        id: doc.id,
      }));

      set({ goals: userGoals });
    } catch (error) {
      console.error('Error fetching goals:', error);
      set({ error: 'Error fetching goals' });
    } finally {
      set({ loading: false });
    }
  },  // ✅ Added comma here to properly close `fetchGoals`

  // Create a new goal
  createGoal: async (goal: Goal) => {
    set({ loading: true, error: null });
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.GOALS), goal);
      console.log('Goal created with ID: ', docRef.id);
      await useGoalsStore.getState().fetchGoals(goal.userId);
    } catch (error) {
      console.error('Error creating goal:', error);
      set({ error: 'Error creating goal' });
    } finally {
      set({ loading: false });
    }
  },

  // Update an existing goal
  updateGoal: async (goalId: string, updatedGoal: Goal) => {
    set({ loading: true, error: null });
    try {
      const goalRef = doc(db, COLLECTIONS.GOALS, goalId);
      await updateDoc(goalRef, updatedGoal);
      console.log('Goal updated successfully!');
      await useGoalsStore.getState().fetchGoals(updatedGoal.userId);
    } catch (error) {
      console.error('Error updating goal:', error);
      set({ error: 'Error updating goal' });
    } finally {
      set({ loading: false });
    }
  },

  // Delete a goal
  deleteGoal: async (goalId: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const goalRef = doc(db, COLLECTIONS.GOALS, goalId);
      await deleteDoc(goalRef);
      console.log('Goal deleted successfully!');
      await useGoalsStore.getState().fetchGoals(userId);
    } catch (error) {
      console.error('Error deleting goal:', error);
      set({ error: 'Error deleting goal' });
    } finally {
      set({ loading: false });
    }
  }
}));

