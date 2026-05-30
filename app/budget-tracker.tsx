'use client';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCallback, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { ScrollView, View, Pressable, Text, StyleSheet, Alert, Modal, TextInput } from 'react-native';

const BUDGET_STORAGE_KEY = 'monthlyBudgetExpenses';

interface MonthlyExpense {
  id: string;
  day: number;
  name: string;
  amount: number;
  isPaid: boolean;
  dueDate: string; // ISO date string
}

export default function BudgetTrackerScreen() {
  const colors = useColors();
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const loadExpenses = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(BUDGET_STORAGE_KEY);
      if (stored) {
        setExpenses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading budget expenses:', error);
    }
  }, []);

  const saveExpenses = useCallback(async (newExpenses: MonthlyExpense[]) => {
    try {
      await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(newExpenses));
      setExpenses(newExpenses);
    } catch (error) {
      console.error('Error saving budget expenses:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getExpensesForDay = (day: number) => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.dueDate);
      return expDate.getDate() === day && 
             expDate.getMonth() === currentMonth.getMonth() &&
             expDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const getTotalForMonth = () => {
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.dueDate);
        return expDate.getMonth() === currentMonth.getMonth() &&
               expDate.getFullYear() === currentMonth.getFullYear();
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getRemainingForMonth = () => {
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.dueDate);
        return expDate.getMonth() === currentMonth.getMonth() &&
               expDate.getFullYear() === currentMonth.getFullYear() &&
               !exp.isPaid;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getPaidForMonth = () => {
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.dueDate);
        return expDate.getMonth() === currentMonth.getMonth() &&
               expDate.getFullYear() === currentMonth.getFullYear() &&
               exp.isPaid;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const handleAddExpense = () => {
    if (!newExpenseName || !newExpenseAmount || selectedDay === null) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay);
    const newExpense: MonthlyExpense = {
      id: Date.now().toString(),
      day: selectedDay,
      name: newExpenseName,
      amount: parseFloat(newExpenseAmount),
      isPaid: false,
      dueDate: newDate.toISOString().split('T')[0],
    };

    const updated = [...expenses, newExpense];
    saveExpenses(updated);
    setNewExpenseName('');
    setNewExpenseAmount('');
    setSelectedDay(null);
    setShowAddModal(false);
  };

  const toggleExpensePaid = (expenseId: string) => {
    const updated = expenses.map(exp =>
      exp.id === expenseId ? { ...exp, isPaid: !exp.isPaid } : exp
    );
    saveExpenses(updated);
  };

  const deleteExpense = (expenseId: string) => {
    const updated = expenses.filter(exp => exp.id !== expenseId);
    saveExpenses(updated);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const totalMonth = getTotalForMonth();
  const paidMonth = getPaidForMonth();
  const remainingMonth = getRemainingForMonth();

  const styles = StyleSheet.create({
    header: {
      marginBottom: 20,
    },
    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    monthTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.foreground,
    },
    monthNav: {
      flexDirection: 'row',
      gap: 8,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '600',
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    paidValue: {
      color: '#22C55E',
    },
    remainingValue: {
      color: '#F59E0B',
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    dayButton: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    dayNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 2,
    },
    dayExpenseCount: {
      fontSize: 10,
      color: colors.muted,
      fontWeight: '600',
    },
    dayExpenseCountPaid: {
      color: '#22C55E',
    },
    expensesList: {
      marginBottom: 20,
    },
    expenseItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    expenseInfo: {
      flex: 1,
    },
    expenseName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    expenseAmount: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '600',
    },
    expenseCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    expenseActions: {
      flexDirection: 'row',
      gap: 8,
    },
    deleteButton: {
      padding: 8,
    },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 16,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      color: colors.foreground,
      marginBottom: 12,
      fontSize: 14,
    },
    daySelector: {
      marginBottom: 16,
    },
    daySelectorLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 8,
    },
    daySelectorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 16,
    },
    daySelectorButton: {
      width: '22%',
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 2,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    daySelectorButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    daySelectorButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.foreground,
    },
    daySelectorButtonTextSelected: {
      color: '#FFFFFF',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelButtonText: {
      color: colors.foreground,
      fontWeight: '700',
    },
    modalConfirmButton: {
      backgroundColor: colors.primary,
    },
    modalConfirmButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        {/* Month Header */}
        <View style={styles.header}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>{monthName}</Text>
            <View style={styles.monthNav}>
              <Pressable onPress={previousMonth} style={styles.navButton}>
                <MaterialIcons name="chevron-left" size={24} color={colors.foreground} />
              </Pressable>
              <Pressable onPress={nextMonth} style={styles.navButton}>
                <MaterialIcons name="chevron-right" size={24} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Due</Text>
              <Text style={styles.summaryValue}>${totalMonth.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryValue, styles.paidValue]}>${paidMonth.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, styles.remainingValue]}>${remainingMonth.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayExpenses = getExpensesForDay(day);
            const paidCount = dayExpenses.filter(e => e.isPaid).length;
            const totalCount = dayExpenses.length;

            return (
              <Pressable
                key={day}
                onPress={() => {
                  setSelectedDay(day);
                  setShowAddModal(true);
                }}
                style={[
                  styles.dayButton,
                  {
                    borderColor: totalCount > 0 ? colors.primary : colors.border,
                    backgroundColor: totalCount > 0 ? colors.primary + '15' : colors.surface,
                  },
                ]}
              >
                <Text style={styles.dayNumber}>{day}</Text>
                {totalCount > 0 && (
                  <Text style={[styles.dayExpenseCount, paidCount === totalCount && styles.dayExpenseCountPaid]}>
                    {paidCount}/{totalCount}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Expenses for selected month */}
        {expenses.filter(exp => {
          const expDate = new Date(exp.dueDate);
          return expDate.getMonth() === currentMonth.getMonth() &&
                 expDate.getFullYear() === currentMonth.getFullYear();
        }).length > 0 && (
          <View style={styles.expensesList}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>
              Expenses
            </Text>
            {expenses
              .filter(exp => {
                const expDate = new Date(exp.dueDate);
                return expDate.getMonth() === currentMonth.getMonth() &&
                       expDate.getFullYear() === currentMonth.getFullYear();
              })
              .sort((a, b) => a.day - b.day)
              .map(expense => (
                <View key={expense.id} style={styles.expenseItem}>
                  <Pressable
                    onPress={() => toggleExpensePaid(expense.id)}
                    style={[
                      styles.expenseCheckbox,
                      {
                        borderColor: expense.isPaid ? '#22C55E' : colors.border,
                        backgroundColor: expense.isPaid ? '#22C55E' : 'transparent',
                      },
                    ]}
                  >
                    {expense.isPaid && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </Pressable>
                  <View style={styles.expenseInfo}>
                    <Text style={[styles.expenseName, expense.isPaid && { textDecorationLine: 'line-through', color: colors.muted }]}>
                      {expense.name}
                    </Text>
                    <Text style={styles.expenseAmount}>Due: {expense.day}</Text>
                  </View>
                  <Text style={[styles.summaryValue, expense.isPaid && { color: colors.muted }]}>
                    ${expense.amount.toFixed(2)}
                  </Text>
                  <Pressable
                    onPress={() => deleteExpense(expense.id)}
                    style={styles.deleteButton}
                  >
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
          </View>
        )}

        {/* Add Expense Button */}
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Expense</Text>
        </Pressable>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Monthly Expense</Text>

            <TextInput
              style={styles.input}
              placeholder="Expense name"
              placeholderTextColor={colors.muted}
              value={newExpenseName}
              onChangeText={setNewExpenseName}
            />

            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor={colors.muted}
              value={newExpenseAmount}
              onChangeText={setNewExpenseAmount}
              keyboardType="decimal-pad"
            />

            <View style={styles.daySelector}>
              <Text style={styles.daySelectorLabel}>Select Day of Month</Text>
              <View style={styles.daySelectorGrid}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={[
                      styles.daySelectorButton,
                      selectedDay === day && styles.daySelectorButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.daySelectorButtonText,
                        selectedDay === day && styles.daySelectorButtonTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddExpense}
                style={styles.modalConfirmButton}
              >
                <Text style={styles.modalConfirmButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
