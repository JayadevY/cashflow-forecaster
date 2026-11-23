/**
 * Internationalization (i18n) translations for Daily Cash-Flow Forecaster.
 *
 * Provides simple, everyday words in 3 languages:
 * 1. English (EN)
 * 2. Tamil (தமிழ்)
 * 3. Hindi (हिंदी)
 */

import { formatRupees } from './utils/formatters.js';

export const TRANSLATIONS = {
  en: {
    appTitle: "CashFlow Forecaster",
    selectShop: "Select Shop",
    currentCash: "Cash in Drawer",
    safetyThreshold: "Safety Line",
    dataUpTo: "Based on data up to",
    sevenDayForecast: "7-Day Cash Forecast",
    dayByDay: "Day-by-Day Risk Status",
    modeBasicNotice: "Basic estimate (more history needed for full AI)",
    modeFullNotice: "AI-powered risk forecast",

    // Color-blind status cues
    statusSafe: "Safe",
    statusWatch: "Watch",
    statusDanger: "Danger",

    // Shop types
    shopTypeGrocery: "Grocery",
    shopTypeTeaStall: "Tea Stall",
    shopTypeVegetable: "Vegetable Mart",
    shopTypeTiffin: "Tiffin Center",

    // Navigation Tabs
    tabHome: "Home",
    tabAddToday: "Add Today",
    tabPlanPayment: "Plan Payment",
    tabUdhaar: "Udhaar",
    tabPayments: "Payments",

    // Live Payments & Transactions
    paymentsTitle: "Live Payments & Billing",
    paymentsSubtitle: "Track instant payments, register cash receipts, and close the business day.",
    cardCash: "Cash Drawer",
    cardUpi: "UPI",
    cardCardNet: "Card / Netbanking",
    cardTotal: "Total Today",
    lastPaymentAgo: "Last payment",
    minutesAgo: "min ago",
    justNow: "just now",
    noPaymentsToday: "No payments recorded today yet.",
    btnAddCash: "+ Cash received",
    btnSimulate: "Simulate payment (Demo)",
    btnSimulating: "Simulating...",
    btnCloseDay: "Close the day",
    liveIndicator: "Live",
    reconnecting: "Reconnecting...",
    recentTransactions: "Live Stream",
    btnUndo: "Undo",
    undoSuccess: "Cash entry undone successfully.",
    keypadTitle: "Cash Received",
    keypadAmount: "Amount (Rupees)",
    keypadNote: "Note / Bill No. (optional)",
    btnSaveCash: "Save Cash",
    btnCancel: "Cancel",
    closeDayTitle: "Close Today's Register",
    closeDayDesc: "Review today's totals before closing the day and updating the cash drawer.",
    closeDayCashDrawer: "Cash to Drawer",
    closeDayBankDeposit: "Digital to Bank",
    closeDayDrawerNotice: "Only physical cash (₹{amount}) will be added to your cash drawer closing balance.",
    closeDayBankNotice: "Digital payments (₹{amount}) are deposited directly into your bank account.",
    btnConfirmCloseDay: "Confirm & Close Day",
    closeDaySuccess: "Day closed successfully! Cash drawer updated.",
    modeCash: "Cash",
    modeUpi: "UPI",
    modeCard: "Card",
    modeNetbanking: "Netbanking",

    // Udhaar Tracker
    udhaarTitle: "Customer Credit Tracker (Udhaar)",
    udhaarSubtitle: "Track who owes you money and collect on time.",
    totalOutstanding: "Total Credit Given",
    overdueWord: "Overdue",
    activeCustomers: "Customers with balance",
    collectTodayTitle: "Collect Today (Due or Overdue)",
    noCollectToday: "No payments due today or overdue. All clear!",
    btnGotPayment: "Got Payment",
    daysOverdueLabel: "days overdue",
    dueTodayLabel: "Due today",
    addCreditTitle: "Give New Credit (Udhaar)",
    customerNameLabel: "Customer Name",
    creditAmountLabel: "Amount (Rupees)",
    dueDateLabel: "Repayment Due Date",
    btnAddCredit: "Add Credit",
    btnAddingCredit: "Adding Credit...",
    recordPaymentTitle: "Record Payment from",
    balanceDue: "Balance Due",
    paymentAmount: "Collected Amount (Rupees)",
    btnConfirmPayment: "Confirm Payment",
    btnCancelling: "Cancel",
    creditSavedSuccess: "Credit entry recorded for",
    paymentRecordedSuccess: "Payment recorded! New balance for",
    topCustomersTitle: "Top Customers by Outstanding Balance",

    // Form: Add Today
    addTodayTitle: "Add Today's Cash Flow",
    addTodaySubtitle: "Enter what happened today. The server calculates your closing cash.",
    fieldDate: "Date",
    fieldCashSales: "Cash Sales (Rupees)",
    fieldCreditGiven: "Udhaar Given to Customers",
    fieldUdhaarCollected: "Old Udhaar Cash Collected",
    fieldExpenses: "Expenses (Stock, Bills, Supplies)",
    fieldOwnerWithdrawal: "Owner Withdrawal (Personal Draw)",
    optionalTag: "optional",
    btnSaveEntry: "Save Daily Entry",
    btnSaving: "Saving Entry...",
    entrySuccessTitle: "Entry Saved Successfully!",
    entrySuccessClosing: "New Cash in Drawer",
    backToHome: "Back to Home",

    // What-If Scenario
    whatIfTitle: "Can I Afford This Payment?",
    whatIfSubtitle: "Test a supplier bill or bulk purchase before paying to see if cash will stay safe.",
    whatIfAmount: "Payment Amount",
    whatIfDate: "Payment Date",
    btnCheckRisk: "Check Cash Risk",
    btnChecking: "Checking...",
    safestDayTitle: "Safest Day to Pay",
    currentRiskTitle: "Risk on Selected Day",
    maxSafeLabel: "You can safely pay up to",
    onThisDay: "on this day without risking a cash crunch.",
    btnAddPlan: "Add to My Plan",
    btnAddingPlan: "Adding...",
    plannedListTitle: "Your Upcoming Planned Payments",
    noPlannedPayments: "No upcoming payments planned yet.",
    btnDelete: "Delete",

    // Verdicts
    verdict_ok: "Safe to Pay",
    verdict_better_day_exists: "Better Day Exists",
    verdict_too_large: "Amount Too Large",

    // Insight Tips
    tipsTitle: "Tips for You",
    tipsSubtitle: "Smart patterns and reminders from your shop's transactions",
    severityInfo: "Info",
    severityWatch: "Watch",
    severityDanger: "Danger",
    noTipsAvailable: "Keep adding daily entries. Tips will appear once you have 8 weeks of history.",

    // WhatsApp Share & Offline PWA
    shareWhatsAppBtn: "Share on WhatsApp",
    waCashUpdate: "Cash Update",
    waCash: "Cash in Drawer",
    waSafetyLine: "Safety Line",
    waStatus: "Status",
    waWorstDay: "Worst Day",
    waRisk: "risk",
    waTip: "Tip",
    offlineBanner: "Offline - showing last saved forecast",

    // Network / Error states
    serverErrorTitle: "Cannot reach the server. Is it running?",
    serverErrorDesc: "Make sure the backend is running with 'uvicorn app.backend.main:app --reload'.",
    btnRetry: "Try Again",
    loadingText: "Loading shop data...",
    wakingUpTitle: "Waking up the server, this can take up to a minute...",
    wakingUpSubtitle: "The free-tier server sleeps when inactive. Connecting and starting it up automatically...",
    wakingUpRetrying: "Retrying automatically every 5 seconds...",
  },

  ta: {
    appTitle: "பண வரவு கணிப்பான்",
    selectShop: "கடையைத் தேர்ந்தெடுக்கவும்",
    currentCash: "கல்லா பணம்",
    safetyThreshold: "குறைந்தபட்ச எல்லை",
    dataUpTo: "வரை உள்ள விவரங்கள்",
    sevenDayForecast: "7 நாட்கள் பண வரவு கணிப்பு",
    dayByDay: "நாள் வாரியான ஆபத்து நிலை",
    modeBasicNotice: "அடிப்படை கணிப்பு (முழு கணிப்புக்கு கூடுதல் வரலாறு தேவை)",
    modeFullNotice: "செயற்கை நுண்ணறிவு கணிப்பு",

    // Color-blind status cues
    statusSafe: "பாதுகாப்பானது",
    statusWatch: "கவனம்",
    statusDanger: "ஆபத்து",

    // Shop types
    shopTypeGrocery: "மளிகை (Grocery)",
    shopTypeTeaStall: "தேநீர் கடை",
    shopTypeVegetable: "காய்கறி கடை",
    shopTypeTiffin: "டிபன் சென்டர்",

    // Navigation Tabs
    tabHome: "முகப்பு",
    tabAddToday: "இன்று சேர்",
    tabPlanPayment: "திட்டமிடு",
    tabUdhaar: "உதார் (கடன்)",
    tabPayments: "பணப் பரிவர்த்தனை",

    // Live Payments & Transactions
    paymentsTitle: "நேரடி பண வரவு & பில்லிங்",
    paymentsSubtitle: "நேரடி வரவு பதிவுகள், விரைவு ரொக்கப் பதிவு மற்றும் நாள் கணக்கு முடித்தல்.",
    cardCash: "கல்லா ரொக்கம்",
    cardUpi: "UPI",
    cardCardNet: "கார்டு / நெட்பேங்கிங்",
    cardTotal: "இன்றைய மொத்த வரவு",
    lastPaymentAgo: "கடைசி வரவு",
    minutesAgo: "நிமிடங்களுக்கு முன்",
    justNow: "சற்று முன்",
    noPaymentsToday: "இன்று இதுவரை எந்தப் பரிவர்த்தனையும் இல்லை.",
    btnAddCash: "+ ரொக்கம் பெற்றது",
    btnSimulate: "மாதிரி வரவு (டெமோ)",
    btnSimulating: "உருவாக்குகிறது...",
    btnCloseDay: "இன்றைய கணக்கை முடி",
    liveIndicator: "நேரலை",
    reconnecting: "மீண்டும் இணைக்கிறது...",
    recentTransactions: "நேரடிப் பரிவர்த்தனைகள்",
    btnUndo: "ரத்து செய்",
    undoSuccess: "ரொக்கப் பதிவு ரத்து செய்யப்பட்டது.",
    keypadTitle: "பெற்ற ரொக்கத்தைப் பதிவு செய்",
    keypadAmount: "தொகை (ரூபாய்)",
    keypadNote: "குறிப்பு / பில் எண் (விருப்பம்)",
    btnSaveCash: "ரொக்கத்தை சேமி",
    btnCancel: "ரத்து",
    closeDayTitle: "இன்றைய கணக்கு முடித்தல்",
    closeDayDesc: "நாள் முடித்து கல்லா இருப்பைப் புதுப்பிக்கும் முன் இன்றைய தொகைகளை சரிபார்க்கவும்.",
    closeDayCashDrawer: "கல்லாவுக்கு செல்லும் ரொக்கம்",
    closeDayBankDeposit: "வங்கி வரவு (டிஜிட்டல்)",
    closeDayDrawerNotice: "கல்லாவில் உள்ள ரொக்கத் தொகை மட்டுமே (₹{amount}) உங்கள் நாள் முடிவில் சேர்க்கப்படும்.",
    closeDayBankNotice: "டிஜிட்டல் தொகைகள் (₹{amount}) நேரடியாக வங்கிக் கணக்கில் வரவு வைக்கப்படும்.",
    btnConfirmCloseDay: "உறுதி செய்து முடி",
    closeDaySuccess: "கணக்கு முடிந்தது! கல்லா இருப்பு புதுப்பிக்கப்பட்டது.",
    modeCash: "ரொக்கம்",
    modeUpi: "UPI",
    modeCard: "கார்டு",
    modeNetbanking: "நெட்பேங்கிங்",

    // Udhaar Tracker
    udhaarTitle: "வாடிக்கையாளர் கடன் பதிவேடு (உதார்)",
    udhaarSubtitle: "யாருக்கு கடன் உள்ளது என்பதை அறிந்து குறித்த நேரத்தில் வசூலிக்கவும்.",
    totalOutstanding: "மொத்த கடன் பாக்கி",
    overdueWord: "தாமதம்",
    activeCustomers: "பாக்கி உள்ள வாடிக்கையாளர்கள்",
    collectTodayTitle: "இன்று வசூலிக்க வேண்டியவை",
    noCollectToday: "இன்று வசூலிக்க எந்த பாக்கியும் இல்லை. எல்லாம் சரி!",
    btnGotPayment: "பணம் வந்தது",
    daysOverdueLabel: "நாட்கள் தாமதம்",
    dueTodayLabel: "இன்று செலுத்த வேண்டும்",
    addCreditTitle: "புதிய கடன் கொடு (உதார்)",
    customerNameLabel: "வாடிக்கையாளர் பெயர்",
    creditAmountLabel: "தொகை (ரூபாய்)",
    dueDateLabel: "திருப்பிச் செலுத்தும் தேதி",
    btnAddCredit: "கடன் சேர்",
    btnAddingCredit: "சேர்க்கிறது...",
    recordPaymentTitle: "பணம் வசூல் பதிவு",
    balanceDue: "மீதமுள்ள பாக்கி",
    paymentAmount: "வசூலான தொகை (ரூபாய்)",
    btnConfirmPayment: "பணம் பெற்றதை உறுதி செய்",
    btnCancelling: "ரத்து செய்",
    creditSavedSuccess: "கடன் வெற்றிகரமாக பதிவானது:",
    paymentRecordedSuccess: "வசூல் பதிவானது! புதிய பாக்கி:",
    topCustomersTitle: "அதிக பாக்கி உள்ள வாடிக்கையாளர்கள்",

    // Form: Add Today
    addTodayTitle: "இன்றைய கணக்கை பதிவு செய்",
    addTodaySubtitle: "இன்று நடந்ததை உள்ளிடவும். இருப்பு பணத்தை கணினி கணக்கிடும்.",
    fieldDate: "தேதி",
    fieldCashSales: "ரொக்க விற்பனை (ரூபாய்)",
    fieldCreditGiven: "வாடிக்கையாளருக்கு கொடுத்த கடன் (உதார்)",
    fieldUdhaarCollected: "பழைய கடன் வசூல்",
    fieldExpenses: "செலவுகள் (சரக்கு, பில், மளிகை)",
    fieldOwnerWithdrawal: "சொந்த செலவுக்காக எடுத்தது",
    optionalTag: "விருப்பம்",
    btnSaveEntry: "கணக்கை சேமி",
    btnSaving: "சேமிக்கிறது...",
    entrySuccessTitle: "கணக்கு வெற்றிகரமாக பதிவானது!",
    entrySuccessClosing: "கல்லா புதிய இருப்பு",
    backToHome: "முகப்புக்கு செல்",

    // What-If Scenario
    whatIfTitle: "இந்த பணத்தை இப்போது செலுத்தலாமா?",
    whatIfSubtitle: "பெரிய செலவு அல்லது சரக்கு பில் கொடுப்பதற்கு முன் பணம் போதுமா என்று சோதிக்கவும்.",
    whatIfAmount: "செலுத்த வேண்டிய தொகை",
    whatIfDate: "செலுத்தும் தேதி",
    btnCheckRisk: "பண ஆபத்தை சரிபார்",
    btnChecking: "சரிபார்க்கிறது...",
    safestDayTitle: "பாதுகாப்பான நாள்",
    currentRiskTitle: "தேர்ந்தெடுத்த நாளின் ஆபத்து",
    maxSafeLabel: "நீங்கள் பாதுகாப்பாக செலுத்தக்கூடிய அதிகபட்சம்",
    onThisDay: "இந்த நாளில் பணத்தட்டுப்பாடு வராமல் செலுத்தலாம்.",
    btnAddPlan: "என் திட்டத்தில் சேர்",
    btnAddingPlan: "சேர்க்கிறது...",
    plannedListTitle: "வரவிருக்கும் திட்டமிடப்பட்ட கொடுப்பனவுகள்",
    noPlannedPayments: "திட்டமிடப்பட்ட கொடுப்பனவுகள் எதுவும் இல்லை.",
    btnDelete: "நீக்கு",

    // Verdicts
    verdict_ok: "செலுத்தலாம்",
    verdict_better_day_exists: "வேறு சிறந்த நாள் உள்ளது",
    verdict_too_large: "தொகை மிக அதிகம்",

    // Insight Tips
    tipsTitle: "உங்களுக்கான குறிப்புகள்",
    tipsSubtitle: "உங்கள் கடை வியாபாரப் பழக்கங்களிலிருந்து பயனுள்ள நினைவூட்டல்கள்",
    severityInfo: "தகவல்",
    severityWatch: "கவனம்",
    severityDanger: "ஆபத்து",
    noTipsAvailable: "தொடர்ந்து தினசரி வரவு-செலவை பதிவு செய்யவும். 8 வாரங்கள் முடிந்ததும் குறிப்புகள் தோன்றும்.",

    // WhatsApp Share & Offline PWA
    shareWhatsAppBtn: "WhatsApp-ல் பகிரவும்",
    waCashUpdate: "பண நிலவரம்",
    waCash: "கல்லா பணம்",
    waSafetyLine: "பாதுகாப்பு எல்லை",
    waStatus: "நிலை",
    waWorstDay: "அதிக ஆபத்து நாள்",
    waRisk: "ஆபத்து",
    waTip: "குறிப்பு",
    offlineBanner: "இணைப்பில்லை - கடைசியாக சேமிக்கப்பட்ட கணிப்பு",

    // Network / Error states
    serverErrorTitle: "சேவையகத்தை இணைக்க முடியவில்லை. இயங்குகிறதா?",
    serverErrorDesc: "'uvicorn app.backend.main:app --reload' இயங்குகிறதா என்பதை உறுதிப்படுத்தவும்.",
    btnRetry: "மீண்டும் முயற்சி செய்",
    loadingText: "விவரங்கள் ஏற்றப்படுகின்றன...",
    wakingUpTitle: "சர்வரைத் தொடங்குகிறது, இதற்கு ஒரு நிமிடம் வரை ஆகலாம்...",
    wakingUpSubtitle: "பயன்பாட்டில் இல்லாதபோது சர்வர் உறக்க நிலைக்குச் செல்லும். தானாக இணைகிறது...",
    wakingUpRetrying: "ஒவ்வொரு 5 விநாடிக்கும் தானாக மீண்டும் முயற்சிக்கிறது...",
  },

  hi: {
    appTitle: "कैश-फ्लो फोरकास्टर",
    selectShop: "दुकान चुनें",
    currentCash: "गल्ले में नकद",
    safetyThreshold: "सुरक्षा सीमा",
    dataUpTo: "तक के डेटा पर आधारित",
    sevenDayForecast: "7 दिनों का नकद अनुमान",
    dayByDay: "दिन-वार जोखिम स्थिति",
    modeBasicNotice: "साधारण अनुमान (पूर्ण AI के लिए और डेटा चाहिए)",
    modeFullNotice: "AI जोखिम अनुमान",

    // Color-blind status cues
    statusSafe: "सुरक्षित",
    statusWatch: "ध्यान दें",
    statusDanger: "ख़तरा",

    // Shop types
    shopTypeGrocery: "ग्रोसरी (Grocery)",
    shopTypeTeaStall: "चाय की दुकान",
    shopTypeVegetable: "सब्जी की दुकान",
    shopTypeTiffin: "टिफिन सेंटर",

    // Navigation Tabs
    tabHome: "मुख्य",
    tabAddToday: "आज का हिसाब",
    tabPlanPayment: "भुगतान योजना",
    tabUdhaar: "उधार",
    tabPayments: "लेन-देन",

    // Live Payments & Transactions
    paymentsTitle: "लाइव लेन-देन और बिलिंग",
    paymentsSubtitle: "लाइव लेन-देन प्रवाह, त्वरित नकद प्रविष्टि और दिन का हिसाब क्लोजिंग।",
    cardCash: "गल्ला नकद",
    cardUpi: "UPI",
    cardCardNet: "कार्ड / नेटबैंकिंग",
    cardTotal: "आज का कुल योग",
    lastPaymentAgo: "अंतिम भुगतान",
    minutesAgo: "मिनट पहले",
    justNow: "अभी-अभी",
    noPaymentsToday: "आज अभी तक कोई लेन-देन दर्ज नहीं हुआ है।",
    btnAddCash: "+ नकद प्राप्त हुआ",
    btnSimulate: "सिमुलेट करें (डेमो)",
    btnSimulating: "सिमुलेट हो रहा है...",
    btnCloseDay: "दिन का हिसाब बंद करें",
    liveIndicator: "लाइव",
    reconnecting: "पुनः कनेक्ट हो रहा है...",
    recentTransactions: "लाइव लेन-देन",
    btnUndo: "पूर्ववत करें",
    undoSuccess: "नकद प्रविष्टि हटा दी गई।",
    keypadTitle: "प्राप्त नकद दर्ज करें",
    keypadAmount: "राशि (रुपये)",
    keypadNote: "नोट / बिल नंबर (वैकल्पिक)",
    btnSaveCash: "नकद सहेजें",
    btnCancel: "रद्द करें",
    closeDayTitle: "दिन का हिसाब बंद करें",
    closeDayDesc: "दिन का हिसाब बंद करने और गल्ले का नकद अपडेट करने से पहले आज के कुल योग की समीक्षा करें।",
    closeDayCashDrawer: "गल्ले में जाने वाला नकद",
    closeDayBankDeposit: "बैंक में जाने वाला (डिजिटल)",
    closeDayDrawerNotice: "केवल गल्ले का भौतिक नकद (₹{amount}) ही आपकी अंतिम शेष राशि में जुड़ेगा।",
    closeDayBankNotice: "डिजिटल भुगतान (₹{amount}) सीधे आपके बैंक खाते में जमा होते हैं।",
    btnConfirmCloseDay: "पुष्टि करें और दिन बंद करें",
    closeDaySuccess: "दिन का हिसाब बंद हो गया! गल्ले का नकद अपडेट हुआ।",
    modeCash: "नकद",
    modeUpi: "UPI",
    modeCard: "कार्ड",
    modeNetbanking: "नेटबैंकिंग",

    // Udhaar Tracker
    udhaarTitle: "ग्राहक उधार खाता",
    udhaarSubtitle: "जानें किस पर कितना बकाया है और समय पर वसूली करें।",
    totalOutstanding: "कुल बकाया उधार",
    overdueWord: "तय समय से ज्यादा",
    activeCustomers: "बकाया वाले ग्राहक",
    collectTodayTitle: "आज वसूली के लिए (तारीख पूरी या बीत चुकी)",
    noCollectToday: "आज कोई वसूली बकाया नहीं है। सब ठीक है!",
    btnGotPayment: "पैसे मिले",
    daysOverdueLabel: "दिन लेट",
    dueTodayLabel: "आज ही देय",
    addCreditTitle: "नया उधार दें",
    customerNameLabel: "ग्राहक का नाम",
    creditAmountLabel: "उधार राशि (रुपये)",
    dueDateLabel: "चुकाने की तारीख",
    btnAddCredit: "उधार जोड़ें",
    btnAddingCredit: "जोड़ रहा है...",
    recordPaymentTitle: "भुगतान दर्ज करें",
    balanceDue: "बकाया राशि",
    paymentAmount: "मिली हुई राशि (रुपये)",
    btnConfirmPayment: "पैसे मिलने की पुष्टि करें",
    btnCancelling: "रद्द करें",
    creditSavedSuccess: "उधार खाता दर्ज हुआ:",
    paymentRecordedSuccess: "भुगतान दर्ज हुआ! नया बकाया:",
    topCustomersTitle: "सबसे ज्यादा बकाया वाले ग्राहक",

    // Form: Add Today
    addTodayTitle: "आज का लेन-देन जोड़ें",
    addTodaySubtitle: "आज का हिसाब दर्ज करें। गल्ले का अंतिम नकद सिस्टम खुद निकालेगा।",
    fieldDate: "तारीख",
    fieldCashSales: "नकद बिक्री (रुपये)",
    fieldCreditGiven: "ग्राहकों को दिया उधार",
    fieldUdhaarCollected: "पुराना उधार वापस मिला",
    fieldExpenses: "दुकान का ख़र्च (सामान, बिल)",
    fieldOwnerWithdrawal: "निजी ख़र्च के लिए निकाला",
    optionalTag: "वैकल्पिक",
    btnSaveEntry: "हिसाब सेव करें",
    btnSaving: "सेव हो रहा है...",
    entrySuccessTitle: "हिसाब सफलतापूर्वक सेव हुआ!",
    entrySuccessClosing: "गल्ले में नया नकद",
    backToHome: "मुख्य पृष्ठ पर जाएँ",

    // What-If Scenario
    whatIfTitle: "क्या मैं यह भुगतान अभी कर सकता हूँ?",
    whatIfSubtitle: "सप्लायर का बिल या बड़ा सामान लेने से पहले जांचें कि गल्ले में पैसे सुरक्षित रहेंगे या नहीं।",
    whatIfAmount: "भुगतान की राशि",
    whatIfDate: "भुगतान की तारीख",
    btnCheckRisk: "जोखिम चेक करें",
    btnChecking: "जाँच जारी है...",
    safestDayTitle: "सबसे सुरक्षित दिन",
    currentRiskTitle: "चुनी तारीख पर जोखिम",
    maxSafeLabel: "आप सुरक्षित रूप से इतना चुका सकते हैं",
    onThisDay: "इस दिन बिना किसी नकद संकट के।",
    btnAddPlan: "मेरी योजना में जोड़ें",
    btnAddingPlan: "जोड़ा जा रहा है...",
    plannedListTitle: "आपके आने वाले तय भुगतान",
    noPlannedPayments: "कोई तय भुगतान दर्ज नहीं है।",
    btnDelete: "हटाएं",

    // Verdicts
    verdict_ok: "भुगतान सुरक्षित है",
    verdict_better_day_exists: "दूसरा दिन बेहतर है",
    verdict_too_large: "राशि बहुत अधिक है",

    // Insight Tips
    tipsTitle: "आपके लिए कारोबारी सुझाव",
    tipsSubtitle: "दुकान के पिछले हिसाब और पैटर्न पर आधारित व्यावहारिक सलाह",
    severityInfo: "जानकारी",
    severityWatch: "सतर्क",
    severityDanger: "खतरा",
    noTipsAvailable: "रोज़ाना हिसाब दर्ज करते रहें। 8 हफ्ते का डेटा होने पर उपयोगी सुझाव दिखेंगे।",

    // WhatsApp Share & Offline PWA
    shareWhatsAppBtn: "व्हाट्सएप पर शेयर करें",
    waCashUpdate: "नकद स्थिति",
    waCash: "गल्ले में नकद",
    waSafetyLine: "सुरक्षा सीमा",
    waStatus: "स्थिति",
    waWorstDay: "सबसे जोखिम भरा दिन",
    waRisk: "जोखिम",
    waTip: "सुझाव",
    offlineBanner: "ऑफ़लाइन - अंतिम सहेजा गया अनुमान",

    // Network / Error states
    serverErrorTitle: "सर्वर से संपर्क नहीं हो पा रहा है। क्या यह चालू है?",
    serverErrorDesc: "जाँचें कि 'uvicorn app.backend.main:app --reload' चल रहा है।",
    btnRetry: "पुनः प्रयास करें",
    loadingText: "डेटा लोड हो रहा है...",
    wakingUpTitle: "सर्वर चालू हो रहा है, इसमें एक मिनट तक का समय लग सकता है...",
    wakingUpSubtitle: "उपयोग में न होने पर सर्वर स्लीप मोड में चला जाता है। स्वचालित रूप से कनेक्ट हो रहा है...",
    wakingUpRetrying: "हर 5 सेकंड में स्वतः पुनः प्रयास किया जा रहा है...",
  },
};

export const WEEKDAYS = {
  en: {
    Monday: 'Monday',
    Tuesday: 'Tuesday',
    Wednesday: 'Wednesday',
    Thursday: 'Thursday',
    Friday: 'Friday',
    Saturday: 'Saturday',
    Sunday: 'Sunday',
  },
  ta: {
    Monday: 'திங்கள்',
    Tuesday: 'செவ்வாய்',
    Wednesday: 'புதன்',
    Thursday: 'வியாழன்',
    Friday: 'வெள்ளி',
    Saturday: 'சனி',
    Sunday: 'ஞாயிறு',
  },
  hi: {
    Monday: 'सोमवार',
    Tuesday: 'मंगलवार',
    Wednesday: 'बुधवार',
    Thursday: 'गुरुवार',
    Friday: 'शुक्रवार',
    Saturday: 'शनिवार',
    Sunday: 'रविवार',
  },
};

export const SHOP_TYPES = {
  en: {
    kirana: 'Grocery',
    grocery: 'Grocery',
    tea_stall: 'Tea Stall',
    vegetable_shop: 'Vegetable Mart',
    tiffin_center: 'Tiffin Center',
  },
  ta: {
    kirana: 'மளிகை (Grocery)',
    grocery: 'மளிகை (Grocery)',
    tea_stall: 'தேநீர் கடை',
    vegetable_shop: 'காய்கறி கடை',
    tiffin_center: 'டிபன் சென்டர்',
  },
  hi: {
    kirana: 'ग्रोसरी (Grocery)',
    grocery: 'ग्रोसरी (Grocery)',
    tea_stall: 'चाय की दुकान',
    vegetable_shop: 'सब्जी की दुकान',
    tiffin_center: 'टिफिन सेंटर',
  },
};

/**
 * Format and map shop type for UI display.
 * Maps 'kirana' to 'Grocery' (with localization).
 */
export function formatShopType(shopType, language = 'en') {
  if (!shopType) return '';
  const lang = ['en', 'ta', 'hi'].includes(language) ? language : 'en';
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const key = shopType.toLowerCase().trim();
  if (SHOP_TYPES[lang] && SHOP_TYPES[lang][key]) {
    return SHOP_TYPES[lang][key];
  }
  if (SHOP_TYPES.en[key]) {
    return SHOP_TYPES.en[key];
  }
  const cleaned = shopType.replace('_', ' ');
  return cleaned.toLowerCase() === 'kirana' ? (t.shopTypeGrocery || 'Grocery') : cleaned;
}

/**
 * Format and interpolate a tip sentence in the user's selected language.
 */
export function renderTipSentence(tip, language = 'en') {
  if (!tip || !tip.text_key) return '';
  const lang = ['en', 'ta', 'hi'].includes(language) ? language : 'en';
  const p = tip.params || {};
  const dayNames = WEEKDAYS[lang] || WEEKDAYS.en;

  const bestDay = dayNames[p.best_day] || p.best_day || '';
  const worstDay = dayNames[p.worst_day] || p.worst_day || '';
  const tipDay = dayNames[p.day] || p.day || '';
  const formattedAmount = formatRupees(p.amount);

  switch (tip.text_key) {
    case 'tip_best_worst_weekday':
      if (lang === 'ta') {
        return `${worstDay}-ஐ விட ${bestDay}-ல் சுமார் ${p.pct}% அதிக விற்பனை நடக்கிறது.`;
      }
      if (lang === 'hi') {
        return `${bestDay} को ${worstDay} की तुलना में लगभग ${p.pct}% अधिक बिक्री होती है।`;
      }
      return `${bestDay} sells about ${p.pct}% more than ${worstDay}.`;

    case 'tip_weekend_higher':
      if (lang === 'ta') {
        return `வார நாட்களை விட வார இறுதி நாட்களில் (சனி, ஞாயிறு) சுமார் ${p.pct}% அதிக விற்பனை நடக்கிறது.`;
      }
      if (lang === 'hi') {
        return `सप्ताहांत (शनिवार, रविवार) पर कार्यदिवसों की तुलना में लगभग ${p.pct}% अधिक बिक्री होती है।`;
      }
      return `Weekends sell about ${p.pct}% more than weekdays.`;

    case 'tip_weekday_higher':
      if (lang === 'ta') {
        return `வார இறுதி நாட்களை விட வேலை நாட்களில் சுமார் ${p.pct}% அதிக விற்பனை நடக்கிறது.`;
      }
      if (lang === 'hi') {
        return `कार्यदिवसों में सप्ताहांत की तुलना में लगभग ${p.pct}% अधिक बिक्री होती है।`;
      }
      return `Weekdays sell about ${p.pct}% more than weekends.`;

    case 'tip_month_start_higher':
      if (lang === 'ta') {
        return `மாதத்தின் முதல் வாரத்தில் (சம்பள நாட்கள்) விற்பனை சுமார் ${p.pct}% அதிகமாக உள்ளது.`;
      }
      if (lang === 'hi') {
        return `महीने के पहले हफ्ते (वेतन दिवस) में बिक्री लगभग ${p.pct}% अधिक रहती है।`;
      }
      return `Sales are about ${p.pct}% higher in the first week of the month (salary days).`;

    case 'tip_month_start_lower':
      if (lang === 'ta') {
        return `மாதத்தின் முதல் வாரத்தில் விற்பனை சுமார் ${p.pct}% குறைவாக உள்ளது.`;
      }
      if (lang === 'hi') {
        return `महीने के पहले हफ्ते में बिक्री लगभग ${p.pct}% कम रहती है।`;
      }
      return `Sales are about ${p.pct}% lower in the first week of the month.`;

    case 'tip_rent_coming':
      if (p.days === 0) {
        if (lang === 'ta') return `இன்று வாடகை நாள். சுமார் ₹${formattedAmount} தயாராக வைத்திருக்கவும்.`;
        if (lang === 'hi') return `आज किराया देने का दिन है। लगभग ₹${formattedAmount} तैयार रखें।`;
        return `Rent day today. Keep about ₹${formattedAmount} ready.`;
      }
      if (p.days === 1) {
        if (lang === 'ta') return `நாளை வாடகை நாள். சுமார் ₹${formattedAmount} தயாராக வைத்திருக்கவும்.`;
        if (lang === 'hi') return `कल किराया देने का दिन है। लगभग ₹${formattedAmount} तैयार रखें।`;
        return `Rent day in 1 day. Keep about ₹${formattedAmount} ready.`;
      }
      if (lang === 'ta') {
        return `இன்னும் ${p.days} நாட்களில் வாடகை நாள். சுமார் ₹${formattedAmount} தயாராக வைத்திருக்கவும்.`;
      }
      if (lang === 'hi') {
        return `अगले ${p.days} दिनों में किराया देना है। लगभग ₹${formattedAmount} तैयार रखें।`;
      }
      return `Rent day in ${p.days} days. Keep about ₹${formattedAmount} ready.`;

    case 'tip_tight_cash':
      if (lang === 'ta') {
        return `${tipDay} (${p.date}) அன்று பணப் பற்றாக்குறை ஆபத்து: பாதுகாப்பு அளவை விட குறைய ${p.risk_pct}% வாய்ப்பு உள்ளது.`;
      }
      if (lang === 'hi') {
        return `${tipDay} (${p.date}) को नकदी की कमी का जोखिम: सुरक्षा स्तर से नीचे जाने की ${p.risk_pct}% संभावना है।`;
      }
      return `Cash looks tight on ${tipDay} (${p.date}): ${p.risk_pct}% chance of falling below safety level.`;

    case 'tip_overdue_udhaar':
      if (lang === 'ta') {
        return `${p.customers} வாடிக்கையாளர்களிடம் ₹${formattedAmount} கடன் தாமதமாக உள்ளது. அதை வசூலித்தால் ${p.days_cover} நாட்களுக்கான செலவுப் பணம் கிடைக்கும்.`;
      }
      if (lang === 'hi') {
        return `${p.customers} ग्राहकों से ₹${formattedAmount} का उधार बाकी है। इसे वसूलने से ${p.days_cover} दिनों का नकदी सहारा मिलेगा।`;
      }
      return `₹${formattedAmount} is overdue from ${p.customers} customers. Collecting it would add ${p.days_cover} days of cash cover.`;

    case 'tip_expense_trend_up':
      if (lang === 'ta') {
        return `கடந்த 4 வார செலவுகள் அதற்கு முந்தைய 4 வாரங்களை விட ${p.pct}% அதிகரித்துள்ளது.`;
      }
      if (lang === 'hi') {
        return `पिछले 4 हफ्तों का खर्च उससे पिछले 4 हफ्तों की तुलना में ${p.pct}% अधिक रहा है।`;
      }
      return `Expenses in the last 4 weeks are ${p.pct}% higher than the previous 4 weeks.`;

    case 'tip_expense_trend_down':
      if (lang === 'ta') {
        return `கடந்த 4 வார செலவுகள் அதற்கு முந்தைய 4 வாரங்களை விட ${p.pct}% குறைந்துள்ளது.`;
      }
      if (lang === 'hi') {
        return `पिछले 4 हफ्तों का खर्च उससे पिछले 4 हफ्तों की तुलना में ${p.pct}% कम रहा है।`;
      }
      return `Expenses in the last 4 weeks are ${p.pct}% lower than the previous 4 weeks.`;

    default:
      return '';
  }
}
