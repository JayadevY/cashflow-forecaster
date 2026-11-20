/**
 * Internationalization (i18n) translations for Daily Cash-Flow Forecaster.
 *
 * Provides simple, everyday words in 3 languages:
 * 1. English (EN)
 * 2. Tamil (தமிழ்)
 * 3. Hindi (हिंदी)
 */

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

    // Navigation Tabs
    tabHome: "Home",
    tabAddToday: "Add Today",
    tabPlanPayment: "Plan Payment",
    tabUdhaar: "Udhaar",

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

    // Network / Error states
    serverErrorTitle: "Cannot reach the server. Is it running?",
    serverErrorDesc: "Make sure the backend is running with 'uvicorn app.backend.main:app --reload'.",
    btnRetry: "Try Again",
    loadingText: "Loading shop data...",
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

    // Navigation Tabs
    tabHome: "முகப்பு",
    tabAddToday: "இன்று சேர்",
    tabPlanPayment: "திட்டமிடு",
    tabUdhaar: "உதார் (கடன்)",

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

    // Network / Error states
    serverErrorTitle: "சேவையகத்தை இணைக்க முடியவில்லை. இயங்குகிறதா?",
    serverErrorDesc: "'uvicorn app.backend.main:app --reload' இயங்குகிறதா என்பதை உறுதிப்படுத்தவும்.",
    btnRetry: "மீண்டும் முயற்சி செய்",
    loadingText: "விவரங்கள் ஏற்றப்படுகின்றன...",
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

    // Navigation Tabs
    tabHome: "मुख्य",
    tabAddToday: "आज का हिसाब",
    tabPlanPayment: "भुगतान योजना",
    tabUdhaar: "उधार",

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

    // Network / Error states
    serverErrorTitle: "सर्वर से संपर्क नहीं हो पा रहा है। क्या यह चालू है?",
    serverErrorDesc: "जाँचें कि 'uvicorn app.backend.main:app --reload' चल रहा है।",
    btnRetry: "पुनः प्रयास करें",
    loadingText: "डेटा लोड हो रहा है...",
  },
};
