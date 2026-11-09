import fs from "node:fs";
const en = {
  jftTitle: "JFT-Basic preparation",
  jftIntro:
    "Japanese for the moments that matter. Practise everyday language, understand the test, and build confidence at your own pace.",
  sswTitle: "Japanese for your working life",
  sswIntro:
    "Explore industry language, practise respectful workplace conversations, and prepare to communicate clearly in Japan.",
  explorePractice: "Find your practice",
  setGoal: "Personalize my learning",
  everydayTitle: "Ready for everyday Japan",
  everydayDesc:
    "Reading a notice. Asking a question. Understanding a reply. Build practical Japanese across four connected skills.",
  sections: "sections",
  minutes: "minutes",
  questions: "questions",
  fourSections: "Four skills. One clear path.",
  format: "Practice format",
  quick: "Quick practice",
  section: "Section practice",
  script: "Script & Vocabulary",
  scriptDesc: "Recognise everyday words, kanji and useful expressions.",
  conversation: "Conversation & Expression",
  conversationDesc: "Choose natural expressions for daily situations.",
  listening: "Listening Comprehension",
  listeningDesc: "Understand conversations and spoken instructions.",
  reading: "Reading Comprehension",
  readingDesc: "Find meaning in signs, messages and schedules.",
  "word-meaning": "Vocabulary meaning",
  "word-usage": "Word usage",
  "kanji-reading": "Kanji readings",
  "grammar-expression": "Grammar expressions",
  "situational-conversation": "Situational conversations",
  "signs-notices": "Signs & notices",
  "messages-schedules": "Messages & schedules",
  comingSoon: "Coming soon",
  audioPending: "Awaiting reviewed questions and verified audio.",
  simulation: "Full examination simulation",
  simulationInfo:
    "Official reference: approximately 50 questions in 60 minutes, with no separate section time limits.",
  simulationRules:
    "Review is limited to the current section. Completed sections cannot be reopened. Listening questions do not permit previous/next review; the official test allows up to two audio plays.",
  simulationPending: "Not available yet",
  recommended: "Your next learning steps",
  foundation: "Strengthen your foundation",
  foundationDesc: "Build vocabulary and grammar with our JLPT N5 lessons.",
  openLessons: "Explore lessons",
  workplaceBridge: "Connect learning to work",
  workplaceBridgeDesc:
    "Take practical Japanese into everyday workplace situations.",
  exploreTracks: "Explore industry tracks",
  demo: "Original draft preview · This content has not been independently educator-approved. Practice here is not saved. Published, reviewed content will use your signed-in account.",
  practiceNote:
    "These are original learning exercises, not official exam papers. Raw practice accuracy is not an official scaled score or a pass prediction.",
  officialSources: "Official information, clearly sourced",
  reviewed: "Last checked:",
  disclaimer:
    "NihonPath provides learning practice. We do not issue official qualifications, guarantee results, or decide immigration eligibility. Confirm current requirements with the official authorities.",
  chooseIndustry: "Choose your industry",
  communicationFirst: "Communication comes first",
  communicationDesc:
    "Ask clearly. Confirm instructions. Show respect. Learn the language used by real teams.",
  industryTracks: "Find your industry learning track",
  taxonomyNote:
    "These are our initial learning tracks, not a complete list of eligible SSW sectors. Requirements and application availability can change.",
  openTrack: "Explore this track",
  requirements: "Language & skills requirements",
  requirementsInfo:
    "SSW preparation involves both Japanese communication and field-specific skills. Many fields list JFT-Basic or JLPT N4 or higher, but required levels, exemptions and test arrangements vary. Use the current official sector guidance.",
  careRequirement:
    "Nursing care lists an additional nursing care Japanese evaluation. These lessons teach language; they do not certify care, safety or operational competence.",
  currentRequirements: "Check current official sector guidance",
  vocabularyTitle: "Workplace vocabulary",
  vocabularyDesc:
    "Flip, shuffle and review practical words in context. Signed-in reviews of published cards use the existing spaced-repetition schedule.",
  studyDeck: "Study this deck",
  industryQuiz: "Vocabulary check",
  industryQuizDesc:
    "Check your understanding of key workplace words and review explanations.",
  startPractice: "Start practice",
  interviewTitle: "Japanese interview preparation",
  interviewCardDesc:
    "Practise introducing yourself and explaining your experience politely.",
  backToTrack: "Back to industry track",
  scenarioTitle: "Workplace conversations",
  noScenarios: "Reviewed scenarios are being prepared.",
  furigana: "Show furigana",
  translation: "Show English translation",
  previousScenario: "Previous scenario",
  nextScenario: "Next scenario",
  safetyNote:
    "Language practice is not professional or safety certification. Follow your workplace training, qualified supervision and actual procedures.",
  interviewIntro:
    "Prepare truthful, personal answers. Explore deterministic examples, compare your own response, and practise polite Japanese. No AI speaking is used.",
  industry: "Industry",
  allTopics: "All interview topics",
  noInterviews: "Reviewed interview questions are being prepared.",
  yourDraft: "Try your own answer",
  draftPrivacy:
    "Your draft stays in this page and is not uploaded or saved. Changing questions clears it. Only lesson completion can be saved for published content.",
  hideAnswer: "Hide suggested answer",
  revealAnswer: "Reveal suggested answer",
  suggestedAnswer: "Suggested answer · personalize it",
  guestProgress:
    "Sign in to save practice on published content. Guest and draft previews stay in the current session.",
  previous: "Previous",
  next: "Next",
  tryAgain: "Try again",
  workplaceTitle: "Workplace Japanese practice",
  workplaceIntro:
    "Try short conversations from different industries. Ask for clarification, respond politely, and learn from each choice.",
  yourProgress: "Your learning, at a glance",
  signIn: "Sign in",
  progressUnavailable:
    "Saved progress is not available right now. Your practice can continue without saved statistics.",
  lessonsCompleted: "Lessons completed",
  reviewEvents: "Card review events",
  knownCards: "Cards on a Known streak",
  dueCards: "Cards due now",
  noProgress:
    "No published learning tracks are available for saved progress yet.",
  previousAttempts: "Recent saved practice attempts",
  noAttempts: "No saved practice results yet.",
  weakAreas: "Practice areas to revisit",
  jlptHistory: "Completed JLPT examinations",
  statsNote:
    "Counts come from your actual saved records. Practice scores are not official examination results. History shows the latest 20 practice attempts.",
  loadError: "This content could not be loaded. Please try again.",
};
const ja = {
  ...en,
  jftTitle: "JFT-Basic 対策",
  jftIntro:
    "日本での毎日に役立つ日本語を、自分のペースで練習しましょう。試験の形式を知り、実用的な表現を身につけます。",
  sswTitle: "日本で働くための日本語",
  sswIntro:
    "業界の言葉や丁寧な職場の会話を練習し、分かりやすく伝える力を育てましょう。",
  explorePractice: "練習を選ぶ",
  setGoal: "学習目標を設定",
  everydayTitle: "日本の毎日に向けて",
  everydayDesc:
    "お知らせを読む、質問する、返事を理解する。四つの分野で実用的な日本語を学びます。",
  sections: "分野",
  minutes: "分",
  questions: "問",
  fourSections: "四つの分野から学ぼう",
  format: "練習形式",
  quick: "クイック練習",
  section: "分野別練習",
  script: "文字と語彙",
  scriptDesc: "日常の言葉や漢字、使い方を確認します。",
  conversation: "会話と表現",
  conversationDesc: "場面に合った自然な表現を選びます。",
  listening: "聴解",
  listeningDesc: "会話や話された指示を理解します。",
  reading: "読解",
  readingDesc: "看板、メッセージ、予定表を読み取ります。",
  "word-meaning": "語の意味",
  "word-usage": "語の使い方",
  "kanji-reading": "漢字の読み方",
  "grammar-expression": "文法表現",
  "situational-conversation": "場面別会話",
  "signs-notices": "看板とお知らせ",
  "messages-schedules": "メッセージと予定表",
  comingSoon: "準備中",
  audioPending: "確認済みの問題と再生確認済み音声を準備しています。",
  simulation: "試験シミュレーション",
  simulationInfo:
    "公式試験の参考：およそ50問、60分です。分野ごとの制限時間はありません。",
  simulationRules:
    "見直しは現在の分野内に限られます。前の分野には戻れません。聴解では前後の問題の見直しはできず、音声は最大2回再生できます。",
  simulationPending: "現在は利用できません",
  recommended: "次の学習ステップ",
  foundation: "基礎を固める",
  foundationDesc: "JLPT N5のレッスンで語彙と文法を学びましょう。",
  openLessons: "レッスンを見る",
  workplaceBridge: "学習を仕事につなげる",
  workplaceBridgeDesc: "職場の日常場面で使う日本語を練習しましょう。",
  exploreTracks: "業界別学習を見る",
  demo: "オリジナル教材の下書きプレビューです。独立した教育者の確認はまだ受けていません。練習は保存されません。公開・確認済み教材はログイン後に保存できます。",
  practiceNote:
    "公式問題ではなく、独自の学習用練習です。正答率は公式の尺度得点や合否予測ではありません。",
  officialSources: "公式情報を確認する",
  reviewed: "最終確認日：",
  disclaimer:
    "NihonPathは学習用サービスです。公式資格の発行、合格保証、在留資格の判断は行いません。最新の要件は公式機関で確認してください。",
  chooseIndustry: "業界を選ぶ",
  communicationFirst: "まず、伝え合う力を",
  communicationDesc:
    "質問する、指示を確認する、相手を尊重する。職場で使う表現を練習します。",
  industryTracks: "業界別の学習を選ぶ",
  taxonomyNote:
    "当サイトの初期学習分野であり、特定技能の全対象分野の一覧ではありません。要件や申請の受付状況は変わることがあります。",
  openTrack: "この分野を学ぶ",
  requirements: "日本語と技能の要件",
  requirementsInfo:
    "特定技能では日本語でのコミュニケーションと分野別の技能が求められます。多くの分野でJFT-BasicまたはJLPT N4以上が案内されていますが、必要なレベル、免除、試験方法は異なります。公式情報で確認してください。",
  careRequirement:
    "介護分野には追加の介護日本語評価試験があります。この教材は日本語の練習であり、介護・安全・操作の能力を証明するものではありません。",
  currentRequirements: "最新の公式分野情報を確認",
  vocabularyTitle: "職場の語彙",
  vocabularyDesc:
    "カードをめくり、順番を変えて、例文と一緒に復習します。公開カードの復習はログイン後に間隔反復で保存できます。",
  studyDeck: "カードを学習",
  industryQuiz: "語彙チェック",
  industryQuizDesc: "職場の大切な言葉を確認し、解説を読みましょう。",
  startPractice: "練習を始める",
  interviewTitle: "日本語の面接練習",
  interviewCardDesc: "自己紹介や経験を丁寧に伝える練習をします。",
  backToTrack: "業界別学習に戻る",
  scenarioTitle: "職場の会話",
  noScenarios: "確認済みの会話を準備しています。",
  furigana: "ふりがなを表示",
  translation: "英訳を表示",
  previousScenario: "前の会話",
  nextScenario: "次の会話",
  safetyNote:
    "日本語の練習は専門能力や安全資格の証明ではありません。実際の職場の訓練、専門家の指示、手順に従ってください。",
  interviewIntro:
    "自分の本当の経験に基づく答えを準備しましょう。例文と比較し、丁寧な表現を練習できます。AI音声機能は使用しません。",
  industry: "業界",
  allTopics: "すべての面接テーマ",
  noInterviews: "確認済みの面接問題を準備しています。",
  yourDraft: "自分の答えを書いてみる",
  draftPrivacy:
    "入力した文章はこの画面内だけに保持され、送信・保存されません。問題を変えると消去されます。公開教材の学習完了だけを保存できます。",
  hideAnswer: "解答例を隠す",
  revealAnswer: "解答例を表示",
  suggestedAnswer: "解答例・自分に合わせて変えましょう",
  guestProgress:
    "公開教材の学習を保存するにはログインしてください。ゲストと下書きプレビューは現在の画面内だけで保持されます。",
  previous: "前へ",
  next: "次へ",
  tryAgain: "もう一度",
  workplaceTitle: "職場の日本語練習",
  workplaceIntro:
    "さまざまな業界の短い会話を練習しましょう。聞き直しや丁寧な返事を選び、解説から学べます。",
  yourProgress: "あなたの学習記録",
  signIn: "ログイン",
  progressUnavailable:
    "現在、保存された記録を利用できません。記録の保存なしで練習を続けられます。",
  lessonsCompleted: "完了したレッスン",
  reviewEvents: "カードの復習回数",
  knownCards: "「覚えた」が継続中のカード",
  dueCards: "現在復習が必要なカード",
  noProgress: "記録を保存できる公開教材はまだありません。",
  previousAttempts: "最近の練習結果",
  noAttempts: "保存された練習結果はまだありません。",
  weakAreas: "もう一度練習したい分野",
  jlptHistory: "提出済みのJLPT試験",
  statsNote:
    "実際に保存された学習記録を表示します。練習の得点は公式試験の結果ではありません。履歴は直近20回です。",
  loadError: "教材を読み込めませんでした。再試行してください。",
};
en.noTracks = "Reviewed industry tracks are being prepared.";
ja.noTracks = "確認済みの業界別教材を準備しています。";
for (const [l, msg] of Object.entries({ en, ja })) {
  const p = `messages/${l}.json`,
    d = JSON.parse(fs.readFileSync(p, "utf8"));
  d.Preparation = msg;
  Object.assign(
    d.Platform.goals,
    l === "en"
      ? {
          jft: "JFT-Basic preparation",
          ssw: "SSW industry preparation",
          workplace: "Workplace Japanese",
        }
      : {
          jft: "JFT-Basic対策",
          ssw: "特定技能の業界別学習",
          workplace: "職場の日本語",
        },
  );
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
}
