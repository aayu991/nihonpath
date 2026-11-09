import fs from "node:fs";
const id = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const audience = ["tourist", "student", "ssw", "professional", "resident"],
  allStages = ["before", "arriving", "settling"];
const categories = [
  ["before-arrival", "Before Arrival", "来日前の準備", "Plane"],
  ["first-days", "First Days in Japan", "来日直後", "MapPin"],
  ["visa-documents", "Visa and Documents", "在留資格と書類", "FileText"],
  ["housing", "Housing and Utilities", "住まいと生活設備", "House"],
  [
    "money-insurance",
    "Banking, Taxes and Insurance",
    "銀行・税金・保険",
    "Wallet",
  ],
  ["healthcare", "Healthcare", "医療", "HeartPulse"],
  ["transport", "Transportation", "交通", "TrainFront"],
  [
    "workplace",
    "Workplace Life and Safety",
    "職場生活と安全",
    "BriefcaseBusiness",
  ],
  [
    "culture",
    "Japanese Rules and Culture",
    "日本のルールと文化",
    "MessagesSquare",
  ],
  [
    "emergencies",
    "Emergencies and Disaster Preparation",
    "緊急時・防災",
    "ShieldCheck",
  ],
].map(([slug, title, title_ja, icon], i) => ({
  id: id("d8010000", i + 1),
  slug,
  title,
  title_ja,
  icon,
  position: i,
}));
const sources = [
  [
    "ISA · New entrant guidance",
    "https://www.moj.go.jp/isa/support/guidance/index.html?hl=en",
    "Japan · Immigration Services Agency",
    false,
  ],
  [
    "ISA · Living and Working Guidebook",
    "https://www.moj.go.jp/isa/support/portal/guidebook_all.html",
    "Japan · Immigration Services Agency",
    false,
  ],
  [
    "JASSO · Life in Japan",
    "https://www.studyinjapan.go.jp/en/life/",
    "Japan · International students",
    true,
  ],
  [
    "JASSO · Accommodation",
    "https://www.studyinjapan.go.jp/en/life/accomodation/",
    "Japan · Student housing; contracts vary",
    true,
  ],
  [
    "JASSO · Insurance",
    "https://www.studyinjapan.go.jp/en/life/insurance/",
    "Japan · International students; confirm current local arrangements",
    true,
  ],
  [
    "JASSO · Status of residence",
    "https://www.studyinjapan.go.jp/en/life/residing-in-japan/",
    "Japan · Student residence; individual circumstances",
    true,
  ],
  [
    "JNTO · Planning your trip",
    "https://www.japan.travel/en/plan/",
    "Japan · Visitor orientation",
    true,
  ],
  [
    "JNTO · Staying safe in Japan",
    "https://www.japan.travel/en/plan/emergencies/",
    "Japan · Visitor emergency preparation",
    true,
  ],
].map(([title, url, jurisdiction, verified], i) => ({
  id: id("d8020000", i + 1),
  title,
  url,
  jurisdiction,
  publication_date: null,
  reviewed_at: "2026-10-25",
  verified_at: verified ? "2026-10-25" : null,
  review_status: "draft",
  published: false,
}));
// Original planning prompts. No unverified statutory deadlines, eligibility findings or universal document lists.
const rows = [
  [
    "prepare-your-journey",
    "Prepare a calmer arrival",
    "安心して来日するために",
    "Plan contacts, accommodation and your first journey before departure.",
    "出発前に連絡先、宿泊先、最初の移動を整理します。",
    "suggestion",
    "general",
    audience,
    ["before"],
    [6, 7],
    [
      "Keep your booking details and a way to contact your accommodation offline.",
      "Plan your airport-to-accommodation journey and a backup if transport changes.",
      "Check the official entry guidance for your own nationality and purpose; ask the appropriate authority if uncertain.",
    ],
    [
      "予約の内容と宿泊先への連絡方法を、通信がなくても見られるようにします。",
      "空港から宿泊先までの移動と、交通が変わった場合の代案を考えます。",
      "国籍と目的に合う入国案内を公式機関で確認し、不明な点を問い合わせます。",
    ],
    ["Booking details", "Contact list"],
    ["予約の内容", "連絡先一覧"],
    [
      ["予約", "よやく", "Reservation"],
      ["到着", "とうちゃく", "Arrival"],
      ["連絡先", "れんらくさき", "Contact details"],
    ],
    "予約を確認したいです。",
    "I would like to confirm my reservation.",
  ],
  [
    "city-hall-first-visit",
    "Plan your first city-hall visit",
    "市役所への最初の訪問",
    "Find the right counter and ask which procedures apply to you.",
    "担当窓口を調べ、自分に必要な手続きを確認します。",
    "municipal",
    "administrative",
    ["student", "ssw", "professional", "resident"],
    ["arriving", "settling"],
    [0, 2],
    [
      "Find your municipality's official office information and language support.",
      "Explain your arrival and living situation without assuming every procedure applies.",
      "Ask staff to confirm the documents, appointment arrangements and any applicable deadline before you leave.",
    ],
    [
      "住む自治体の公式な窓口情報と通訳などの支援を調べます。",
      "来日や生活の状況を説明します。すべての手続きが必要とは限りません。",
      "必要な書類、予約の要否、該当する期限を担当者に確認します。",
    ],
    [
      "Documents specifically requested by the municipal office",
      "Your own questions",
    ],
    ["自治体の窓口から案内された書類", "質問のメモ"],
    [
      ["市役所", "しやくしょ", "City hall"],
      ["住所", "じゅうしょ", "Address"],
      ["窓口", "まどぐち", "Service counter"],
    ],
    "住所の手続きは、どの窓口ですか。",
    "Which counter handles address procedures?",
  ],
  [
    "confirm-document-requirements",
    "Confirm your document requirements",
    "必要な書類を確認する",
    "Use official instructions for your own application or procedure.",
    "自分の申請や手続きに合う公式の案内を確認します。",
    "law",
    "legal",
    ["student", "ssw", "professional", "resident"],
    allStages,
    [0, 5],
    [
      "Identify the exact procedure and the authority responsible for it.",
      "Read the current official instructions and ask about anything that depends on your circumstances.",
      "Confirm the required originals, copies and deadline with that authority. This checklist does not decide eligibility.",
    ],
    [
      "どの手続きなのか、担当する公式機関はどこかを確かめます。",
      "最新の公式案内を読み、個別の事情で変わる点を問い合わせます。",
      "原本・写し・期限を担当機関に確認します。このチェックリストは資格の有無を判断しません。",
    ],
    [
      "The authority's current document list",
      "Copies only if the authority requests them",
    ],
    ["担当機関の最新の必要書類一覧", "担当機関が求める場合の写し"],
    [
      ["書類", "しょるい", "Documents"],
      ["申請", "しんせい", "Application"],
      ["確認", "かくにん", "Confirmation"],
    ],
    "必要な書類を教えていただけますか。",
    "Could you tell me which documents are needed?",
  ],
  [
    "understand-your-housing",
    "Understand your housing arrangements",
    "住まいの条件を確認する",
    "Read your own housing terms and organise utilities with the responsible provider.",
    "住まいの契約条件と設備の手続きを担当者に確認します。",
    "suggestion",
    "administrative",
    ["student", "ssw", "professional", "resident"],
    ["before", "arriving", "settling"],
    [3],
    [
      "Ask your school, accommodation contact or agent about available housing and support.",
      "Request a clear explanation of your actual contract, charges, house rules and move-in condition record before agreeing.",
      "Confirm who arranges electricity, gas, water and internet, and which appointments or identification the provider requires.",
    ],
    [
      "学校、宿泊先の担当者、不動産会社に住まいや支援について尋ねます。",
      "同意する前に、自分の契約、費用、建物のルール、入居時の状態確認を説明してもらいます。",
      "電気・ガス・水道・インターネットを誰が手配するか、予約や本人確認の要件を確認します。",
    ],
    [
      "Your proposed or current housing contract",
      "Provider's own requested information",
    ],
    ["検討中または現在の住まいの契約", "各事業者が求める情報"],
    [
      ["家賃", "やちん", "Rent"],
      ["契約", "けいやく", "Contract"],
      ["水道", "すいどう", "Water service"],
    ],
    "この費用について、説明していただけますか。",
    "Could you explain this charge?",
  ],
  [
    "money-and-insurance-questions",
    "Organise money and insurance questions",
    "お金と保険の質問を整理する",
    "Confirm banking, tax, insurance and pension matters with the responsible institution.",
    "銀行・税金・保険・年金について担当機関に確認します。",
    "law",
    "legal",
    ["student", "ssw", "professional", "resident"],
    ["arriving", "settling"],
    [1, 4],
    [
      "Ask the bank or mobile provider which services and identity checks fit your circumstances; requirements differ.",
      "Ask your employer or municipal office which health insurance and pension arrangements apply to you.",
      "Keep a private reminder to ask the responsible tax office about any notice or deadline you do not understand. Do not upload financial documents here.",
    ],
    [
      "銀行や携帯電話会社に、自分の状況で利用できるサービスと本人確認を尋ねます。要件は異なります。",
      "勤務先や自治体に、自分に該当する医療保険や年金の手続きを確認します。",
      "分からない税の通知や期限は担当窓口に尋ねる予定を記録します。金融関係の書類をこのサイトに送らないでください。",
    ],
    [
      "The provider's current document list",
      "Questions about a notice, without uploading it",
    ],
    [
      "事業者の最新の必要書類一覧",
      "通知についての質問（書類のアップロードは不要）",
    ],
    [
      ["口座", "こうざ", "Bank account"],
      ["保険", "ほけん", "Insurance"],
      ["年金", "ねんきん", "Pension"],
    ],
    "私の場合、どの手続きが必要ですか。",
    "Which procedures are needed in my situation?",
  ],
  [
    "prepare-for-a-clinic-visit",
    "Prepare for a clinic visit",
    "診療所への訪問を準備する",
    "Prepare a short explanation and confirm the clinic's arrangements.",
    "症状を伝える言葉を準備し、医療機関の案内を確認します。",
    "suggestion",
    "safety",
    audience,
    allStages,
    [7, 4],
    [
      "For a planned visit, confirm the clinic's hours, language support, appointment and payment arrangements.",
      "Prepare a short description of your concern and any information a qualified clinician asks for; do not enter private medical details in this app.",
      "Ask the provider or insurer what evidence of coverage is accepted now. For urgent help, use official emergency services rather than this learning page.",
    ],
    [
      "予定の受診では、診療時間、言語支援、予約、支払い方法を確認します。",
      "困っていることを短く説明する準備をし、医療者が求める情報を用意します。個人的な医療情報をこのサイトに入力しないでください。",
      "現在受け付ける保険資格の確認方法を医療機関や保険者に確認します。緊急時は学習ページではなく公的な緊急支援を利用してください。",
    ],
    [
      "Items the clinic asks you to bring",
      "Insurance or payment questions for the provider",
    ],
    ["医療機関が持参を求めるもの", "保険や支払いについての質問"],
    [
      ["病院", "びょういん", "Hospital"],
      ["受付", "うけつけ", "Reception"],
      ["予約", "よやく", "Appointment"],
    ],
    "予約が必要ですか。",
    "Do I need an appointment?",
  ],
  [
    "plan-your-daily-journey",
    "Plan your daily journey",
    "毎日の移動を考える",
    "Check your route, signs and operator guidance before travelling.",
    "移動前に経路、案内表示、交通機関の案内を確認します。",
    "culture",
    "general",
    audience,
    allStages,
    [6],
    [
      "Check your destination, route and last connection with the transport operator.",
      "Follow posted boarding directions, keep access clear and ask staff if a sign is unclear.",
      "For walking or cycling, check current official road rules and local signs. Etiquette suggestions are different from traffic laws.",
    ],
    [
      "目的地、経路、最終の乗り継ぎを交通機関の案内で確認します。",
      "乗車の案内に従い、通路をふさがず、分からない表示は係員に尋ねます。",
      "徒歩や自転車では、現在の公式の交通ルールと現地の標識を確認します。マナーと法律は区別します。",
    ],
    ["Your route and destination details"],
    ["経路と目的地の情報"],
    [
      ["駅", "えき", "Station"],
      ["乗り換え", "のりかえ", "Transfer"],
      ["出口", "でぐち", "Exit"],
    ],
    "この電車は、ここに止まりますか。",
    "Does this train stop here?",
  ],
  [
    "workplace-orientation",
    "Get ready for workplace orientation",
    "職場の説明を受ける準備",
    "Learn who to ask and how to confirm instructions before acting.",
    "作業の前に、質問先と指示の確認方法を学びます。",
    "workplace",
    "safety",
    ["ssw", "professional", "resident"],
    ["before", "arriving", "settling"],
    [1],
    [
      "Ask your supervisor who provides induction, language support and task-specific safety training.",
      "Before unfamiliar work, ask for a demonstration and check your understanding with the qualified person responsible.",
      "Find the reporting route for uncertainty or a concern. These language exercises are not safety certification or permission to operate equipment.",
    ],
    [
      "研修、言語支援、作業に必要な安全教育の担当者を上司に確認します。",
      "初めての作業では、担当の有資格者などに実演を求め、理解が合っているか確かめます。",
      "不明点や心配なことの報告先を調べます。この日本語練習は安全資格や機械の操作許可ではありません。",
    ],
    [
      "Your employer's induction information",
      "Questions to ask your supervisor",
    ],
    ["勤務先の研修案内", "上司への質問"],
    [
      ["安全", "あんぜん", "Safety"],
      ["作業", "さぎょう", "Task / work"],
      ["報告", "ほうこく", "Report"],
    ],
    "分からないので、もう一度教えてください。",
    "I do not understand; please explain again.",
  ],
  [
    "rules-and-cultural-context",
    "Understand rules in context",
    "ルールの違いを理解する",
    "Separate laws, local arrangements, workplace policies and considerate customs.",
    "法律、地域のルール、職場の方針、配慮の習慣を区別します。",
    "culture",
    "general",
    audience,
    allStages,
    [6],
    [
      "Look for the authority behind a notice: a municipality, operator, workplace or venue.",
      "Ask what the rule means in this setting rather than assuming it is the same everywhere.",
      "Use the short culture lessons below to practise considerate responses. Common customs are not automatically legal duties.",
    ],
    [
      "掲示の発信元が自治体、交通機関、勤務先、施設のどこかを確かめます。",
      "どこでも同じと思い込まず、その場所での意味を尋ねます。",
      "短い文化レッスンで配慮のある対応を練習します。一般的な習慣が法律上の義務とは限りません。",
    ],
    ["The actual notice or local guide to read privately"],
    ["自分で確認する現地の掲示や案内"],
    [
      ["分別", "ぶんべつ", "Sorting"],
      ["挨拶", "あいさつ", "Greeting"],
      ["規則", "きそく", "Rule"],
    ],
    "こちらのルールを教えてください。",
    "Please explain the rules here.",
  ],
  [
    "prepare-for-disruptions",
    "Prepare for emergencies and disruptions",
    "緊急時や災害に備える",
    "Know where official information and local help can be found.",
    "公式情報と地域の支援先を確認しておきます。",
    "suggestion",
    "safety",
    audience,
    allStages,
    [7],
    [
      "Read your accommodation's emergency information and locate the indicated evacuation routes.",
      "Find your municipality's official disaster information and decide how to receive current alerts.",
      "Agree a contact plan with people you trust. During an incident, follow current official instructions and qualified local staff, not a saved learning example.",
    ],
    [
      "宿泊先や住まいの緊急時の案内を読み、示された避難経路を確認します。",
      "自治体の公式な防災情報と、最新の警報を受け取る方法を調べます。",
      "信頼できる人と連絡方法を決めます。災害時は保存した例文ではなく、最新の公式指示や現地の担当者の案内に従います。",
    ],
    [
      "Your private emergency contact plan",
      "Official local evacuation information",
    ],
    ["自分で保管する緊急連絡の計画", "地域の公式な避難情報"],
    [
      ["避難", "ひなん", "Evacuation"],
      ["地震", "じしん", "Earthquake"],
      ["案内", "あんない", "Guidance"],
    ],
    "避難する場所はどこですか。",
    "Where is the evacuation location?",
  ],
];
const cards = [],
  banks = [];
const articles = [],
  translations = [];
for (const [i, row] of rows.entries()) {
  const [
    slug,
    title,
    titleJa,
    summary,
    summaryJa,
    kind,
    risk,
    goals,
    stage,
    sourceIndexes,
    steps,
    stepsJa,
    docs,
    docsJa,
    terms,
    phrase,
    phraseEn,
  ] = row;
  const articleId = id("d8030000", i + 1),
    deckId = id("d8040000", i + 1),
    bankId = id("d8050000", i + 1);
  const content = (ja) => ({
    sections: [
      {
        id: "overview",
        title: ja ? "概要" : "Overview",
        text: ja ? summaryJa : summary,
        kind,
      },
      {
        id: "applies",
        title: ja ? "対象と確認先" : "Who this applies to",
        text: ja
          ? "対象は選んだ学習目的の目安です。在留資格、自治体、契約、個別の状況によって案内が変わります。担当の公式機関に確認してください。"
          : "Audience labels are planning preferences. Guidance depends on residence status, municipality, contract and individual circumstances; confirm with the responsible authority.",
        kind,
      },
    ],
    steps: ja ? stepsJa : steps,
    documents: (ja ? docsJa : docs).map((name) => ({
      name,
      note: ja
        ? "持参が必要か担当者に確認してください。これは確定した必要書類一覧ではありません。"
        : "Confirm with the responsible office whether this is needed. This is not an authoritative document list.",
    })),
    deadline: null,
    phrases: [{ ja: phrase, en: phraseEn }],
    dialogue: [
      { speaker: "あなた", ja: phrase, en: phraseEn },
      {
        speaker: "担当者",
        ja: "はい。状況を確認しましょう。",
        en: "Of course. Let us check your circumstances.",
      },
    ],
  });
  articles.push({
    id: articleId,
    slug,
    category_id: categories[i].id,
    title,
    summary,
    content: content(false),
    audiences: goals,
    stages: stage,
    risk,
    deck_id: deckId,
    bank_id: bankId,
    lesson_ids: [],
    ai_scenario_id: null,
    source_ids: sourceIndexes.map((n) => sources[n].id),
    last_reviewed_at: null,
    version: 1,
    review_status: "draft",
    published: false,
    outdated: false,
    updated_at: "2026-10-25T00:00:00Z",
  });
  translations.push({
    id: id("d8060000", i + 1),
    article_id: articleId,
    locale: "ja",
    title: titleJa,
    summary: summaryJa,
    content: content(true),
    review_status: "draft",
    updated_at: "2026-10-25T00:00:00Z",
  });
  const questions = [];
  terms.forEach(([term, reading, meaning], j) => {
    const number = i * 3 + j + 1;
    cards.push({
      id: id("d8070000", number),
      vocabularyId: id("d8080000", number),
      deckId,
      level: "japan-life",
      programLabel: "Japan Life Guide",
      category: title,
      term,
      reading,
      translations: { en: meaning, ja: term },
      example: `「${term}」について確認したいです。`,
      exampleTranslation: `I would like to ask about ${meaning.toLowerCase()}.`,
    });
    const options = [meaning, terms[(j + 1) % 3][2], terms[(j + 2) % 3][2]];
    const correctIndex = number % 3;
    const rotated = options
      .slice(3 - correctIndex)
      .concat(options.slice(0, 3 - correctIndex));
    questions.push({
      id: id("d8090000", number),
      prompt: `「${term}（${reading}）」の意味はどれですか。`,
      options: rotated,
      optionIds: rotated.map((_, k) => id("d80a0000", number * 3 + k)),
      correctIndex,
      explanation: `${term} (${reading}) means ${meaning.toLowerCase()}. Practise using it when asking for clarification.`,
      japaneseExplanation: `「${term}」の意味を確認しましょう。分からないときは担当者に尋ねます。`,
      translation: `Choose the English meaning of ${term}.`,
    });
  });
  banks.push({
    id: bankId,
    articleId,
    title: `${title} · vocabulary`,
    questions,
  });
}
const cultureRows = [
  [
    "transport-etiquette",
    "Public transport etiquette",
    "公共交通のマナー",
    "culture",
    "Keep access clear and follow the operator's signs. Consider other passengers when speaking or using a phone.",
    "通路をふさがず、交通機関の掲示に従います。会話や携帯電話の利用では周りの人に配慮します。",
    "A train sign is unclear. What should you do?",
    "Ask the operator's staff",
    "Assume every railway has identical rules",
    "Ignore all signs",
    "表示が分からないときは係員に確認します。",
  ],
  [
    "apartment-rules",
    "Apartment rules",
    "住まいのルール",
    "suggestion",
    "Read your own lease and building notices. Ask the manager about unclear arrangements rather than applying another building's rules.",
    "自分の契約と建物の掲示を読みます。別の建物のルールを当てはめず、分からないことは管理者に尋ねます。",
    "Where should you confirm your building's arrangements?",
    "Your contract and building manager",
    "A rule from an unrelated building",
    "A social media guess",
    "契約や建物の担当者に確認します。",
  ],
  [
    "rubbish-separation",
    "Rubbish separation",
    "ごみの分別",
    "municipal",
    "Check your municipality's sorting guidance and collection schedule, plus your building's collection point. Do not assume dates or bag rules are nationwide.",
    "自治体の分別案内・収集日と、建物の集積所を確認します。曜日や袋の決まりが全国共通とは限りません。",
    "Where do you check your local rubbish schedule?",
    "The municipality's official guidance",
    "Any city's calendar",
    "Your preferred day",
    "収集日は住む自治体の公式案内で確認します。",
  ],
  [
    "road-safety",
    "Bicycle and pedestrian safety",
    "自転車と歩行の安全",
    "law",
    "Use official road-safety information and current signs. This short language activity is not a complete statement of traffic law or riding instruction.",
    "公式の交通安全情報と現地の標識を確認します。この短い日本語練習は交通法規のすべてや運転方法を説明するものではありません。",
    "How should you verify a traffic rule?",
    "Check the responsible official road-safety authority",
    "Treat a custom as the complete law",
    "Follow an unverified comment",
    "交通ルールは担当する公式機関で確認します。",
  ],
  [
    "workplace-etiquette",
    "Workplace etiquette",
    "職場のマナー",
    "workplace",
    "Confirm your team's communication and reporting practices with your supervisor. Workplace policies and statutory duties are different categories.",
    "職場の連絡・報告の方法を上司に確認します。職場の方針と法律上の義務は区別します。",
    "You do not understand an instruction. What is the useful response?",
    "Ask for clarification before acting",
    "Pretend to understand",
    "Invent your own safety procedure",
    "分からない指示は行動する前に確認します。",
  ],
  [
    "greetings",
    "Greetings and communication",
    "挨拶と伝え方",
    "culture",
    "Choose a greeting that fits the relationship and situation. A polite alternative can improve register without making the casual original grammatically wrong.",
    "関係や場面に合う挨拶を選びます。丁寧な言い方が合う場合でも、カジュアルな文が文法的に誤りとは限りません。",
    "Does a more polite alternative always mean the original grammar was wrong?",
    "No; register and grammar are different",
    "Yes, always",
    "Only if written in kanji",
    "丁寧さと文法の正しさは別です。",
  ],
  [
    "cultural-customs",
    "Cultural customs",
    "文化と習慣",
    "culture",
    "Observe the setting and ask respectfully when unsure. Customs vary among people and places; avoid turning stereotypes into universal obligations.",
    "その場の様子を見て、分からないときは丁寧に尋ねます。習慣は人や場所で異なり、思い込みを一律の義務にしません。",
    "You are unsure about a custom. What helps?",
    "Ask respectfully in that setting",
    "Assume everyone has the same preference",
    "Describe every custom as a law",
    "分からない習慣は、その場で丁寧に尋ねます。",
  ],
  [
    "emergency-preparedness",
    "Emergency preparedness",
    "防災の準備",
    "suggestion",
    "Read the local emergency information before you need it. Follow current official alerts and local instructions during an incident.",
    "緊急時の地域の案内を事前に読みます。災害時は最新の公式警報と現地の指示に従います。",
    "Which information should guide you during a disaster?",
    "Current official alerts and local instructions",
    "An old practice dialogue",
    "An invented universal schedule",
    "最新の公式情報と現地の指示を確認します。",
  ],
];
cultureRows.forEach(
  (
    [slug, title, titleJa, kind, body, bodyJa, prompt, correct, a, b, exJa],
    i,
  ) => {
    const n = i + 11,
      articleId = id("d8030000", n),
      bankId = id("d8050000", n),
      categoryIndex =
        i === 7
          ? 9
          : i === 0 || i === 3
            ? 6
            : i === 1 || i === 2
              ? 3
              : i === 4
                ? 7
                : 8;
    const content = (ja) => ({
      sections: [
        {
          id: "lesson",
          title: ja ? titleJa : title,
          text: ja ? bodyJa : body,
          kind,
        },
      ],
      steps: [
        ja
          ? "掲示や担当者の説明を確認し、短いクイズで理解を振り返りましょう。"
          : "Check the actual notice or responsible person's explanation, then reflect with a short quiz.",
      ],
      documents: [],
      deadline: null,
      phrases: [
        {
          ja: "もう一度、説明していただけますか。",
          en: "Could you explain once more?",
        },
      ],
      dialogue: [],
    });
    articles.push({
      id: articleId,
      slug,
      category_id: categories[categoryIndex].id,
      title,
      summary: body,
      content: content(false),
      audiences: audience,
      stages: allStages,
      risk:
        kind === "law" ? "legal" : i === 7 || i === 4 ? "safety" : "general",
      deck_id: null,
      bank_id: bankId,
      lesson_ids: [],
      ai_scenario_id: null,
      source_ids: [sources[i === 7 ? 7 : i === 1 ? 3 : 6].id],
      last_reviewed_at: null,
      version: 1,
      review_status: "draft",
      published: false,
      outdated: false,
      updated_at: "2026-10-25T00:00:00Z",
    });
    translations.push({
      id: id("d8060000", n),
      article_id: articleId,
      locale: "ja",
      title: titleJa,
      summary: bodyJa,
      content: content(true),
      review_status: "draft",
      updated_at: "2026-10-25T00:00:00Z",
    });
    const correctIndex = i % 3,
      options = [correct, a, b],
      rotated = options
        .slice(3 - correctIndex)
        .concat(options.slice(0, 3 - correctIndex));
    banks.push({
      id: bankId,
      articleId,
      title,
      questions: [
        {
          id: id("d8090000", 100 + i),
          prompt,
          options: rotated,
          optionIds: rotated.map((_, k) => id("d80a0000", (100 + i) * 3 + k)),
          correctIndex,
          explanation: body,
          japaneseExplanation: exJa,
          translation: bodyJa,
        },
      ],
    });
  },
);
const templateRows = [
  [
    "Pre-departure preparation",
    "出発前の準備",
    0,
    audience,
    ["before"],
    0,
    "all",
  ],
  [
    "Arrival checklist",
    "来日直後の確認",
    1,
    ["student", "ssw", "professional", "resident"],
    ["arriving"],
    1,
    "all",
  ],
  [
    "Municipal procedures",
    "自治体の手続き",
    1,
    ["student", "ssw", "professional", "resident"],
    ["arriving", "settling"],
    1,
    "all",
  ],
  [
    "School or employment onboarding",
    "学校や職場での案内",
    7,
    ["student", "ssw", "professional"],
    allStages,
    7,
    "all",
  ],
  [
    "Housing arrangements",
    "住まいの準備",
    3,
    ["student", "ssw", "professional", "resident"],
    allStages,
    3,
    "renting",
  ],
  [
    "Banking and mobile service",
    "銀行と携帯電話",
    4,
    ["student", "ssw", "professional", "resident"],
    ["arriving", "settling"],
    4,
    "banking",
  ],
  [
    "Insurance and pension preparation",
    "保険と年金の準備",
    4,
    ["student", "ssw", "professional", "resident"],
    allStages,
    4,
    "all",
  ],
  [
    "Transport and daily life",
    "交通と日常生活",
    6,
    audience,
    allStages,
    6,
    "all",
  ],
  [
    "Workplace safety orientation",
    "職場の安全研修",
    7,
    ["ssw", "professional"],
    allStages,
    7,
    "all",
  ],
];
const templates = [],
  items = [];
templateRows.forEach(
  ([title, title_ja, cat, goals, stage, articleIndex, circumstance], i) => {
    const article = articles[articleIndex],
      tr = translations[articleIndex],
      templateId = id("d80b0000", i + 1);
    templates.push({
      id: templateId,
      title,
      title_ja,
      guide_category_id: categories[cat].id,
      audiences: goals,
      stages: stage,
      source_id: article.source_ids[0],
      review_status: "draft",
      published: false,
      updated_at: "2026-10-25T00:00:00Z",
    });
    article.content.steps.forEach((step, j) =>
      items.push({
        id: id("d80c0000", i * 3 + j + 1),
        template_id: templateId,
        title: step,
        title_ja: tr.content.steps[j],
        note: "Personal planning reminder. Confirm whether any official procedure applies to your circumstances; checking this box does not establish legal compliance.",
        note_ja:
          "個人の準備メモです。該当する公式な手続きは担当者に確認してください。チェックしても法令上の義務を満たしたことにはなりません。",
        kind: article.content.sections[0].kind,
        circumstance,
        audiences: goals,
        position: j,
        guide_id: article.id,
      }),
    );
  },
);
// Separate arrival, orientation and insurance planning rather than duplicating municipal tasks.
const customTasks = {
  1: [
    [
      "Confirm your accommodation contact and arrival arrangements.",
      "宿泊先の連絡先と到着時の案内を確認します。",
    ],
    [
      "Check the route from your arrival point to your accommodation.",
      "到着地点から宿泊先までの経路を確認します。",
    ],
    [
      "Ask your school or employer about the first orientation contact.",
      "学校や勤務先に最初の案内の連絡先を尋ねます。",
    ],
  ],
  3: [
    [
      "Ask your school's international office about its orientation schedule.",
      "学校の留学生担当窓口に、オリエンテーションの日程を尋ねます。",
    ],
    [
      "Ask your employer who provides induction and language support.",
      "勤務先に、研修と言語支援の担当者を確認します。",
    ],
    [
      "Prepare questions and confirm your school or employer's own instructions.",
      "質問を準備し、学校や勤務先の案内を確認します。",
    ],
  ],
  6: [
    [
      "Ask which health-insurance arrangements apply to your circumstances.",
      "自分に該当する医療保険の取り扱いを担当者に確認します。",
    ],
    [
      "Ask the responsible pension contact whether any procedure applies to you.",
      "年金の担当窓口に、自分に必要な手続きがあるか尋ねます。",
    ],
    [
      "Record a personal reminder to follow the responsible office's instructions.",
      "担当窓口の案内を確認するため、個人の予定を記録します。",
    ],
  ],
};
for (const [index, tasks] of Object.entries(customTasks)) {
  const ti = Number(index),
    group = items.filter((i) => i.template_id === templates[ti].id);
  group.forEach((item, j) => {
    [item.title, item.title_ja] = tasks[j];
    item.kind = "suggestion";
    if (ti === 3) {
      item.audiences =
        j === 0
          ? ["student"]
          : j === 1
            ? ["ssw", "professional"]
            : ["student", "ssw", "professional"];
      item.guide_id = j === 0 ? null : item.guide_id;
    }
  });
}
for (const index of [4, 5]) {
  templates[index].audiences = audience;
  items
    .filter((i) => i.template_id === templates[index].id)
    .forEach((i) => (i.audiences = audience));
}
templates[5].stages = allStages;
const roleplayRows = [
  [
    1,
    "register-address",
    "Registering an address",
    "住所の手続き",
    "住所の手続きについて質問したいです。",
    "I would like to ask about address procedures.",
  ],
  [
    4,
    "ask-insurance",
    "Asking about health insurance",
    "医療保険について尋ねる",
    "私の場合、保険の相談はどこでできますか。",
    "Where can I ask about insurance in my circumstances?",
  ],
  [
    4,
    "open-bank-account",
    "Opening a bank account",
    "銀行口座について尋ねる",
    "口座について、必要な書類を教えていただけますか。",
    "Could you tell me which documents are needed for an account?",
  ],
  [
    6,
    "ask-directions",
    "Asking for directions",
    "道を尋ねる",
    "すみません、駅の出口はどちらですか。",
    "Excuse me, which way is the station exit?",
  ],
  [
    3,
    "talk-landlord",
    "Talking to a landlord",
    "住まいの担当者と話す",
    "契約について、確認したいことがあります。",
    "I have a question about the contract.",
  ],
  [
    5,
    "visit-clinic",
    "Visiting a clinic",
    "診療所で話す",
    "予約の方法を教えてください。",
    "Please explain how to make an appointment.",
  ],
  [
    7,
    "speak-supervisor",
    "Speaking with a supervisor",
    "上司に確認する",
    "作業の前に、もう一度確認してもよろしいですか。",
    "May I check once more before starting the task?",
  ],
];
const roleplays = roleplayRows.map(
  ([articleIndex, slug, title, title_ja, ja, en], i) => {
    const scenarioId = id("d80d0000", i + 1),
      article = articles[articleIndex];
    if (!article.ai_scenario_id) article.ai_scenario_id = scenarioId;
    return {
      id: scenarioId,
      articleId: article.id,
      slug,
      title,
      title_ja,
      description:
        "Practise asking for clarification. This role-play cannot determine legal, financial or medical outcomes.",
      description_ja:
        "確認の表現を練習します。法的・金融・医療の結果は判断しません。",
      suggested_level: "N5–N2",
      opening: "こんにちは。どのようなご相談でしょうか。",
      opening_translation: "Hello. How can I help you?",
      prompt_template: `Language role-play: ${title}. Ask one short question at a time. Help the learner ask the responsible official or professional for clarification. Never determine eligibility, promise approval, invent document lists/deadlines, request identifiers or offer medical/financial/operational advice.`,
      dialogue: [
        {
          speaker: "担当者",
          ja: "こんにちは。どのようなご相談でしょうか。",
          en: "Hello. How can I help you?",
        },
        { speaker: "あなた", ja, en },
        {
          speaker: "担当者",
          ja: "状況を確認しましょう。",
          en: "Let us check the circumstances.",
        },
      ],
    };
  },
);
// All related lessons and question banks still pass through the existing educator review workflow.
for (const article of articles) {
  const scripts = roleplays
    .filter((r) => r.articleId === article.id)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      title_ja: r.title_ja,
      scenario_id: r.id,
      dialogue: r.dialogue,
    }));
  article.content.roleplays = scripts;
  translations.find((t) => t.article_id === article.id).content.roleplays =
    scripts;
}
articles.forEach(
  (article, i) => (article.lesson_ids = [id("d8100000", i + 1)]),
);
articles.forEach(
  (article, i) => (article.format = i < 10 ? "guide" : "lesson"),
);
const culturePrompts = [
  // These original questions test distinctions, not legal eligibility.
  "電車の表示が分からないとき、どうしますか。",
  "建物のルールは、どこで確認しますか。",
  "ごみの収集日は、どこで確認しますか。",
  "交通ルールは、どこで確かめますか。",
  "作業の指示が分からないとき、どうしますか。",
  "より丁寧な表現があると、元の文法は必ず誤りですか。",
  "習慣が分からないとき、どうしますか。",
  "災害時には、どの情報を確認しますか。",
];
banks.slice(10).forEach((bank, i) => {
  bank.questions[0].translation = bank.questions[0].prompt;
  bank.questions[0].prompt = culturePrompts[i];
});
const catalog = {
  categories,
  articles,
  translations,
  sources,
  templates,
  items,
};
fs.writeFileSync(
  "src/data/guide-content.json",
  JSON.stringify(
    {
      catalog,
      cards,
      banks,
      roleplays,
      programId: id("d80e0000", 1),
      courseId: id("d80f0000", 1),
    },
    null,
    2,
  ) + "\n",
);
console.log({
  categories: categories.length,
  articles: articles.length,
  checklistItems: items.length,
  cards: cards.length,
  questions: banks.flatMap((b) => b.questions).length,
  roleplays: roleplays.length,
});
