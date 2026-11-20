import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // States ទិន្នន័យ
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal បង្កើត Customer ថ្មី
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  // Modal កែប្រែ Customer (Edit Customer)
  const [showEditCustModal, setShowEditCustModal] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");

  // Modal បន្ថែមកម្ចីថ្មី
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [selectedCustomerForLoan, setSelectedCustomerForLoan] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [totalAmount, setTotalAmount] = useState("");
  const [interestType, setInterestType] = useState("percentage");
  const [interestRate, setInterestRate] = useState("2");
  const [interestAmount, setInterestAmount] = useState("");
  const [interestCurrency, setInterestCurrency] = useState("USD");
  const [paymentDay, setPaymentDay] = useState("5");

  // Modal កែប្រែកម្ចី (Edit Loan)
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editInterestType, setEditInterestType] = useState("percentage");
  const [editInterestRate, setEditInterestRate] = useState("2");
  const [editInterestAmount, setEditInterestAmount] = useState("");
  const [editPaymentDay, setEditPaymentDay] = useState("5");

  // Modal កត់ត្រាការបង់ប្រាក់
  const [showPayModal, setShowPayModal] = useState(false);
  const [targetLoan, setTargetLoan] = useState(null);
  const [payType, setPayType] = useState("interest_only");
  const [payAmountInput, setPayAmountInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("ខែមីនា 2026");
  const [payNote, setPayNote] = useState("");

  // Modal ប្រវត្តិបង់ប្រាក់លម្អិត
  const [selectedLoanForHistory, setSelectedLoanForHistory] = useState(null);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal វិក្កយបត្រ (Receipt)
  const [receiptData, setReceiptData] = useState(null);
  const receiptPrintRef = useRef();

  const MONTH_OPTIONS = [
    "ខែមករា 2026", "ខែកុម្ភៈ 2026", "ខែមីនា 2026", "ខែមេសា 2026",
    "ខែឧសភា 2026", "ខែមិថុនា 2026", "ខែកក្កដា 2026", "ខែសីហា 2026",
    "ខែកញ្ញា 2026", "ខែតុលា 2026", "ខែវិច្ឆិកា 2026", "ខែធ្នូ 2026",
    "ខែមករា 2027", "ខែកុម្ភៈ 2027", "ខែមីនា 2027"
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

    // ទាញទិន្នន័យ (Supabase RLS នឹងច្រោះឱ្យដោយស្វ័យប្រវត្តិ ហើយយើងក៏ filter បន្ថែមដើម្បីសុក្រឹតភាព)
    let custQuery = supabase.from("customers").select("*").order("created_at", { ascending: false });
    let loanQuery = supabase.from("loans").select("*").order("created_at", { ascending: false });

    const isAdminUser = user.role === "admin" || user.role === "super-admin";
    if (!isAdminUser) {
      custQuery = custQuery.eq("created_by", user.id);
      loanQuery = loanQuery.eq("created_by", user.id);
    }

    const [cRes, lRes] = await Promise.all([custQuery, loanQuery]);

    setCustomers(cRes.data || []);
    setLoans(lRes.data || []);
    setLoadingData(false);
  };

  const fetchPaymentHistory = async (loanId) => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("loan_id", loanId)
      .order("payment_date", { ascending: false });

    if (!error && data) setPaymentsHistory(data);
    setLoadingHistory(false);
  };

  const handleOpenDetail = (loan) => {
    setSelectedLoanForHistory(loan);
    fetchPaymentHistory(loan.id);
  };

  const handleOpenPayModal = (loan) => {
    setTargetLoan(loan);
    setPayAmountInput(loan.interest_amount || "");
    setPayType("interest_only");
    setSelectedMonth("ខែមីនា 2026");
    setPayNote("បង់ការប្រាក់ប្រចាំខែ");
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

  // បង្កើត Customer ថ្មី (ភ្ជាប់ created_by: currentUser.id)
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("customers").insert([
      { 
        full_name: newCustName, 
        phone: newCustPhone,
        created_by: currentUser.id 
      }
    ]);

    if (!error) {
      setShowAddCustomerModal(false);
      setNewCustName("");
      setNewCustPhone("");
      loadAllData();
    } else {
      alert("មានបញ្ហា៖ " + error.message);
    }
  };

  // កែប្រែព័ត៌មាន Customer
  const handleOpenEditCust = (cust) => {
    setEditingCust(cust);
    setEditCustName(cust.full_name || "");
    setEditCustPhone(cust.phone || "");
    setShowEditCustModal(true);
  };

  const handleSaveEditCust = async (e) => {
    e.preventDefault();
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
  };

  // បន្ថែមកម្ចីថ្មី (ភ្ជាប់ created_by: currentUser.id)
  const handleCreateLoanForCustomer = async (e) => {
    e.preventDefault();
    let finalInterestValue = 0;
    if (interestType === "percentage") {
      finalInterestValue = (parseFloat(totalAmount) * parseFloat(interestRate || 0)) / 100;
    } else {
      finalInterestValue = parseFloat(interestAmount || 0);
    }

    const newLoan = {
      customer_id: selectedCustomerForLoan.id,
      borrower_name: selectedCustomerForLoan.full_name,
      phone: selectedCustomerForLoan.phone,
      currency,
      total_amount: parseFloat(totalAmount),
      paid_amount: 0,
      interest_type: interestType,
      interest_rate: interestType === "percentage" ? parseFloat(interestRate || 0) : 0,
      interest_amount: finalInterestValue,
      interest_currency: interestType === "fixed" ? interestCurrency : currency,
      payment_day: parseInt(paymentDay) || 5,
      status: "កំពុងដំណើរការ",
      created_by: currentUser.id,
    };

    const { error } = await supabase.from("loans").insert([newLoan]);
    if (!error) {
      setShowAddLoanModal(false);
      setTotalAmount("");
      setInterestRate("2");
      setInterestAmount("");
      loadAllData();
      setExpandedCustomerId(selectedCustomerForLoan.id);
    } else {
      alert("មានបញ្ហា៖ " + error.message);
    }
  };

  // កែប្រែព័ត៌មាន Loan
  const handleOpenEditLoan = (loan) => {
    setEditingLoan(loan);
    setEditInterestType(loan.interest_type || "percentage");
    setEditInterestRate(loan.interest_rate || "2");
    setEditInterestAmount(loan.interest_amount || "");
    setEditPaymentDay(loan.payment_day || "5");
    setShowEditLoanModal(true);
  };

  const handleSaveEditLoan = async (e) => {
    e.preventDefault();
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
      })
      .eq("id", editingLoan.id);

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

    await supabase.from("payments").delete().eq("loan_id", loan.id);
    const { error } = await supabase.from("loans").delete().eq("id", loan.id);

    if (!error) {
      if (selectedLoanForHistory && selectedLoanForHistory.id === loan.id) {
        setSelectedLoanForHistory(null);
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

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    const amountToPay = parseFloat(payAmountInput);
    if (!amountToPay || amountToPay <= 0) return;

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
      return;
    }

    let updatedRemaining = targetLoan.total_amount - targetLoan.paid_amount;

    if (payType === "principal") {
      const newPaid = Number(targetLoan.paid_amount) + amountToPay;
      const isCompleted = newPaid >= Number(targetLoan.total_amount);
      updatedRemaining = targetLoan.total_amount - newPaid;

      await supabase
        .from("loans")
        .update({
          paid_amount: newPaid,
          status: isCompleted ? "បានទូទាត់រួចរាល់" : "កំពុងដំណើរការ",
        })
        .eq("id", targetLoan.id);
    }

    setShowPayModal(false);
    loadAllData();

    setReceiptData({
      ...insertedPayment,
      borrower_name: targetLoan.borrower_name,
      phone: targetLoan.phone,
      remaining_principal: updatedRemaining,
      loan_currency: targetLoan.currency
    });

    if (selectedLoanForHistory && selectedLoanForHistory.id === targetLoan.id) {
      fetchPaymentHistory(targetLoan.id);
      const { data: updatedLoan } = await supabase.from("loans").select("*").eq("id", targetLoan.id).single();
      if (updatedLoan) setSelectedLoanForHistory(updatedLoan);
    }
  };

  const handleDeletePayment = async (payment) => {
    const confirmDelete = window.confirm("តើប្អូនពិតជាចង់លុបទិន្នន័យបង់ប្រាក់នេះមែនទេ?");
    if (!confirmDelete) return;

    if (payment.payment_type === "principal") {
      const restoredPaid = Math.max(0, Number(selectedLoanForHistory.paid_amount) - Number(payment.amount));
      await supabase
        .from("loans")
        .update({
          paid_amount: restoredPaid,
          status: "កំពុងដំណើរការ",
        })
        .eq("id", selectedLoanForHistory.id);
    }

    const { error } = await supabase.from("payments").delete().eq("id", payment.id);
    if (!error) {
      fetchPaymentHistory(selectedLoanForHistory.id);
      loadAllData();
      const { data: updatedLoan } = await supabase.from("loans").select("*").eq("id", selectedLoanForHistory.id).single();
      if (updatedLoan) setSelectedLoanForHistory(updatedLoan);
    }
  };

  const formatMoney = (amount, cur = "USD") => {
    const num = Number(amount || 0).toLocaleString();
    return cur === "KHR" ? `${num} ៛` : `$${num}`;
  };

  const getLoanDueStatus = (loan) => {
    if (loan.status === "បានទូទាត់រួចរាល់") return { label: "រួចរាល់", color: "bg-emerald-100 text-emerald-800" };
    const today = new Date();
    const currentDay = today.getDate();
    const targetDay = loan.payment_day || 5;

    if (currentDay > targetDay) {
      return { label: `ហួសកំណត់ (${currentDay - targetDay} ថ្ងៃ)`, color: "bg-rose-100 text-rose-700 animate-pulse font-bold" };
    } else if (targetDay - currentDay <= 3) {
      return { label: `ជិតដល់ថ្ងៃ (នៅសល់ ${targetDay - currentDay} ថ្ងៃ)`, color: "bg-amber-100 text-amber-800 font-semibold" };
    }
    return { label: `ថ្ងៃកំណត់ទី ${targetDay}`, color: "bg-blue-50 text-blue-700" };
  };

  const stats = useMemo(() => {
    let disbursedUSD = 0, disbursedKHR = 0;
    let outstandingUSD = 0, outstandingKHR = 0;
    let overdueCount = 0;

    loans.forEach((l) => {
      const rem = l.total_amount - l.paid_amount;
      if (l.currency === "KHR") {
        disbursedKHR += Number(l.total_amount || 0);
        outstandingKHR += rem;
      } else {
        disbursedUSD += Number(l.total_amount || 0);
        outstandingUSD += rem;
      }
      if (l.status === "កំពុងដំណើរការ") {
        const todayDay = new Date().getDate();
        if (todayDay > (l.payment_day || 5)) overdueCount++;
      }
    });

    return {
      disbursedUSD, disbursedKHR,
      outstandingUSD, outstandingKHR,
      totalCustomers: customers.length,
      overdueCount
    };
  }, [loans, customers]);

  const customerListWithLoans = useMemo(() => {
    return customers.map((c) => {
      const cLoans = loans.filter((l) => l.customer_id === c.id);

      let totalRemainingUSD = 0;
      let totalRemainingKHR = 0;
      let hasActive = false;
      let hasOverdue = false;

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
      "ឈ្មោះអតិថិជន",
      "លេខទូរស័ព្ទ",
      "រូបិយប័ណ្ណ",
      "ប្រាក់ដើមសរុប",
      "បានសងរួច",
      "ប្រាក់ដើមនៅសល់",
      "ការប្រាក់ប្រចាំខែ",
      "ថ្ងៃកំណត់បង់",
      "ស្ថានភាព"
    ];

    const rows = loans.map((l) => [
      `"${l.borrower_name || ""}"`,
      `"${l.phone || ""}"`,
      `"${l.currency || "USD"}"`,
      l.total_amount || 0,
      l.paid_amount || 0,
      (l.total_amount || 0) - (l.paid_amount || 0),
      l.interest_type === "fixed" ? `${l.interest_amount}` : `${l.interest_rate}%`,
      `"ថ្ងៃទី ${l.payment_day || 5}"`,
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

  const triggerPrintReceipt = () => {
    window.print();
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
                placeholder="admin@loan.com"
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
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-12">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ប្រព័ន្ធតាមដានកម្ចី និងអតិថិជន</h1>
          <p className="text-xs text-slate-500">
            គណនី៖ <span className="font-semibold text-slate-700">{currentUser.full_name || currentUser.email}</span> | សិទ្ធិ៖{" "}
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
              {currentUser.role || "user"}
            </span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm px-4 py-2 rounded-xl transition"
        >
          ចាកចេញ (Logout)
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Dashboard Summary Cards (បង្ហាញតាមទិន្នន័យដែល User នោះមានសិទ្ធិឃើញ) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">អតិថិជនរបស់អ្នក</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCustomers} នាក់</p>
            <span className="text-[11px] text-blue-600 font-medium">សរុប {loans.length} កម្ចី</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">ទំហំប្រាក់កម្ចីសរុប</span>
            <p className="text-lg font-bold text-emerald-600 mt-1">${stats.disbursedUSD.toLocaleString()}</p>
            <p className="text-xs font-semibold text-emerald-700">{stats.disbursedKHR.toLocaleString()} ៛</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">ប្រាក់ដើមនៅជំពាក់</span>
            <p className="text-lg font-bold text-rose-600 mt-1">${stats.outstandingUSD.toLocaleString()}</p>
            <p className="text-xs font-semibold text-rose-700">{stats.outstandingKHR.toLocaleString()} ៛</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">កម្ចីហួសថ្ងៃកំណត់</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.overdueCount} ករណី</p>
            <span className="text-[11px] text-slate-400">គិតតាមថ្ងៃកំណត់ប្រចាំខែ</span>
          </div>
        </div>

        {/* Header Actions (បើកឱ្យគ្រប់គណនីបង្កើត និង Export បាន) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">បញ្ជីអតិថិជន</h2>
            <p className="text-sm text-slate-500">គ្រប់គ្រងអតិថិជន និងកិច្ចសន្យាកម្ចីរបស់អ្នក</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcelCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <span>📊</span> Export Excel/CSV
            </button>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
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
              ហួសកំណត់ ({stats.overdueCount})
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
                                          <th className="py-2.5 px-3">បានសងរួច</th>
                                          <th className="py-2.5 px-3">នៅសល់</th>
                                          <th className="py-2.5 px-3">កាលបរិច្ឆេទបង់</th>
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
                                              <td className="py-3 px-3 text-emerald-600 font-medium">{formatMoney(loan.paid_amount, cur)}</td>
                                              <td className="py-3 px-3 text-rose-600 font-bold">{formatMoney(rem, cur)}</td>
                                              <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] ${dueStatus.color}`}>
                                                  {dueStatus.label}
                                                </span>
                                              </td>
                                              <td className="py-3 px-3 text-center space-x-1.5">
                                                <button
                                                  onClick={() => handleOpenPayModal(loan)}
                                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1 rounded-lg transition"
                                                >
                                                  + បង់ប្រាក់
                                                </button>
                                                <button
                                                  onClick={() => handleOpenDetail(loan)}
                                                  className="bg-slate-800 hover:bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg transition"
                                                >
                                                  មើលតារាងខែ
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

        {/* Modal តារាងប្រវត្តិបង់ប្រាក់តាមខែ */}
        {selectedLoanForHistory && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    តារាងប្រវត្តិបង់ប្រាក់៖ {selectedLoanForHistory.borrower_name}
                  </h3>
                  <button
                    onClick={() => setSelectedLoanForHistory(null)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded"
                  >
                    បិទផ្ទាំងនេះ
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ទូរស័ព្ទ៖ {selectedLoanForHistory.phone} | ថ្ងៃកំណត់បង់៖ <b>ថ្ងៃទី {selectedLoanForHistory.payment_day || 5} រៀងរាល់ខែ</b>
                </p>
              </div>

              <div className="flex gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">ប្រាក់ដើមសរុប</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {formatMoney(selectedLoanForHistory.total_amount, selectedLoanForHistory.currency)}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-slate-500 block">សងដើមរួច</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {formatMoney(selectedLoanForHistory.paid_amount, selectedLoanForHistory.currency)}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-slate-500 block">ប្រាក់ដើមនៅសល់</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {formatMoney(selectedLoanForHistory.total_amount - selectedLoanForHistory.paid_amount, selectedLoanForHistory.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-2">ប្រវត្តិការបង់ប្រាក់តាមខែ៖</h4>
              {loadingHistory ? (
                <div className="text-center py-4 text-xs text-slate-500">កំពុងទាញប្រវត្តិ...</div>
              ) : paymentsHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  មិនទាន់មានប្រវត្តិបង់ប្រាក់នៅឡើយទេ។
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                          <td className="py-2.5 px-3 font-bold text-blue-700 bg-blue-50/50">
                            {pm.for_month || "មិនបានបញ្ជាក់"}
                          </td>
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
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            👤 {pm.recorded_by || "Staff"}
                          </td>
                          <td className="py-2.5 px-3 text-center space-x-1">
                            <button
                              onClick={() => {
                                setReceiptData({
                                  ...pm,
                                  borrower_name: selectedLoanForHistory.borrower_name,
                                  phone: selectedLoanForHistory.phone,
                                  remaining_principal: selectedLoanForHistory.total_amount - selectedLoanForHistory.paid_amount,
                                  loan_currency: selectedLoanForHistory.currency
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
                </div>
              )}
            </div>
          </div>
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

              <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">ប្រាក់ដើមសរុប៖</span>
                  <span className="font-semibold">{formatMoney(targetLoan.total_amount, targetLoan.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ប្រាក់ដើមនៅជំពាក់៖</span>
                  <span className="font-bold text-rose-600">
                    {formatMoney(targetLoan.total_amount - targetLoan.paid_amount, targetLoan.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-700 font-medium">ការប្រាក់កំណត់ប្រចាំខែ៖</span>
                  <span className="font-bold text-blue-600">
                    {targetLoan.interest_type === "fixed"
                      ? formatMoney(targetLoan.interest_amount, targetLoan.interest_currency || targetLoan.currency)
                      : `${targetLoan.interest_rate}% (${formatMoney(targetLoan.interest_amount, targetLoan.currency)})`}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    🗓️ បង់សម្រាប់ខែណា? (Select Month)៖
                  </label>
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
                    className={`flex-1 font-semibold py-2.5 rounded-xl text-white transition text-xs ${
                      payType === "interest_only" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {payType === "interest_only" ? "កត់ត្រាបានទទួលការប្រាក់" : "កាត់កងប្រាក់ដើម"}
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    រក្សាទុកអតិថិជន
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal កែប្រែ Customer (Edit Customer Modal) */}
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    រក្សាទុកការកែប្រែ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal បន្ថែមកម្ចីថ្មី */}
        {showAddLoanModal && selectedCustomerForLoan && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">បន្ថែមកម្ចីថ្មី</h3>
                  <p className="text-xs text-slate-500">
                    អតិថិជន៖ <span className="font-semibold text-slate-800">{selectedCustomerForLoan.full_name}</span> ({selectedCustomerForLoan.phone})
                  </p>
                </div>
                <button onClick={() => setShowAddLoanModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateLoanForCustomer} className="space-y-3.5 text-sm">
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">រូបិយប័ណ្ណ</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">ដុល្លារ ($)</option>
                      <option value="KHR">រៀល (៛)</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ចំនួនប្រាក់ ({currency === "KHR" ? "៛" : "$"})
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={currency === "KHR" ? "4000000" : "800"}
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    📅 ថ្ងៃកំណត់ត្រូវបង់ប្រចាំខែ (Payment Due Day)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">ថ្ងៃទី</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={paymentDay}
                      onChange={(e) => setPaymentDay(e.target.value)}
                      className="w-20 border border-slate-300 rounded-xl p-2 text-center text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500">រៀងរាល់ខែ</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">គិតការប្រាក់ជា៖</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                      <input
                        type="radio"
                        name="interestType"
                        value="percentage"
                        checked={interestType === "percentage"}
                        onChange={() => setInterestType("percentage")}
                      />
                      <span>ភាគរយ (%/ខែ)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                      <input
                        type="radio"
                        name="interestType"
                        value="fixed"
                        checked={interestType === "fixed"}
                        onChange={() => setInterestType("fixed")}
                      />
                      <span>ចំនួនប្រាក់ជាក់ស្តែង</span>
                    </label>
                  </div>

                  {interestType === "percentage" ? (
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="ឧ. 2 (%)"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {totalAmount && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          ≈ ការប្រាក់ប្រចាំខែ៖ <b>{formatMoney((parseFloat(totalAmount) * parseFloat(interestRate || 0)) / 100, currency)}</b>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={interestCurrency}
                        onChange={(e) => setInterestCurrency(e.target.value)}
                        className="border border-slate-300 rounded-xl px-3 py-2 bg-white text-xs font-semibold text-slate-700"
                      >
                        <option value="USD">ដុល្លារ ($)</option>
                        <option value="KHR">រៀល (៛)</option>
                      </select>
                      <input
                        type="number"
                        placeholder={interestCurrency === "KHR" ? "ឧ. 80,000 ៛" : "ឧ. 20 $"}
                        value={interestAmount}
                        onChange={(e) => setInterestAmount(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLoanModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    រក្សាទុកកម្ចី
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal កែប្រែកម្ចី (Edit Loan Modal) */}
        {showEditLoanModal && editingLoan && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">កែសម្រួលកម្ចី</h3>
                  <p className="text-xs text-slate-500">
                    អតិថិជន៖ <span className="font-semibold text-slate-800">{editingLoan.borrower_name}</span>
                  </p>
                </div>
                <button onClick={() => setShowEditLoanModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveEditLoan} className="space-y-3.5 text-sm">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    📅 ថ្ងៃកំណត់ត្រូវបង់ប្រចាំខែ (Payment Due Day)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">ថ្ងៃទី</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={editPaymentDay}
                      onChange={(e) => setEditPaymentDay(e.target.value)}
                      className="w-20 border border-slate-300 rounded-xl p-2 text-center text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500">រៀងរាល់ខែ</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">គិតការប្រាក់ជា៖</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                      <input
                        type="radio"
                        name="editInterestType"
                        value="percentage"
                        checked={editInterestType === "percentage"}
                        onChange={() => setEditInterestType("percentage")}
                      />
                      <span>ភាគរយ (%/ខែ)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                      <input
                        type="radio"
                        name="editInterestType"
                        value="fixed"
                        checked={editInterestType === "fixed"}
                        onChange={() => setEditInterestType("fixed")}
                      />
                      <span>ចំនួនប្រាក់ជាក់ស្តែង</span>
                    </label>
                  </div>

                  {editInterestType === "percentage" ? (
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="ឧ. 2 (%)"
                        value={editInterestRate}
                        onChange={(e) => setEditInterestRate(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <input
                        type="number"
                        placeholder="ឧ. ចំនួនប្រាក់ការប្រាក់"
                        value={editInterestAmount}
                        onChange={(e) => setEditInterestAmount(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditLoanModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                  >
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
                    <span>លេខទូរស័ព្ទ៖</span>
                    <span>{receiptData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>សម្រាប់ខែ៖</span>
                    <span className="font-semibold text-blue-700">{receiptData.for_month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ប្រភេទបង់៖</span>
                    <span className="font-semibold">
                      {receiptData.payment_type === "interest_only" ? "បង់តែការប្រាក់" : "បង់រំលោះប្រាក់ដើម"}
                    </span>
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
                  {receiptData.note && (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>ចំណាំ៖</span>
                      <span>{receiptData.note}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setReceiptData(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition"
                >
                  បិទ
                </button>
                <button
                  onClick={triggerPrintReceipt}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                >
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