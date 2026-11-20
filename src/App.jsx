import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

const KHMER_MONTHS = [
  "ខែមករា", "ខែកុម្ភៈ", "ខែមីនា", "ខែមេសា", "ខែឧសភា", "ខែមិថុនា",
  "ខែកក្កដា", "ខែសីហា", "ខែកញ្ញា", "ខែតុលា", "ខែវិច្ឆិកា", "ខែធ្នូ"
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Navigation Tabs ('customers' | 'analytics')
  const [activeTab, setActiveTab] = useState("customers");

  // States ទិន្នន័យ
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // ការពារ Double-Click
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);

  // Modal បង្កើត Customer ថ្មី
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  // Modal កែប្រែ Customer
  const [showEditCustModal, setShowEditCustModal] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");

  // Modal បន្ថែមកម្ចីថ្មី (បន្ថែមរយៈពេលខ្ចី termMonths និង ទ្រព្យបញ្ចាំ collateral)
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [selectedCustomerForLoan, setSelectedCustomerForLoan] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [totalAmount, setTotalAmount] = useState("");
  const [termMonths, setTermMonths] = useState("6");
  const [repaymentStyle, setRepaymentStyle] = useState("interest_only"); // 'interest_only' (បង់តែការប្រាក់រាល់ខែ ដើមចុងគ្រា) | 'installment' (រំលោះដើម+ការស្មើគ្នា)
  const [interestType, setInterestType] = useState("percentage");
  const [interestRate, setInterestRate] = useState("2");
  const [interestAmount, setInterestAmount] = useState("");
  const [interestCurrency, setInterestCurrency] = useState("USD");
  const [paymentDay, setPaymentDay] = useState("5");
  const [collateral, setCollateral] = useState("");

  // Modal កែប្រែកម្ចី
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editInterestType, setEditInterestType] = useState("percentage");
  const [editInterestRate, setEditInterestRate] = useState("2");
  const [editInterestAmount, setEditInterestAmount] = useState("");
  const [editPaymentDay, setEditPaymentDay] = useState("5");
  const [editCollateral, setEditCollateral] = useState("");

  // Modal កត់ត្រាការបង់ប្រាក់
  const [showPayModal, setShowPayModal] = useState(false);
  const [targetLoan, setTargetLoan] = useState(null);
  const [targetScheduleItem, setTargetScheduleItem] = useState(null);
  const [payType, setPayType] = useState("interest_only");
  const [payAmountInput, setPayAmountInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("ខែវិច្ឆិកា 2026");
  const [payNote, setPayNote] = useState("");

  // Modal ប្រវត្តិ និង តារាងកាលវិភាគលម្អិត
  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState(null);
  const [detailSubTab, setDetailSubTab] = useState("schedule"); // 'schedule' | 'history'
  const [loanScheduleList, setLoanScheduleList] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal វិក្កយបត្រ (Receipt)
  const [receiptData, setReceiptData] = useState(null);
  const receiptPrintRef = useRef();

  const MONTH_OPTIONS = [
    "ខែមករា 2026", "ខែកុម្ភៈ 2026", "ខែមីនា 2026", "ខែមេសា 2026",
    "ខែឧសភា 2026", "ខែមិថុនា 2026", "ខែកក្កដា 2026", "ខែសីហា 2026",
    "ខែកញ្ញា 2026", "ខែតុលា 2026", "ខែវិច្ឆិកា 2026", "ខែធ្នូ 2026",
    "ខែមករា 2027", "ខែកុម្ភៈ 2027", "ខែមីនា 2027", "ខែមេសា 2027",
    "ខែឧសភា 2027", "ខែមិថុនា 2027"
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchUserProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchUserProfile(session.user);
      else setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      const profile = { ...authUser, ...data };
      setCurrentUser(profile);
      loadAllData(profile);
    } catch {
      const fallback = { id: authUser.id, name: authUser.email.split("@")[0], role: "user" };
      setCurrentUser(fallback);
      loadAllData(fallback);
    }
  };

  const loadAllData = async (user = currentUser) => {
    if (!user) return;
    setLoadingData(true);

    let custQuery = supabase.from("customers").select("*").order("created_at", { ascending: false });
    let loanQuery = supabase.from("loans").select("*").order("created_at", { ascending: false });
    let payQuery = supabase.from("payments").select("*").order("payment_date", { ascending: false });
    let schedQuery = supabase.from("loan_schedules").select("*").order("installment_no", { ascending: true });

    const isAdminUser = user.role === "admin" || user.role === "super-admin";
    if (!isAdminUser) {
      custQuery = custQuery.eq("created_by", user.id);
      loanQuery = loanQuery.eq("created_by", user.id);
      payQuery = payQuery.eq("created_by", user.id);
    }

    const [cRes, lRes, pRes, sRes] = await Promise.all([custQuery, loanQuery, payQuery, schedQuery]);

    setCustomers(cRes.data || []);
    setLoans(lRes.data || []);
    setPayments(pRes.data || []);
    setSchedules(sRes.data || []);
    setLoadingData(false);
  };

  const handleOpenLoanDetail = async (loan, defaultTab = "schedule") => {
    setSelectedLoanForDetail(loan);
    setDetailSubTab(defaultTab);
    setLoadingHistory(true);

    const [hRes, sRes] = await Promise.all([
      supabase.from("payments").select("*").eq("loan_id", loan.id).order("payment_date", { ascending: false }),
      supabase.from("loan_schedules").select("*").eq("loan_id", loan.id).order("installment_no", { ascending: true })
    ]);

    setPaymentsHistory(hRes.data || []);
    setLoanScheduleList(sRes.data || []);
    setLoadingHistory(false);
  };

  const handleOpenPayModal = (loan, scheduleItem = null) => {
    setTargetLoan(loan);
    setTargetScheduleItem(scheduleItem);

    if (scheduleItem) {
      setSelectedMonth(scheduleItem.month_label);
      if (scheduleItem.principal_due > 0) {
        setPayType("principal");
        setPayAmountInput(scheduleItem.total_due);
        setPayNote(`បង់រំលោះដំណាក់កាលទី ${scheduleItem.installment_no} (${scheduleItem.month_label})`);
      } else {
        setPayType("interest_only");
        setPayAmountInput(scheduleItem.interest_due);
        setPayNote(`បង់ការប្រាក់ ${scheduleItem.month_label}`);
      }
    } else {
      setPayType("interest_only");
      setPayAmountInput(loan.interest_amount || "");
      const now = new Date();
      setSelectedMonth(`${KHMER_MONTHS[now.getMonth()]} ${now.getFullYear()}`);
      setPayNote("បង់ការប្រាក់ប្រចាំខែ");
    }

    setShowPayModal(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      fetchUserProfile(data.user);
    } catch (err) {
      setErrorMessage(err.message || "Email ឬ Password មិនត្រឹមត្រូវ!");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("customers").insert([
      { full_name: newCustName, phone: newCustPhone, created_by: currentUser.id }
    ]);

    setIsSubmitting(false);
    if (!error) {
      setShowAddCustomerModal(false);
      setNewCustName("");
      setNewCustPhone("");
      loadAllData();
    } else {
      alert("មានបញ្ហា៖ " + error.message);
    }
  };

  const handleOpenEditCust = (cust) => {
    setEditingCust(cust);
    setEditCustName(cust.full_name || "");
    setEditCustPhone(cust.phone || "");
    setShowEditCustModal(true);
  };

  const handleSaveEditCust = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("customers")
      .update({ full_name: editCustName, phone: editCustPhone })
      .eq("id", editingCust.id);

    if (!error) {
      await supabase
        .from("loans")
        .update({ borrower_name: editCustName, phone: editCustPhone })
        .eq("customer_id", editingCust.id);

      setShowEditCustModal(false);
      loadAllData();
    } else {
      alert("កែប្រែមិនជោគជ័យ៖ " + error.message);
    }
    setIsSubmitting(false);
  };

  // បង្កើតកម្ចីថ្មី + បង្កើតតារាងកាលវិភាគបង់ប្រាក់ប្រចាំខែ (Auto Schedule Generation)
  const handleCreateLoanForCustomer = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const principal = parseFloat(totalAmount);
    const months = parseInt(termMonths) || 6;
    const dueDay = parseInt(paymentDay) || 5;

    let monthlyInterest = 0;
    if (interestType === "percentage") {
      monthlyInterest = (principal * parseFloat(interestRate || 0)) / 100;
    } else {
      monthlyInterest = parseFloat(interestAmount || 0);
    }

    const newLoan = {
      customer_id: selectedCustomerForLoan.id,
      borrower_name: selectedCustomerForLoan.full_name,
      phone: selectedCustomerForLoan.phone,
      currency,
      total_amount: principal,
      paid_amount: 0,
      term_months: months,
      interest_type: interestType,
      interest_rate: interestType === "percentage" ? parseFloat(interestRate || 0) : 0,
      interest_amount: monthlyInterest,
      interest_currency: interestType === "fixed" ? interestCurrency : currency,
      payment_day: dueDay,
      collateral: collateral,
      status: "កំពុងដំណើរការ",
      created_by: currentUser.id,
    };

    const { data: createdLoan, error } = await supabase
      .from("loans")
      .insert([newLoan])
      .select()
      .single();

    if (error) {
      alert("មានបញ្ហា៖ " + error.message);
      setIsSubmitting(false);
      return;
    }

    // គណនា និងបង្កើតជួរកាលវិភាគបង់ប្រាក់ប្រចាំខែ (1 ដល់ N ខែ)
    const scheduleRows = [];
    const today = new Date();
    let remBalance = principal;
    const monthlyPrincipal = repaymentStyle === "installment" ? Math.round((principal / months) * 100) / 100 : 0;

    for (let i = 1; i <= months; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, dueDay);
      const monthLabel = `${KHMER_MONTHS[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
      const dueDateStr = targetDate.toISOString().split("T")[0];

      let pDue = 0;
      if (repaymentStyle === "installment") {
        pDue = i === months ? remBalance : monthlyPrincipal;
      } else {
        // បង់តែការប្រាក់រាល់ខែ ហើយបង់ដើមនៅខែចុងក្រោយ
        pDue = i === months ? principal : 0;
      }

      remBalance = Math.max(0, Math.round((remBalance - pDue) * 100) / 100);

      scheduleRows.push({
        loan_id: createdLoan.id,
        installment_no: i,
        month_label: monthLabel,
        due_date: dueDateStr,
        principal_due: pDue,
        interest_due: monthlyInterest,
        total_due: pDue + monthlyInterest,
        remaining_balance: remBalance,
        status: "unpaid",
        created_by: currentUser.id
      });
    }

    await supabase.from("loan_schedules").insert(scheduleRows);

    setIsSubmitting(false);
    setShowAddLoanModal(false);
    setTotalAmount("");
    setInterestRate("2");
    setInterestAmount("");
    setCollateral("");
    loadAllData();
    setExpandedCustomerId(selectedCustomerForLoan.id);
    handleOpenLoanDetail(createdLoan, "schedule");
  };

  const handleOpenEditLoan = (loan) => {
    setEditingLoan(loan);
    setEditInterestType(loan.interest_type || "percentage");
    setEditInterestRate(loan.interest_rate || "2");
    setEditInterestAmount(loan.interest_amount || "");
    setEditPaymentDay(loan.payment_day || "5");
    setEditCollateral(loan.collateral || "");
    setShowEditLoanModal(true);
  };

  const handleSaveEditLoan = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    let finalInterestValue = 0;
    if (editInterestType === "percentage") {
      finalInterestValue = (parseFloat(editingLoan.total_amount) * parseFloat(editInterestRate || 0)) / 100;
    } else {
      finalInterestValue = parseFloat(editInterestAmount || 0);
    }

    const { error } = await supabase
      .from("loans")
      .update({
        interest_type: editInterestType,
        interest_rate: editInterestType === "percentage" ? parseFloat(editInterestRate || 0) : 0,
        interest_amount: finalInterestValue,
        payment_day: parseInt(editPaymentDay) || 5,
        collateral: editCollateral
      })
      .eq("id", editingLoan.id);

    setIsSubmitting(false);
    if (!error) {
      setShowEditLoanModal(false);
      loadAllData();
    } else {
      alert("កែប្រែកម្ចីមិនជោគជ័យ៖ " + error.message);
    }
  };

  const handleDeleteLoan = async (loan) => {
    const confirmDelete = window.confirm("តើប្អូនពិតជាចង់លុបកិច្ចសន្យាកម្ចីនេះមែនទេ?");
    if (!confirmDelete) return;

    await supabase.from("loan_schedules").delete().eq("loan_id", loan.id);
    await supabase.from("payments").delete().eq("loan_id", loan.id);
    const { error } = await supabase.from("loans").delete().eq("id", loan.id);

    if (!error) {
      if (selectedLoanForDetail && selectedLoanForDetail.id === loan.id) {
        setSelectedLoanForDetail(null);
      }
      loadAllData();
    } else {
      alert("បញ្ហាក្នុងការលុប៖ " + error.message);
    }
  };

  const handleDeleteCustomer = async (cust) => {
    const confirmDelete = window.confirm(
      `តើប្អូនពិតជាចង់លុបអតិថិជន "${cust.full_name}" និងរាល់កម្ចីទាំងអស់របស់គាត់មែនទេ?`
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from("customers").delete().eq("id", cust.id);
    if (!error) {
      loadAllData();
    } else {
      alert("បញ្ហាក្នុងការលុប៖ " + error.message);
    }
  };

  // កត់ត្រាការបង់ប្រាក់ + Update Schedule Item
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const amountToPay = parseFloat(payAmountInput);
    if (!amountToPay || amountToPay <= 0) return;

    setIsSubmitting(true);
    const recordedUserName = currentUser.full_name || currentUser.email.split("@")[0];

    const paymentRecord = {
      loan_id: targetLoan.id,
      payment_type: payType,
      amount: amountToPay,
      currency: targetLoan.currency,
      for_month: selectedMonth,
      note: payNote,
      recorded_by: recordedUserName,
      created_by: currentUser.id,
    };

    const { data: insertedPayment, error: pError } = await supabase
      .from("payments")
      .insert([paymentRecord])
      .select()
      .single();

    if (pError) {
      alert("បញ្ហាកត់ត្រា Payment: " + pError.message);
      setIsSubmitting(false);
      return;
    }

    // ប្រសិនបើបង់តាមជួរកាលវិភាគ (Schedule) សូម Mark ជួរនោះថា 'paid'
    if (targetScheduleItem) {
      await supabase
        .from("loan_schedules")
        .update({ status: "paid", paid_date: new Date().toISOString() })
        .eq("id", targetScheduleItem.id);
    }

    let updatedRemaining = targetLoan.total_amount - targetLoan.paid_amount;

    if (payType === "principal") {
      // បើបង់រំលោះទាំងដើមនិងការ ដកចំណែកការប្រាក់ចេញដើម្បីកាត់ដើមពិតប្រាកដ (ឬកាត់តាមចំនួនជាក់ស្ដែង)
      const principalReduced = targetScheduleItem && targetScheduleItem.principal_due > 0
        ? Math.min(amountToPay, targetScheduleItem.principal_due)
        : amountToPay;

      const newPaid = Number(targetLoan.paid_amount) + principalReduced;
      const isCompleted = newPaid >= Number(targetLoan.total_amount);
      updatedRemaining = Math.max(0, targetLoan.total_amount - newPaid);

      await supabase
        .from("loans")
        .update({
          paid_amount: newPaid,
          status: isCompleted ? "បានទូទាត់រួចរាល់" : "កំពុងដំណើរការ",
        })
        .eq("id", targetLoan.id);
    }

    setIsSubmitting(false);
    setShowPayModal(false);
    loadAllData();

    setReceiptData({
      ...insertedPayment,
      borrower_name: targetLoan.borrower_name,
      phone: targetLoan.phone,
      remaining_principal: updatedRemaining,
      loan_currency: targetLoan.currency
    });

    if (selectedLoanForDetail && selectedLoanForDetail.id === targetLoan.id) {
      handleOpenLoanDetail(targetLoan, detailSubTab);
      const { data: updatedLoan } = await supabase.from("loans").select("*").eq("id", targetLoan.id).single();
      if (updatedLoan) setSelectedLoanForDetail(updatedLoan);
    }
  };

  const handleDeletePayment = async (payment) => {
    const confirmDelete = window.confirm("តើប្អូនពិតជាចង់លុបទិន្នន័យបង់ប្រាក់នេះមែនទេ?");
    if (!confirmDelete) return;

    if (payment.payment_type === "principal") {
      const restoredPaid = Math.max(0, Number(selectedLoanForDetail.paid_amount) - Number(payment.amount));
      await supabase
        .from("loans")
        .update({
          paid_amount: restoredPaid,
          status: "កំពុងដំណើរការ",
        })
        .eq("id", selectedLoanForDetail.id);
    }

    const { error } = await supabase.from("payments").delete().eq("id", payment.id);
    if (!error) {
      handleOpenLoanDetail(selectedLoanForDetail, "history");
      loadAllData();
      const { data: updatedLoan } = await supabase.from("loans").select("*").eq("id", selectedLoanForDetail.id).single();
      if (updatedLoan) setSelectedLoanForDetail(updatedLoan);
    }
  };

  // មុខងារ 1-Click Copy សាររំលឹកបង់ប្រាក់ជាភាសាខ្មែរ
  const copyReminderMessage = (loan) => {
    const now = new Date();
    const curMonth = `${KHMER_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    const amtText = loan.interest_type === "fixed"
      ? formatMoney(loan.interest_amount, loan.interest_currency || loan.currency)
      : formatMoney(loan.interest_amount, loan.currency);

    const message = `សួស្តីបង ${loan.borrower_name} ថ្ងៃទី ${loan.payment_day || 5} នេះដល់កំណត់បង់ការប្រាក់ប្រចាំ${curMonth} ចំនួន ${amtText} ហើយ។ សូមអរគុណបង!`;
    navigator.clipboard.writeText(message);
    setCopiedId(loan.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatMoney = (amount, cur = "USD") => {
    const num = Number(amount || 0).toLocaleString();
    return cur === "KHR" ? `${num} ៛` : `$${num}`;
  };

  const getLoanDueStatus = (loan) => {
    if (loan.status === "បានទូទាត់រួចរាល់") return { label: "រួចរាល់", color: "bg-emerald-100 text-emerald-800", priority: 4 };
    const today = new Date();
    const currentDay = today.getDate();
    const targetDay = loan.payment_day || 5;

    if (currentDay > targetDay) {
      return { label: `ហួសកំណត់ (${currentDay - targetDay} ថ្ងៃ)`, color: "bg-rose-100 text-rose-700 animate-pulse font-bold", priority: 1 };
    } else if (currentDay === targetDay) {
      return { label: `ដល់ថ្ងៃបង់ថ្ងៃនេះ!`, color: "bg-amber-500 text-white font-bold", priority: 1 };
    } else if (targetDay - currentDay <= 3) {
      return { label: `ជិតដល់ថ្ងៃ (នៅសល់ ${targetDay - currentDay} ថ្ងៃ)`, color: "bg-amber-100 text-amber-800 font-semibold", priority: 2 };
    }
    return { label: `ថ្ងៃកំណត់ទី ${targetDay}`, color: "bg-blue-50 text-blue-700", priority: 3 };
  };

  // បញ្ជីត្រូវប្រមូលប្រាក់ប្រចាំថ្ងៃ (Today's Collection & Overdue Priority List)
  const collectionAlerts = useMemo(() => {
    return loans
      .filter((l) => l.status === "កំពុងដំណើរការ")
      .map((l) => ({ ...l, dueInfo: getLoanDueStatus(l) }))
      .filter((l) => l.dueInfo.priority <= 2)
      .sort((a, b) => a.dueInfo.priority - b.dueInfo.priority);
  }, [loans]);

  // ស្ថិតិ និងការវិភាគហិរញ្ញវត្ថុ (Analytics & Daily Cash Closing)
  const analyticsData = useMemo(() => {
    let disbursedUSD = 0, disbursedKHR = 0;
    let outstandingUSD = 0, outstandingKHR = 0;
    let totalInterestUSD = 0, totalInterestKHR = 0;
    let todayCollectedUSD = 0, todayCollectedKHR = 0;
    let overdueCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    loans.forEach((l) => {
      const rem = l.total_amount - l.paid_amount;
      if (l.currency === "KHR") {
        disbursedKHR += Number(l.total_amount || 0);
        outstandingKHR += rem;
      } else {
        disbursedUSD += Number(l.total_amount || 0);
        outstandingUSD += rem;
      }
      if (l.status === "កំពុងដំណើរការ" && new Date().getDate() >= (l.payment_day || 5)) {
        overdueCount++;
      }
    });

    // បូកសរុបចំណូលតាមខែសម្រាប់ក្រាហ្វិក
    const monthlyMap = {};
    payments.forEach((p) => {
      const isToday = p.payment_date && p.payment_date.startsWith(todayStr);
      if (isToday) {
        if (p.currency === "KHR") todayCollectedKHR += Number(p.amount || 0);
        else todayCollectedUSD += Number(p.amount || 0);
      }

      if (p.payment_type === "interest_only") {
        if (p.currency === "KHR") totalInterestKHR += Number(p.amount || 0);
        else totalInterestUSD += Number(p.amount || 0);
      }

      const mKey = p.for_month || "ផ្សេងៗ";
      if (!monthlyMap[mKey]) {
        monthlyMap[mKey] = { month: mKey, usd: 0, khr: 0 };
      }
      if (p.currency === "KHR") monthlyMap[mKey].khr += Number(p.amount || 0);
      else monthlyMap[mKey].usd += Number(p.amount || 0);
    });

    const monthlySeries = Object.values(monthlyMap).slice(-6);
    const maxUSD = Math.max(1, ...monthlySeries.map((m) => m.usd));

    return {
      disbursedUSD, disbursedKHR,
      outstandingUSD, outstandingKHR,
      totalInterestUSD, totalInterestKHR,
      todayCollectedUSD, todayCollectedKHR,
      totalCustomers: customers.length,
      overdueCount,
      monthlySeries,
      maxUSD
    };
  }, [loans, customers, payments]);

  const customerListWithLoans = useMemo(() => {
    return customers.map((c) => {
      const cLoans = loans.filter((l) => l.customer_id === c.id);
      let totalRemainingUSD = 0, totalRemainingKHR = 0;
      let hasActive = false, hasOverdue = false;

      cLoans.forEach((l) => {
        const rem = l.total_amount - l.paid_amount;
        if (l.currency === "KHR") totalRemainingKHR += rem;
        else totalRemainingUSD += rem;
        if (l.status === "កំពុងដំណើរការ") {
          hasActive = true;
          if (new Date().getDate() > (l.payment_day || 5)) hasOverdue = true;
        }
      });

      return {
        ...c,
        loansList: cLoans,
        totalRemainingUSD,
        totalRemainingKHR,
        hasActiveLoans: hasActive,
        hasOverdue,
        loansCount: cLoans.length
      };
    });
  }, [customers, loans]);

  const filteredCustomers = useMemo(() => {
    return customerListWithLoans.filter((c) => {
      const matchSearch =
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery);
      if (!matchSearch) return false;
      if (statusFilter === "active") return c.hasActiveLoans;
      if (statusFilter === "completed") return c.loansCount > 0 && !c.hasActiveLoans;
      if (statusFilter === "overdue") return c.hasOverdue;
      return true;
    });
  }, [customerListWithLoans, searchQuery, statusFilter]);

  const exportToExcelCSV = () => {
    if (loans.length === 0) {
      alert("មិនមានទិន្នន័យសម្រាប់ Export ឡើយ!");
      return;
    }

    const headers = [
      "ឈ្មោះអតិថិជន", "លេខទូរស័ព្ទ", "រូបិយប័ណ្ណ", "ប្រាក់ដើមសរុប",
      "បានសងរួច", "ប្រាក់ដើមនៅសល់", "ការប្រាក់ប្រចាំខែ", "រយៈពេលខ្ចី", "ថ្ងៃកំណត់បង់", "ទ្រព្យបញ្ចាំ", "ស្ថានភាព"
    ];

    const rows = loans.map((l) => [
      `"${l.borrower_name || ""}"`,
      `"${l.phone || ""}"`,
      `"${l.currency || "USD"}"`,
      l.total_amount || 0,
      l.paid_amount || 0,
      (l.total_amount || 0) - (l.paid_amount || 0),
      l.interest_type === "fixed" ? `${l.interest_amount}` : `${l.interest_rate}%`,
      `"${l.term_months || 6} ខែ"`,
      `"ថ្ងៃទី ${l.payment_day || 5}"`,
      `"${l.collateral || "-"}"`,
      `"${l.status || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `របាយការណ៍កម្ចី_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-1">ប្រព័ន្ធគ្រប់គ្រងប្រាក់កម្ចី</h2>
          <p className="text-sm text-slate-500 text-center mb-6">សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់របស់អ្នក</p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">អ៊ីមែល</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@loan.com"
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">លេខសម្ងាត់</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition shadow-sm"
            >
              {authLoading ? "កំពុងត្រួតពិនិត្យ..." : "ចូលប្រើប្រព័ន្ធ (Login)"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap justify-between items-center gap-3 shadow-sm sticky top-0 z-30">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">ប្រព័ន្ធគ្រប់គ្រងកម្ចី & ហិរញ្ញវត្ថុ</h1>
          <p className="text-xs text-slate-500">
            គណនី៖ <span className="font-semibold text-slate-700">{currentUser.full_name || currentUser.email}</span> | សិទ្ធិ៖{" "}
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
              {currentUser.role || "user"}
            </span>
          </p>
        </div>

        {/* Navigation Switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === "customers" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              📋 អតិថិជន & កម្ចី
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === "analytics" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              📊 វិភាគ & បិទបញ្ជីថ្ងៃ
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition"
          >
            ចាកចេញ
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Summary Cards រួម */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">ប្រមូលបានថ្ងៃនេះ (Daily Cash)</span>
            <p className="text-lg font-bold text-emerald-600 mt-1">+${analyticsData.todayCollectedUSD.toLocaleString()}</p>
            <p className="text-xs font-semibold text-emerald-700">+{analyticsData.todayCollectedKHR.toLocaleString()} ៛</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">ប្រាក់ដើមនៅជំពាក់សរុប</span>
            <p className="text-lg font-bold text-rose-600 mt-1">${analyticsData.outstandingUSD.toLocaleString()}</p>
            <p className="text-xs font-semibold text-rose-700">{analyticsData.outstandingKHR.toLocaleString()} ៛</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">ចំណូលការប្រាក់សរុប</span>
            <p className="text-lg font-bold text-blue-600 mt-1">${analyticsData.totalInterestUSD.toLocaleString()}</p>
            <p className="text-xs font-semibold text-blue-700">{analyticsData.totalInterestKHR.toLocaleString()} ៛</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">ត្រូវតាមទារប្រាក់ (Alerts)</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{collectionAlerts.length} នាក់</p>
            <span className="text-[11px] text-slate-400">ដល់ថ្ងៃបង់ ឬហួសកំណត់</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB ទី ២៖ ផ្ទាំងវិភាគហិរញ្ញវត្ថុ & បញ្ជីប្រមូលប្រាក់ប្រចាំថ្ងៃ */}
        {/* ========================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* ក្រាហ្វិកចំណូលប្រចាំខែ */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">ក្រាហ្វិកចំណូលប្រមូលបានតាមខែ</h3>
                  <p className="text-xs text-slate-500">ប្រៀបធៀបទឹកប្រាក់ប្រមូលបានប្រចាំខែនីមួយៗ</p>
                </div>
                <button
                  onClick={exportToExcelCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition"
                >
                  📊 ទាញយករបាយការណ៍ Excel
                </button>
              </div>

              {analyticsData.monthlySeries.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  មិនទាន់មានទិន្នន័យបង់ប្រាក់គ្រប់គ្រាន់សម្រាប់បង្ហាញក្រាហ្វិកនៅឡើយទេ។
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-4 items-end h-52 border-b border-slate-200 pb-4">
                  {analyticsData.monthlySeries.map((item, idx) => {
                    const heightPct = Math.max(12, Math.round((item.usd / analyticsData.maxUSD) * 100));
                    return (
                      <div key={idx} className="flex flex-col items-center justify-end h-full space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 text-center">
                          {item.usd > 0 && <div>${item.usd.toLocaleString()}</div>}
                          {item.khr > 0 && <div className="text-emerald-600">{item.khr.toLocaleString()}៛</div>}
                        </div>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-12 bg-blue-600 rounded-t-xl transition-all duration-500 hover:bg-blue-700"
                        ></div>
                        <span className="text-[11px] font-semibold text-slate-600 text-center">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ប្រវត្តិទទួលប្រាក់ប្រចាំថ្ងៃ (Daily Cash Closing Log) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">ប្រតិបត្តិការទទួលប្រាក់ថ្មីៗ (បិទបញ្ជីប្រចាំថ្ងៃ)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">កាលបរិច្ឆេទ</th>
                      <th className="py-2.5 px-3">សម្រាប់ខែ</th>
                      <th className="py-2.5 px-3">ប្រភេទ</th>
                      <th className="py-2.5 px-3">ចំនួនទឹកប្រាក់</th>
                      <th className="py-2.5 px-3">បុគ្គលិកទទួល</th>
                      <th className="py-2.5 px-3">ចំណាំ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.slice(0, 15).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-600">
                          {new Date(p.payment_date).toLocaleString("km-KH", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">{p.for_month}</td>
                        <td className="py-2.5 px-3">
                          {p.payment_type === "interest_only" ? "បង់ការប្រាក់" : "បង់រំលោះដើម"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">{formatMoney(p.amount, p.currency)}</td>
                        <td className="py-2.5 px-3 font-medium">👤 {p.recorded_by || "Staff"}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.note || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB ទី ១៖ បញ្ជីអតិថិជន កាលវិភាគបង់ប្រាក់ និង ការតាមទារប្រាក់ */}
        {/* ========================================================= */}
        {activeTab === "customers" && (
          <>
            {/* បញ្ជីអតិថិជនត្រូវប្រមូលប្រាក់បន្ទាន់ (Today's Collection & Overdue Priority Box) */}
            {collectionAlerts.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    🔔 បញ្ជីអតិថិជនដល់ថ្ងៃបង់ ឬហួសកំណត់ ({collectionAlerts.length})
                  </h3>
                  <span className="text-[11px] text-amber-700">ចុច «Copy សាររំលឹក» ដើម្បីផ្ញើតាម Telegram</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {collectionAlerts.map((loan) => (
                    <div key={loan.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-slate-900">{loan.borrower_name}</p>
                          <p className="text-xs text-slate-500">📞 {loan.phone}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${loan.dueInfo.color}`}>
                          {loan.dueInfo.label}
                        </span>
                      </div>

                      <div className="text-xs bg-slate-50 p-2 rounded-lg flex justify-between">
                        <span className="text-slate-500">ការប្រាក់ត្រូវបង់៖</span>
                        <span className="font-bold text-blue-600">
                          {formatMoney(loan.interest_amount, loan.interest_currency || loan.currency)}
                        </span>
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => copyReminderMessage(loan)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-1.5 rounded-lg transition"
                        >
                          {copiedId === loan.id ? "✅ បាន Copy សារ!" : "📋 Copy សាររំលឹក"}
                        </button>
                        <button
                          onClick={() => handleOpenPayModal(loan)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-1.5 rounded-lg transition"
                        >
                          + កត់ត្រាបង់
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">បញ្ជីអតិថិជន និងកិច្ចសន្យាកម្ចី</h2>
                <p className="text-xs text-slate-500">ចុចលើឈ្មោះអតិថិជនដើម្បីបើកមើលតារាងកាលវិភាគបង់ប្រាក់ប្រចាំខែ</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcelCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <span>📊</span> Export Excel
                </button>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <span>+</span> បង្កើតអតិថិជនថ្មី
                </button>
              </div>
            </div>

            {/* Search Bar & Filter Tabs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="🔍 វាយឈ្មោះ ឬលេខទូរស័ព្ទ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-stretch md:self-auto overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${statusFilter === "all" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
                >
                  ទាំងអស់ ({customerListWithLoans.length})
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${statusFilter === "active" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
                >
                  កំពុងជំពាក់
                </button>
                <button
                  onClick={() => setStatusFilter("overdue")}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${statusFilter === "overdue" ? "bg-white text-rose-700 shadow-sm" : "text-slate-600"}`}
                >
                  ហួសកំណត់ ({analyticsData.overdueCount})
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${statusFilter === "completed" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
                >
                  សងដាច់រួច
                </button>
              </div>
            </div>

            {/* តារាង Accordion អតិថិជន */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {loadingData ? (
                <div className="p-8 text-center text-slate-500">កំពុងទាញទិន្នន័យ...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-10 text-center text-slate-400">មិនទាន់មានអតិថិជននៅឡើយទេ។ ចុច «+ បង្កើតអតិថិជនថ្មី» ដើម្បីចាប់ផ្ដើម!</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 w-10"></th>
                        <th className="py-3 px-4">ឈ្មោះអតិថិជន</th>
                        <th className="py-3 px-4">លេខទូរស័ព្ទ</th>
                        <th className="py-3 px-4">ចំនួនកម្ចី</th>
                        <th className="py-3 px-4">បំណុលនៅសល់ ($)</th>
                        <th className="py-3 px-4">បំណុលនៅសល់ (៛)</th>
                        <th className="py-3 px-4 text-center">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.map((cust) => {
                        const isExpanded = expandedCustomerId === cust.id;
                        return (
                          <React.Fragment key={cust.id}>
                            <tr
                              className={`hover:bg-blue-50/40 cursor-pointer transition ${isExpanded ? "bg-blue-50/30" : ""}`}
                              onClick={() => setExpandedCustomerId(isExpanded ? null : cust.id)}
                            >
                              <td className="py-3.5 px-4 text-slate-400 text-xs">
                                {isExpanded ? "▼" : "▶"}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">{cust.full_name}</td>
                              <td className="py-3.5 px-4 text-slate-600">{cust.phone}</td>
                              <td className="py-3.5 px-4">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                  {cust.loansCount} កម្ចី
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-rose-600">
                                {cust.totalRemainingUSD > 0 ? formatMoney(cust.totalRemainingUSD, "USD") : "-"}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-rose-600">
                                {cust.totalRemainingKHR > 0 ? formatMoney(cust.totalRemainingKHR, "KHR") : "-"}
                              </td>
                              <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedCustomerForLoan(cust);
                                      setShowAddLoanModal(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1.5 rounded-lg transition font-medium"
                                  >
                                    + បន្ថែមកម្ចី
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditCust(cust)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg transition font-medium"
                                  >
                                    កែប្រែ
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCustomer(cust)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs px-2.5 py-1.5 rounded-lg transition font-semibold"
                                  >
                                    លុប
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Accordion Detail */}
                            {isExpanded && (
                              <tr className="bg-slate-50/70 border-b border-slate-200">
                                <td colSpan="7" className="p-4 sm:p-6">
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">
                                        កិច្ចសន្យាកម្ចីរបស់ {cust.full_name} ({cust.loansList.length})
                                      </h4>
                                      <button
                                        onClick={() => {
                                          setSelectedCustomerForLoan(cust);
                                          setShowAddLoanModal(true);
                                        }}
                                        className="text-xs text-blue-600 font-semibold hover:underline"
                                      >
                                        + បន្ថែមកម្ចីថ្មីទៀត
                                      </button>
                                    </div>

                                    {cust.loansList.length === 0 ? (
                                      <div className="text-center py-4 text-xs text-slate-400">
                                        មិនទាន់មានកិច្ចសន្យាកម្ចីនៅឡើយទេ។
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                            <tr>
                                              <th className="py-2.5 px-3">ប្រាក់ដើម</th>
                                              <th className="py-2.5 px-3">ការប្រាក់/ខែ</th>
                                              <th className="py-2.5 px-3">រយៈពេល</th>
                                              <th className="py-2.5 px-3">នៅសល់</th>
                                              <th className="py-2.5 px-3">ទ្រព្យបញ្ចាំ</th>
                                              <th className="py-2.5 px-3">ស្ថានភាពថ្ងៃបង់</th>
                                              <th className="py-2.5 px-3 text-center">សកម្មភាព</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {cust.loansList.map((loan) => {
                                              const rem = loan.total_amount - loan.paid_amount;
                                              const cur = loan.currency || "USD";
                                              const dueStatus = getLoanDueStatus(loan);

                                              return (
                                                <tr key={loan.id} className="hover:bg-slate-50">
                                                  <td className="py-3 px-3 font-bold text-slate-900">{formatMoney(loan.total_amount, cur)}</td>
                                                  <td className="py-3 px-3 text-blue-600 font-medium">
                                                    {loan.interest_type === "fixed"
                                                      ? formatMoney(loan.interest_amount, loan.interest_currency || cur)
                                                      : `${loan.interest_rate}% (${formatMoney(loan.interest_amount, cur)})`}
                                                  </td>
                                                  <td className="py-3 px-3 text-slate-600">{loan.term_months || 6} ខែ</td>
                                                  <td className="py-3 px-3 text-rose-600 font-bold">{formatMoney(rem, cur)}</td>
                                                  <td className="py-3 px-3 text-slate-500">{loan.collateral || "-"}</td>
                                                  <td className="py-3 px-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${dueStatus.color}`}>
                                                      {dueStatus.label}
                                                    </span>
                                                  </td>
                                                  <td className="py-3 px-3 text-center space-x-1.5">
                                                    <button
                                                      onClick={() => handleOpenLoanDetail(loan, "schedule")}
                                                      className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-2.5 py-1 rounded-lg transition font-semibold"
                                                    >
                                                      📅 តារាងបង់ប្រចាំខែ
                                                    </button>
                                                    <button
                                                      onClick={() => handleOpenPayModal(loan)}
                                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1 rounded-lg transition"
                                                    >
                                                      + បង់ផ្សេងៗ
                                                    </button>
                                                    <button
                                                      onClick={() => handleOpenEditLoan(loan)}
                                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2 py-1 rounded-lg transition"
                                                    >
                                                      កែប្រែ
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteLoan(loan)}
                                                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] px-2 py-1 rounded-lg transition font-semibold"
                                                    >
                                                      លុប
                                                    </button>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* ផ្ទាំងលម្អិត៖ តារាងកាលវិភាគបង់ប្រាក់ប្រចាំខែ (Schedule) & ប្រវត្តិ (History) */}
            {/* ================================================================= */}
            {selectedLoanForDetail && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        កិច្ចសន្យាកម្ចី៖ {selectedLoanForDetail.borrower_name}
                      </h3>
                      <button
                        onClick={() => setSelectedLoanForDetail(null)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg"
                      >
                        បិទផ្ទាំងនេះ
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      ទូរស័ព្ទ៖ {selectedLoanForDetail.phone} | ថ្ងៃកំណត់បង់៖ <b>ថ្ងៃទី {selectedLoanForDetail.payment_day || 5}</b> | ទ្រព្យបញ្ចាំ៖ <b>{selectedLoanForDetail.collateral || "គ្មាន"}</b>
                    </p>
                  </div>

                  <div className="flex gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">ប្រាក់ដើមសរុប</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {formatMoney(selectedLoanForDetail.total_amount, selectedLoanForDetail.currency)}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                      <span className="text-slate-500 block">សងដើមរួច</span>
                      <span className="font-bold text-emerald-600 text-sm">
                        {formatMoney(selectedLoanForDetail.paid_amount, selectedLoanForDetail.currency)}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                      <span className="text-slate-500 block">ប្រាក់ដើមនៅសល់</span>
                      <span className="font-bold text-rose-600 text-sm">
                        {formatMoney(selectedLoanForDetail.total_amount - selectedLoanForDetail.paid_amount, selectedLoanForDetail.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs: តារាងកាលវិភាគ vs ប្រវត្តិបង់ប្រាក់ */}
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                  <button
                    onClick={() => setDetailSubTab("schedule")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      detailSubTab === "schedule" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    📅 តារាងកាលវិភាគបង់ប្រចាំខែ ({loanScheduleList.length} ដំណាក់កាល)
                  </button>
                  <button
                    onClick={() => setDetailSubTab("history")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      detailSubTab === "history" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    🧾 ប្រវត្តិបានបង់រួច ({paymentsHistory.length})
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-6 text-xs text-slate-500">កំពុងទាញទិន្នន័យ...</div>
                ) : detailSubTab === "schedule" ? (
                  /* តារាងកាលវិភាគប្រចាំខែ (Amortization / Monthly Schedule Table) */
                  <div className="overflow-x-auto">
                    {loanScheduleList.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl">
                        កម្ចីចាស់នេះមិនទាន់មានតារាងកាលវិភាគស្វ័យប្រវត្តិទេ។ អ្នកអាចចុច «+ បង់ផ្សេងៗ» ដើម្បីកត់ត្រាបានធម្មតា។
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">លើកទី</th>
                            <th className="py-2.5 px-3">ខែត្រូវបង់</th>
                            <th className="py-2.5 px-3">ថ្ងៃកំណត់</th>
                            <th className="py-2.5 px-3">ប្រាក់ដើមត្រូវបង់</th>
                            <th className="py-2.5 px-3">ការប្រាក់ត្រូវបង់</th>
                            <th className="py-2.5 px-3">សរុបត្រូវបង់</th>
                            <th className="py-2.5 px-3">ដើមនៅសល់</th>
                            <th className="py-2.5 px-3">ស្ថានភាព</th>
                            <th className="py-2.5 px-3 text-center">បង់រហ័ស (1-Click)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loanScheduleList.map((sch) => {
                            const isPaid = sch.status === "paid";
                            return (
                              <tr key={sch.id} className={isPaid ? "bg-emerald-50/40" : "hover:bg-slate-50"}>
                                <td className="py-2.5 px-3 font-bold text-slate-700">#{sch.installment_no}</td>
                                <td className="py-2.5 px-3 font-bold text-blue-700">{sch.month_label}</td>
                                <td className="py-2.5 px-3 text-slate-600">{sch.due_date}</td>
                                <td className="py-2.5 px-3 font-medium">{formatMoney(sch.principal_due, selectedLoanForDetail.currency)}</td>
                                <td className="py-2.5 px-3 text-amber-700 font-medium">{formatMoney(sch.interest_due, selectedLoanForDetail.currency)}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{formatMoney(sch.total_due, selectedLoanForDetail.currency)}</td>
                                <td className="py-2.5 px-3 text-slate-500">{formatMoney(sch.remaining_balance, selectedLoanForDetail.currency)}</td>
                                <td className="py-2.5 px-3">
                                  {isPaid ? (
                                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ បានបង់រួច</span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">មិនទាន់បង់</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {!isPaid ? (
                                    <button
                                      onClick={() => handleOpenPayModal(selectedLoanForDetail, sch)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg font-semibold transition shadow-sm"
                                    >
                                      បង់ខែនេះ
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-emerald-600 font-medium">រួចរាល់</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  /* តារាងប្រវត្តិបានបង់រួច (Payments History) */
                  <div className="overflow-x-auto">
                    {paymentsHistory.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl">
                        មិនទាន់មានប្រវត្តិបង់ប្រាក់នៅឡើយទេ។
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">សម្រាប់ខែ</th>
                            <th className="py-2.5 px-3">កាលបរិច្ឆេទ & ម៉ោង</th>
                            <th className="py-2.5 px-3">ប្រភេទនៃការបង់</th>
                            <th className="py-2.5 px-3">ចំនួនទឹកប្រាក់</th>
                            <th className="py-2.5 px-3">ចំណាំ</th>
                            <th className="py-2.5 px-3">អ្នកទទួល</th>
                            <th className="py-2.5 px-3 text-center">សកម្មភាព</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentsHistory.map((pm) => (
                            <tr key={pm.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-blue-700 bg-blue-50/50">{pm.for_month || "មិនបានបញ្ជាក់"}</td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {new Date(pm.payment_date).toLocaleString("km-KH", {
                                  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                })}
                              </td>
                              <td className="py-2.5 px-3 font-semibold">
                                {pm.payment_type === "interest_only" ? (
                                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">បង់តែការប្រាក់</span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">បង់រំលោះប្រាក់ដើម</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{formatMoney(pm.amount, pm.currency)}</td>
                              <td className="py-2.5 px-3 text-slate-500">{pm.note || "-"}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">👤 {pm.recorded_by || "Staff"}</td>
                              <td className="py-2.5 px-3 text-center space-x-1">
                                <button
                                  onClick={() => {
                                    setReceiptData({
                                      ...pm,
                                      borrower_name: selectedLoanForDetail.borrower_name,
                                      phone: selectedLoanForDetail.phone,
                                      remaining_principal: selectedLoanForDetail.total_amount - selectedLoanForDetail.paid_amount,
                                      loan_currency: selectedLoanForDetail.currency
                                    });
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-semibold"
                                >
                                  🖨️ ស្លីប
                                </button>
                                <button
                                  onClick={() => handleDeletePayment(pm)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2 py-1 rounded text-[11px] font-semibold transition"
                                >
                                  លុប
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal ផ្ទាំងកត់ត្រាការបង់ប្រាក់ */}
        {showPayModal && targetLoan && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">កត់ត្រាការបង់ប្រាក់</h3>
                  <p className="text-xs text-slate-500">អ្នកខ្ចី៖ <span className="font-semibold text-slate-800">{targetLoan.borrower_name}</span></p>
                </div>
                <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">🗓️ បង់សម្រាប់ខែណា? (Select Month)៖</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      if (payType === "interest_only") setPayNote(`បង់ការប្រាក់ ${e.target.value}`);
                    }}
                    className="w-full border border-blue-300 bg-blue-50/50 rounded-xl p-2.5 text-sm font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTH_OPTIONS.map((m, idx) => (
                      <option key={idx} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ប្រភេទនៃការបង់ប្រាក់៖</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPayType("interest_only");
                        setPayAmountInput(targetLoan.interest_amount || "");
                        setPayNote(`បង់ការប្រាក់ ${selectedMonth}`);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center ${
                        payType === "interest_only"
                          ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-400"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      បង់តែការប្រាក់
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">(មិនកាត់ប្រាក់ដើម)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPayType("principal");
                        setPayAmountInput("");
                        setPayNote(`បង់រំលោះប្រាក់ដើម ${selectedMonth}`);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center ${
                        payType === "principal"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      បង់រំលោះប្រាក់ដើម
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">(កាត់បន្ថយបំណុល)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ចំនួនទឹកប្រាក់ដែលបានទទួល ({targetLoan.currency === "KHR" ? "៛" : "$"})៖
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={payAmountInput}
                    onChange={(e) => setPayAmountInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ចំណាំ (Note)៖</label>
                  <input
                    type="text"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 font-semibold py-2.5 rounded-xl text-white transition text-xs disabled:opacity-50 ${
                      payType === "interest_only" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isSubmitting ? "កំពុងរក្សាទុក..." : "បញ្ជាក់ការបង់ប្រាក់"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal បង្កើត Customer ថ្មី */}
        {showAddCustomerModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-slate-900">បង្កើតអតិថិជនថ្មី</h3>
                <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ឈ្មោះអតិថិជន</label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. San Saklyheng"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    required
                    placeholder="0123456789"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "កំពុងរក្សាទុក..." : "រក្សាទុកអតិថិជន"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal កែប្រែ Customer */}
        {showEditCustModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-slate-900">កែប្រែព័ត៌មានអតិថិជន</h3>
                <button onClick={() => setShowEditCustModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveEditCust} className="space-y-3.5 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ឈ្មោះអតិថិជន</label>
                  <input
                    type="text"
                    required
                    value={editCustName}
                    onChange={(e) => setEditCustName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    required
                    value={editCustPhone}
                    onChange={(e) => setEditCustPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditCustModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    រក្សាទុកការកែប្រែ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal បន្ថែមកម្ចីថ្មី + Auto Schedule Builder */}
        {showAddLoanModal && selectedCustomerForLoan && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4 my-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">បន្ថែមកម្ចីថ្មី</h3>
                  <p className="text-xs text-slate-500">
                    អតិថិជន៖ <span className="font-semibold text-slate-800">{selectedCustomerForLoan.full_name}</span>
                  </p>
                </div>
                <button onClick={() => setShowAddLoanModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateLoanForCustomer} className="space-y-3 text-sm">
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">រូបិយប័ណ្ណ</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold bg-white"
                    >
                      <option value="USD">ដុល្លារ ($)</option>
                      <option value="KHR">រៀល (៛)</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ចំនួនប្រាក់ ({currency === "KHR" ? "៛" : "$"})</label>
                    <input
                      type="number"
                      required
                      placeholder={currency === "KHR" ? "4000000" : "800"}
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5"
                    />
                  </div>
                </div>

                {/* រយៈពេលខ្ចី និង របៀបបង់ */}
                <div className="grid grid-cols-2 gap-2 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">រយៈពេលខ្ចី (ខែ)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      required
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 bg-white font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ថ្ងៃកំណត់បង់ប្រចាំខែ</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={paymentDay}
                      onChange={(e) => setPaymentDay(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 bg-white font-bold text-center"
                    />
                  </div>
                  <div className="col-span-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ទម្រង់តារាងបង់ប្រចាំខែ៖</label>
                    <select
                      value={repaymentStyle}
                      onChange={(e) => setRepaymentStyle(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 text-xs bg-white font-semibold"
                    >
                      <option value="interest_only">បង់តែការប្រាក់រាល់ខែ (ដើមទូទាត់ខែចុងក្រោយ)</option>
                      <option value="installment">បង់រំលោះដើម + ការប្រាក់ស្មើគ្នារាល់ខែ</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <label className="block text-xs font-semibold text-slate-700">គិតការប្រាក់ជា៖</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" name="interestType" value="percentage" checked={interestType === "percentage"} onChange={() => setInterestType("percentage")} />
                      <span>ភាគរយ (%/ខែ)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" name="interestType" value="fixed" checked={interestType === "fixed"} onChange={() => setInterestType("fixed")} />
                      <span>ចំនួនប្រាក់ជាក់ស្តែង</span>
                    </label>
                  </div>

                  {interestType === "percentage" ? (
                    <input
                      type="number"
                      step="0.1"
                      placeholder="ឧ. 2 (%)"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2 bg-white text-sm"
                    />
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={interestCurrency}
                        onChange={(e) => setInterestCurrency(e.target.value)}
                        className="border border-slate-300 rounded-xl px-2.5 py-2 bg-white text-xs font-semibold"
                      >
                        <option value="USD">($)</option>
                        <option value="KHR">(៛)</option>
                      </select>
                      <input
                        type="number"
                        placeholder="ចំនួនការប្រាក់"
                        value={interestAmount}
                        onChange={(e) => setInterestAmount(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-xl p-2 bg-white text-sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ទ្រព្យបញ្ចាំ / អត្តសញ្ញាណប័ណ្ណ (បើមាន)</label>
                  <input
                    type="text"
                    placeholder="ឧ. អត្តសញ្ញាណប័ណ្ណ ឬ កាតគ្រីម៉ូតូ..."
                    value={collateral}
                    onChange={(e) => setCollateral(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLoanModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "កំពុងបង្កើត..." : "រក្សាទុក & បង្កើតតារាងខែ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal កែប្រែកម្ចី */}
        {showEditLoanModal && editingLoan && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-slate-900">កែសម្រួលកម្ចី ({editingLoan.borrower_name})</h3>
                <button onClick={() => setShowEditLoanModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveEditLoan} className="space-y-3.5 text-sm">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">📅 ថ្ងៃកំណត់ត្រូវបង់ប្រចាំខែ</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={editPaymentDay}
                    onChange={(e) => setEditPaymentDay(e.target.value)}
                    className="w-24 border border-slate-300 rounded-xl p-2 text-center text-sm font-bold bg-white"
                  />
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">គិតការប្រាក់ជា៖</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="radio" name="editInterestType" value="percentage" checked={editInterestType === "percentage"} onChange={() => setEditInterestType("percentage")} />
                      <span>ភាគរយ (%/ខែ)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="radio" name="editInterestType" value="fixed" checked={editInterestType === "fixed"} onChange={() => setEditInterestType("fixed")} />
                      <span>ចំនួនប្រាក់ជាក់ស្តែង</span>
                    </label>
                  </div>

                  {editInterestType === "percentage" ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editInterestRate}
                      onChange={(e) => setEditInterestRate(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm"
                    />
                  ) : (
                    <input
                      type="number"
                      value={editInterestAmount}
                      onChange={(e) => setEditInterestAmount(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ទ្រព្យបញ្ចាំ / សម្គាល់</label>
                  <input
                    type="text"
                    value={editCollateral}
                    onChange={(e) => setEditCollateral(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowEditLoanModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl text-xs">
                    បោះបង់
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs">
                    រក្សាទុកការកែប្រែ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal វិក្កយបត្រ (Receipt Modal) */}
        {receiptData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div ref={receiptPrintRef} className="space-y-4 text-center border-b border-dashed border-slate-300 pb-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-lg text-slate-800">បង្កាន់ដៃទទួលប្រាក់កម្ចី</h3>
                  <p className="text-[11px] text-slate-500">ប្រព័ន្ធគ្រប់គ្រងប្រាក់កម្ចី & ហិរញ្ញវត្ថុ</p>
                </div>

                <div className="text-left text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>លេខវិក្កយបត្រ៖</span>
                    <span className="font-semibold text-slate-900">#REC-{receiptData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>កាលបរិច្ឆេទ៖</span>
                    <span className="font-medium">
                      {new Date(receiptData.payment_date).toLocaleString("km-KH", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>អតិថិជន៖</span>
                    <span className="font-bold text-slate-900">{receiptData.borrower_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>សម្រាប់ខែ៖</span>
                    <span className="font-semibold text-blue-700">{receiptData.for_month}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 my-2">
                  <span className="text-xs text-slate-500 block">ចំនួនទឹកប្រាក់ទទួលបាន</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatMoney(receiptData.amount, receiptData.currency)}
                  </span>
                </div>

                <div className="text-left text-xs space-y-1 border-t border-slate-100 pt-2 text-slate-600">
                  <div className="flex justify-between">
                    <span>ប្រាក់ដើមនៅជំពាក់សល់៖</span>
                    <span className="font-bold text-rose-600">
                      {formatMoney(receiptData.remaining_principal, receiptData.loan_currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>បុគ្គលិកទទួលប្រាក់៖</span>
                    <span className="font-semibold text-slate-800">{receiptData.recorded_by || "Staff"}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setReceiptData(null)} className="flex-1 bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 rounded-xl">
                  បិទ
                </button>
                <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl">
                  🖨️ បោះពុម្ព (Print)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}