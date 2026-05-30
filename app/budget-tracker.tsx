import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { getTotalBudgeted, getTotalSpent, getRemainingBudget, getRemainingByCategory, addTransaction, addCategory } from '@/lib/budget-tracker';
import { BudgetCategory, BudgetTransaction } from '@/lib/prayercircle-data';
import { useCallback, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

const CATEGORY_COLORS = ['#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#14B8A6'];

export default function BudgetTrackerScreen() {
  const colors = useColors();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [catsStored, transStored] = await Promise.all([
        AsyncStorage.getItem('budgetCategories'),
        AsyncStorage.getItem('budgetTransactions')
      ]);
      if (catsStored) setCategories(JSON.parse(catsStored));
      if (transStored) setTransactions(JSON.parse(transStored));
    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  }, []);

  const saveCategories = useCallback(async (newCategories: BudgetCategory[]) => {
    try {
      await AsyncStorage.setItem('budgetCategories', JSON.stringify(newCategories));
      setCategories(newCategories);
    } catch (error) {
      console.error('Error saving budget categories:', error);
      Alert.alert('Error', 'Failed to save budget categories');
    }
  }, []);

  const saveTransactions = useCallback(async (newTransactions: BudgetTransaction[]) => {
    try {
      await AsyncStorage.setItem('budgetTransactions', JSON.stringify(newTransactions));
      setTransactions(newTransactions);
    } catch (error) {
      console.error('Error saving transactions:', error);
      Alert.alert('Error', 'Failed to save transaction');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalBudgeted = getTotalBudgeted(categories);
  const totalSpent = getTotalSpent(transactions);
  const remaining = getRemainingBudget(categories, transactions);

  const handleAddCategory = () => {
    if (!newCategoryName || !newCategoryAmount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
    const updated = addCategory(categories, newCategoryName, parseFloat(newCategoryAmount), color);
    saveCategories(updated);
    setNewCategoryName('');
    setNewCategoryAmount('');
  };

  const handleAddTransaction = () => {
    if (!selectedCategoryId || !transactionAmount || !transactionDescription) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const updated = addTransaction(transactions, selectedCategoryId, parseFloat(transactionAmount), transactionDescription);
    saveTransactions(updated);
    setTransactionDescription('');
    setTransactionAmount('');
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView>
        {/* Summary */}
        <View className="bg-surface rounded-lg p-4 mb-6">
          <View className="flex-row justify-between mb-3">
            <View>
              <Text className="text-sm text-muted">Budgeted</Text>
              <Text className="text-2xl font-bold text-foreground">${totalBudgeted.toFixed(2)}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted">Spent</Text>
              <Text className="text-2xl font-bold text-error">${totalSpent.toFixed(2)}</Text>
            </View>
            <View>
              <Text className="text-sm text-muted">Remaining</Text>
              <Text className={`text-2xl font-bold ${remaining >= 0 ? 'text-success' : 'text-error'}`}>
                ${remaining.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Add Category */}
        <View className="bg-surface rounded-lg p-4 mb-6">
          <Text className="text-sm font-semibold text-muted mb-3">ADD CATEGORY</Text>
          <TextInput
            placeholder="Category name"
            placeholderTextColor={colors.muted}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            className="bg-background text-foreground p-3 rounded-lg mb-2 border border-border"
          />
          <TextInput
            placeholder="Budget amount"
            placeholderTextColor={colors.muted}
            value={newCategoryAmount}
            onChangeText={setNewCategoryAmount}
            keyboardType="decimal-pad"
            className="bg-background text-foreground p-3 rounded-lg mb-3 border border-border"
          />
          <Pressable
            onPress={handleAddCategory}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className="bg-primary p-3 rounded-lg items-center">
              <Text className="text-background font-semibold">Add Category</Text>
            </View>
          </Pressable>
        </View>

        {/* Categories */}
        {categories.map((category: BudgetCategory) => {
          const categorySpent = transactions.filter((t: BudgetTransaction) => t.categoryId === category.id).reduce((sum: number, t: BudgetTransaction) => sum + t.amount, 0);
          const categoryRemaining = getRemainingByCategory(category, transactions);
          return (
            <View key={category.id} className="bg-surface rounded-lg p-4 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: category.color || '#8B5CF6' }}
                  />
                  <Text className="text-foreground font-semibold flex-1">{category.name}</Text>
                </View>
                <Text className={`font-semibold ${categoryRemaining >= 0 ? 'text-success' : 'text-error'}`}>
                  ${categoryRemaining.toFixed(2)}
                </Text>
              </View>
              <Text className="text-xs text-muted">
                ${categorySpent.toFixed(2)} of ${category.budgetedAmount.toFixed(2)} spent
              </Text>
              <View className="bg-background rounded-full h-2 mt-2 overflow-hidden">
                <View
                  className="bg-primary h-full"
                  style={{ width: `${Math.min((categorySpent / category.budgetedAmount) * 100, 100)}%` }}
                />
              </View>
            </View>
          );
        })}

        {/* Add Transaction */}
        {categories.length > 0 && (
          <View className="bg-surface rounded-lg p-4 mb-6">
            <Text className="text-sm font-semibold text-muted mb-3">LOG EXPENSE</Text>
            <View className="mb-3">
              <Text className="text-xs text-muted mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat: BudgetCategory) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View
                      className={`px-3 py-2 rounded-full mr-2 ${
                        selectedCategoryId === cat.id ? 'bg-primary' : 'bg-background border border-border'
                      }`}
                    >
                      <Text className={selectedCategoryId === cat.id ? 'text-background text-xs font-semibold' : 'text-foreground text-xs'}>
                        {cat.name}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <TextInput
              placeholder="What did you buy?"
              placeholderTextColor={colors.muted}
              value={transactionDescription}
              onChangeText={setTransactionDescription}
              className="bg-background text-foreground p-3 rounded-lg mb-2 border border-border"
            />
            <TextInput
              placeholder="Amount"
              placeholderTextColor={colors.muted}
              value={transactionAmount}
              onChangeText={setTransactionAmount}
              keyboardType="decimal-pad"
              className="bg-background text-foreground p-3 rounded-lg mb-3 border border-border"
            />
            <Pressable
              onPress={handleAddTransaction}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View className="bg-primary p-3 rounded-lg items-center">
                <Text className="text-background font-semibold">Log Expense</Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
