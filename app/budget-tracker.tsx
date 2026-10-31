'use client';

import { ScreenContainer } from '@/components/screen-container';
import { useSkin } from '@/hooks/use-skin';
import { useBudgetMaterial } from '@/hooks/use-budget-material';
import { useCallback, useState } from 'react';
import {
  createRecurringExpense,
  deleteExpense as removeExpense,
  deleteRecurringSeries,
  editExpense,
  getBudgetDaysLate,
  getBudgetMonthTotals,
  getBudgetNextDue,
  getDaysInMonth,
  materializeRecurringExpenses,
  monthKey,
  normalizeRecurringExpenses,
  type MonthlyExpenseRecord,
} from '@/lib/budget-data';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, View, Pressable, Text, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { syncBudgetReminderNotifications } from '@/lib/notification-scheduler';

const BUDGET_STORAGE_KEY = 'monthlyBudgetExpenses';

type MonthlyExpense = MonthlyExpenseRecord;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-28" → "Oct 28" — string parts only, never a Date parse. */
function formatDueDate(dueDate: string): string {
  const [, month, day] = dueDate.split('-').map(Number);
  if (!month || !day) return dueDate;
  return `${MONTH_SHORT[month - 1]} ${day}`;
}

export default function BudgetTrackerScreen() {
  const bm = useBudgetMaterial();
  const { isSkinned, tokens: skinTokens } = useSkin();
  // v286: the page ground takes the skin background the way
  // prayer-journal-tab.tsx does; every card/hero/row/sheet wears the
  // derived budget family (lib/budget-material.ts). v179's paperSurface
  // swap is superseded by the family.
  const ground = isSkinned ? skinTokens.background ?? bm.ground : bm.ground;
  const router = useRouter();
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  // v380: the sheet is one form for both modes — editingExpense is
  // null in Add mode and holds the bill being edited in Edit mode.
  const [editingExpense, setEditingExpense] = useState<MonthlyExpense | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);

  const loadExpenses = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(BUDGET_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as MonthlyExpense[];
      const normalized = normalizeRecurringExpenses(parsed);
      const expanded = materializeRecurringExpenses(normalized, currentMonth, 12);
      setExpenses(expanded);
      void syncBudgetReminderNotifications(expanded);

      if (JSON.stringify(expanded) !== JSON.stringify(parsed)) {
        await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(expanded));
      }
    } catch (error) {
      console.error('Error loading budget expenses:', error);
    }
  }, [currentMonth]);

  const saveExpenses = useCallback(async (newExpenses: MonthlyExpense[]) => {
    try {
      await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(newExpenses));
      setExpenses(newExpenses);
      void syncBudgetReminderNotifications(newExpenses);
    } catch (error) {
      console.error('Error saving budget expenses:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const resetSheetForm = () => {
    setFormName('');
    setFormAmount('');
    setSelectedDay(null);
    setIsRecurring(false);
    setEditingExpense(null);
  };

  const openAddSheet = () => {
    resetSheetForm();
    setShowAddModal(true);
  };

  const closeSheet = () => {
    resetSheetForm();
    setShowAddModal(false);
  };

  // v380: hold a bill to edit it — the same sheet, prefilled from
  // the bill, in Edit mode.
  const openEditSheet = (expense: MonthlyExpense) => {
    setEditingExpense(expense);
    setFormName(expense.name);
    setFormAmount(String(expense.amount));
    setSelectedDay(expense.day);
    setIsRecurring(!!expense.isRecurring);
    setShowAddModal(true);
  };

  const handleSaveSheet = () => {
    const amount = parseFloat(formAmount);
    if (!formName.trim() || !Number.isFinite(amount) || amount <= 0 || selectedDay === null) {
      Alert.alert('Error', 'Please enter a name, a positive amount, and a due day');
      return;
    }

    if (editingExpense) {
      // v380: edits land through the lib's record layer (forward
      // for a series, in place for a one-off). A bill that is
      // recurring after the edit gets the same materialization the
      // create path runs, so the coming months in the window carry
      // the saved values right away.
      const updated = editExpense(expenses, editingExpense.id, {
        name: formName.trim(),
        amount,
        day: selectedDay,
        isRecurring,
      });
      saveExpenses(isRecurring ? materializeRecurringExpenses(updated, currentMonth, 12) : updated);
      closeSheet();
      return;
    }

    const id = Date.now().toString();
    const newExpense: MonthlyExpense = isRecurring
      ? createRecurringExpense(id, formName.trim(), amount, selectedDay, currentMonth)
      : {
          id,
          day: selectedDay,
          name: formName.trim(),
          amount,
          isPaid: false,
          dueDate: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`,
          isRecurring: false,
        };

    const updated = isRecurring
      ? materializeRecurringExpenses([...expenses, newExpense], currentMonth, 12)
      : [...expenses, newExpense];
    saveExpenses(updated);
    closeSheet();
  };

  const toggleExpensePaid = (expenseId: string) => {
    const updated = expenses.map(exp =>
      exp.id === expenseId ? { ...exp, isPaid: !exp.isPaid } : exp
    );
    saveExpenses(updated);
  };

  const deleteExpense = (expense: MonthlyExpense) => {
    if (expense.isRecurring) {
      Alert.alert(
        'Delete recurring bill?',
        `This will remove every occurrence of “${expense.name}” from the tracker.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete series', style: 'destructive', onPress: () => saveExpenses(deleteRecurringSeries(expenses, expense.recurrenceId ?? expense.id)) },
        ],
      );
      return;
    }
    saveExpenses(removeExpense(expenses, expense.id));
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const today = new Date();
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long' });
  const daysInMonth = getDaysInMonth(currentMonth);
  // v286: totals come from the lib's string-prefix helper — the
  // screen's old helpers parsed new Date(dueDate) (UTC midnight,
  // timezone-shiftable); the lib's cannot move a bill across months.
  const { totalDue: totalMonth, paid: paidMonth, remaining: remainingMonth } = getBudgetMonthTotals(expenses, currentMonth);
  const targetMonthKey = monthKey(currentMonth);
  const byDue = (a: MonthlyExpense, b: MonthlyExpense) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id);
  const monthBills = expenses.filter(exp => exp.dueDate.slice(0, 7) === targetMonthKey);
  const unpaidBills = monthBills.filter(exp => !exp.isPaid).sort(byDue);
  const paidBills = monthBills.filter(exp => exp.isPaid).sort(byDue);
  const recurringCount = monthBills.filter(exp => exp.isRecurring).length;
  const nextDue = getBudgetNextDue(expenses, currentMonth, today);
  const paidShare = totalMonth > 0 ? paidMonth / totalMonth : 0;

  const money = (value: number) => `$${value.toFixed(2)}`;

  const styles = StyleSheet.create({
    appbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingBottom: 12,
    },
    closeButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appbarTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.2,
      color: bm.ink,
    },
    monthPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: bm.tonal,
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    monthPillText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: bm.tonalInk,
      paddingHorizontal: 2,
    },
    monthPillButton: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      backgroundColor: bm.hero,
      borderRadius: 26,
      padding: 18,
      shadowColor: bm.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 3,
    },
    heroKicker: {
      fontSize: 10.5,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: bm.heroInkSoft,
    },
    heroBig: {
      fontSize: 37,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: bm.heroInk,
      marginTop: 4,
    },
    heroOf: {
      fontSize: 12.5,
      color: bm.heroInkSoft,
      marginTop: 2,
    },
    heroBar: {
      height: 9,
      backgroundColor: bm.heroBarTrack,
      borderRadius: 99,
      marginTop: 14,
      overflow: 'hidden',
    },
    heroBarFill: {
      height: '100%',
      backgroundColor: bm.heroBarFill,
      borderRadius: 99,
    },
    heroSplit: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 9,
    },
    heroSplitText: {
      fontSize: 12,
      color: bm.heroInkSoft,
    },
    heroSplitBold: {
      color: bm.heroInk,
      fontWeight: '700',
    },
    strip: {
      marginTop: 12,
    },
    stripContent: {
      gap: 8,
      paddingRight: 4,
    },
    mini: {
      width: 118,
      backgroundColor: bm.tonal,
      borderRadius: 18,
      paddingVertical: 11,
      paddingHorizontal: 12,
    },
    miniHot: {
      backgroundColor: bm.tonalHot,
    },
    miniKey: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.1,
      color: bm.inkSoft,
    },
    miniValue: {
      fontSize: 16.5,
      fontWeight: '800',
      color: bm.tonalInk,
      marginTop: 3,
    },
    miniSub: {
      fontSize: 10,
      color: bm.inkSoft,
      marginTop: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
      marginBottom: 9,
      paddingHorizontal: 2,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.3,
      color: bm.inkSoft,
    },
    sectionCount: {
      fontSize: 11.5,
      fontWeight: '700',
      color: bm.deep,
    },
    bill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: bm.card,
      borderRadius: 19,
      paddingVertical: 12,
      paddingHorizontal: 13,
      marginBottom: 8,
      shadowColor: bm.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 2,
    },
    check: {
      width: 25,
      height: 25,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: bm.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkDone: {
      backgroundColor: bm.paidGreen,
      borderColor: bm.paidGreen,
    },
    billMain: {
      flex: 1,
      minWidth: 0,
    },
    billNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
    },
    billName: {
      fontSize: 14,
      fontWeight: '700',
      color: bm.ink,
    },
    billNamePaid: {
      color: bm.inkSoft,
      textDecorationLine: 'line-through',
    },
    recChip: {
      backgroundColor: bm.tonal,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
    },
    recChipText: {
      fontSize: 9.5,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: bm.tonalInk,
    },
    billDue: {
      fontSize: 11.5,
      color: bm.inkSoft,
      marginTop: 1,
    },
    billDueLate: {
      color: bm.lateInk,
      fontWeight: '700',
    },
    billAmount: {
      fontSize: 14.5,
      fontWeight: '800',
      color: bm.ink,
    },
    billAmountPaid: {
      color: bm.inkSoft,
      textDecorationLine: 'line-through',
    },
    deleteButton: {
      padding: 6,
    },
    emptyCard: {
      backgroundColor: bm.card,
      borderRadius: 19,
      padding: 16,
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 13,
      color: bm.inkSoft,
      fontWeight: '600',
    },
    addPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      alignSelf: 'center',
      backgroundColor: bm.seed,
      borderRadius: 999,
      paddingVertical: 11,
      paddingHorizontal: 16,
      marginTop: 14,
    },
    addPillText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13.5,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: bm.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 15,
      paddingBottom: 34,
    },
    sheetTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: bm.ink,
      marginBottom: 11,
    },
    field: {
      backgroundColor: bm.ground,
      borderRadius: 13,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: bm.ink,
      fontSize: 13,
      marginBottom: 8,
    },
    dayLabel: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.1,
      color: bm.inkSoft,
      marginTop: 4,
      marginBottom: 8,
    },
    dayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    dayButton: {
      width: '12.8%',
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: bm.tonal,
    },
    dayButtonSelected: {
      backgroundColor: bm.seed,
    },
    dayButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: bm.tonalInk,
    },
    dayButtonTextSelected: {
      color: '#FFFFFF',
    },
    repToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: bm.hero,
      borderRadius: 15,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginBottom: 11,
    },
    repToggleMain: {
      flex: 1,
    },
    repToggleTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: bm.heroInk,
    },
    repToggleSub: {
      fontSize: 11,
      color: bm.heroInkSoft,
      marginTop: 1,
    },
    repPill: {
      width: 46,
      height: 27,
      borderRadius: 99,
      backgroundColor: bm.line,
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    repPillOn: {
      backgroundColor: bm.seed,
      alignItems: 'flex-end',
    },
    repKnob: {
      width: 21,
      height: 21,
      borderRadius: 999,
      backgroundColor: '#FFFFFF',
    },
    sheetButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelButton: {
      backgroundColor: bm.tonal,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      color: bm.tonalInk,
      fontWeight: '700',
      fontSize: 14,
    },
    addButton: {
      flex: 1,
      backgroundColor: bm.seed,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
  });

  const renderBill = (expense: MonthlyExpense) => {
    const daysLate = expense.isPaid ? 0 : getBudgetDaysLate(expense, today);
    const dueText = daysLate > 0
      ? `Due ${formatDueDate(expense.dueDate)} · ${daysLate} ${daysLate === 1 ? 'day' : 'days'} late`
      : `Due ${formatDueDate(expense.dueDate)}${!expense.isPaid && !expense.isRecurring ? ' · one-time' : ''}`;
    return (
      // v380: the row itself is the press target — a tap toggles
      // paid, a hold opens the editor (Pressable keeps the two
      // apart: once the hold fires, the tap never does). The check
      // circle and the delete button keep their own targets inside.
      <Pressable
        key={expense.id}
        style={styles.bill}
        onPress={() => toggleExpensePaid(expense.id)}
        onLongPress={() => openEditSheet(expense)}
        accessibilityRole="button"
        accessibilityLabel={expense.name}
        accessibilityHint="Tap to toggle paid, hold to edit"
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={expense.isPaid ? `Mark ${expense.name} unpaid` : `Mark ${expense.name} paid`}
          onPress={() => toggleExpensePaid(expense.id)}
          style={[styles.check, expense.isPaid && styles.checkDone]}
        >
          {expense.isPaid && <MaterialIcons name="check" size={15} color="#FFFFFF" />}
        </Pressable>
        <View style={styles.billMain}>
          <View style={styles.billNameRow}>
            <Text style={[styles.billName, expense.isPaid && styles.billNamePaid]}>{expense.name}</Text>
            {expense.isRecurring && (
              <View style={styles.recChip}>
                <Text style={styles.recChipText}>↻ MONTHLY</Text>
              </View>
            )}
          </View>
          <Text style={[styles.billDue, daysLate > 0 && styles.billDueLate]}>{dueText}</Text>
        </View>
        <Text style={[styles.billAmount, expense.isPaid && styles.billAmountPaid]}>{money(expense.amount)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expense.isRecurring ? `Delete recurring ${expense.name}` : `Delete ${expense.name}`}
          onPress={() => deleteExpense(expense)}
          style={styles.deleteButton}
        >
          <MaterialIcons name="delete" size={19} color={bm.inkSoft} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, backgroundColor: ground }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 32 }}>
          {/* Appbar */}
          <View style={styles.appbar}>
            <Pressable onPress={() => router.back()} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close budget">
              <MaterialIcons name="close" size={22} color={bm.ink} />
            </Pressable>
            <Text style={styles.appbarTitle}>Budget</Text>
            <View style={styles.monthPill}>
              <Pressable onPress={previousMonth} style={styles.monthPillButton} accessibilityRole="button" accessibilityLabel="Previous month">
                <MaterialIcons name="chevron-left" size={18} color={bm.tonalInk} />
              </Pressable>
              <Text style={styles.monthPillText}>{monthName}</Text>
              <Pressable onPress={nextMonth} style={styles.monthPillButton} accessibilityRole="button" accessibilityLabel="Next month">
                <MaterialIcons name="chevron-right" size={18} color={bm.tonalInk} />
              </Pressable>
            </View>
          </View>

          {/* Hero — LEFT TO PAY */}
          <View style={styles.hero}>
            <Text style={styles.heroKicker}>LEFT TO PAY · {monthLabel.toUpperCase()}</Text>
            <Text style={styles.heroBig}>{money(remainingMonth)}</Text>
            <Text style={styles.heroOf}>of {money(totalMonth)} this month</Text>
            {/* v342 (his principle, Oct 29 14:45 — "bars that
                aren't live go regular"): the Budget hero bar is a
                month's money RECORD, so v341's wavy conversion is
                reverted — its pre-v341 straight form, same seat
                and colours. */}
            <View style={styles.heroBar}>
              <View style={[styles.heroBarFill, { width: `${Math.round(paidShare * 100)}%` }]} />
            </View>
            <View style={styles.heroSplit}>
              <Text style={styles.heroSplitText}>Paid <Text style={styles.heroSplitBold}>{money(paidMonth)}</Text></Text>
              <Text style={styles.heroSplitText}><Text style={styles.heroSplitBold}>{paidBills.length} of {monthBills.length}</Text> bills paid</Text>
            </View>
          </View>

          {/* Mini stat strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
            <View style={styles.mini}>
              <Text style={styles.miniKey}>TOTAL</Text>
              <Text style={styles.miniValue}>{money(totalMonth)}</Text>
              <Text style={styles.miniSub}>{monthBills.length} bills</Text>
            </View>
            <View style={styles.mini}>
              <Text style={styles.miniKey}>PAID</Text>
              <Text style={styles.miniValue}>{money(paidMonth)}</Text>
              <Text style={styles.miniSub}>{paidBills.length} bills</Text>
            </View>
            <View style={[styles.mini, styles.miniHot]}>
              <Text style={styles.miniKey}>NEXT DUE</Text>
              <Text style={styles.miniValue}>{nextDue ? formatDueDate(nextDue.dueDate) : '—'}</Text>
              <Text style={styles.miniSub}>{nextDue ? `${nextDue.name} ${money(nextDue.amount)}` : 'nothing due'}</Text>
            </View>
            <View style={styles.mini}>
              <Text style={styles.miniKey}>↻ MONTHLY</Text>
              <Text style={styles.miniValue}>{recurringCount} bills</Text>
              <Text style={styles.miniSub}>run themselves</Text>
            </View>
          </ScrollView>

          {/* Still to Pay */}
          {unpaidBills.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>STILL TO PAY</Text>
                <Text style={styles.sectionCount}>{unpaidBills.length} bills</Text>
              </View>
              {unpaidBills.map(renderBill)}
            </>
          )}

          {/* Paid */}
          {paidBills.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>PAID</Text>
                <Text style={styles.sectionCount}>{money(paidMonth)}</Text>
              </View>
              {paidBills.map(renderBill)}
            </>
          )}

          {monthBills.length === 0 && (
            <View style={[styles.emptyCard, { marginTop: 18 }]}>
              <Text style={styles.emptyText}>No bills this month yet.</Text>
            </View>
          )}

          {/* Add a bill */}
          <Pressable onPress={openAddSheet} style={styles.addPill} accessibilityRole="button" accessibilityLabel="Add a bill">
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addPillText}>Add a bill</Text>
          </Pressable>
        </ScrollView>
        {/* v334: the top fade (his Oct 29 ruling, all pages) — the
            page dissolves under the budget ground this root paints
            at the top edge instead of cutting off hard. */}
        {/* v342: no top fade — detail screen with a definite
            header (fade scope ruling, Oct 29). */}
      </View>

      {/* Add / Edit Bill sheet — one form, two modes (v380) */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeSheet}
      >
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editingExpense ? 'Edit bill' : 'Add a bill'}</Text>

            <TextInput
              style={styles.field}
              placeholder="Name"
              placeholderTextColor={bm.inkSoft}
              value={formName}
              onChangeText={setFormName}
            />

            <TextInput
              style={styles.field}
              placeholder="Amount"
              placeholderTextColor={bm.inkSoft}
              value={formAmount}
              onChangeText={setFormAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.dayLabel}>DUE DAY</Text>
            <View style={styles.dayGrid}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={[styles.dayButton, selectedDay === day && styles.dayButtonSelected]}
                >
                  <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextSelected]}>
                    {day}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* The prominent recurrence toggle — the v286 feature ask. */}
            <Pressable
              onPress={() => setIsRecurring(!isRecurring)}
              style={styles.repToggle}
              accessibilityRole="switch"
              accessibilityState={{ checked: isRecurring }}
              accessibilityLabel="Repeats monthly"
            >
              <View style={styles.repToggleMain}>
                <Text style={styles.repToggleTitle}>↻ Repeats monthly</Text>
                <Text style={styles.repToggleSub}>Added to every month for you</Text>
              </View>
              <View style={[styles.repPill, isRecurring && styles.repPillOn]}>
                <View style={styles.repKnob} />
              </View>
            </Pressable>

            <View style={styles.sheetButtons}>
              <Pressable onPress={closeSheet} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveSheet} style={styles.addButton}>
                <Text style={styles.addButtonText}>{editingExpense ? 'Save' : 'Add bill'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
