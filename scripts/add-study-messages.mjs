import fs from "node:fs";
const en = {
  eyebrow: "YOUR DAILY PRACTICE",
  flashcards: "Flashcards",
  grammar: "N4 grammar practice",
  intro: "A little focus. A lasting connection.",
  demo: "Visitor demo · Results stay in this session only.",
  member: "Signed in · Reviews and results are saved to your account.",
  notOfficial:
    "Independent practice, not an official JLPT exam or scaled score.",
  back: "Back to course",
  flip: "Flip card",
  front: "Show Japanese",
  previous: "Previous",
  next: "Next",
  known: "I Know It",
  again: "Learn Again",
  card: "Card {current} of {total}",
  reviewed: "{count} reviewed",
  remaining: "{count} remaining",
  finish: "View session results",
  reviewComplete: "A good step forward.",
  reviewSummary:
    "You reviewed {total} cards: {known} known, {again} to revisit.",
  retry: "Start a new session",
  keyboard:
    "Tab to a control, then press Enter or Space. Use arrow keys for Previous / Next when the card is focused.",
  startQuiz: "Start practice",
  quizIntro:
    "20 questions · Untimed · One answer per question. You can revisit your answers before submitting.",
  question: "Question {current} of {total}",
  answered: "{count} of {total} answered",
  submit: "Submit answers",
  confirmTitle: "Ready to finish?",
  confirmText:
    "Your answers will be scored and explanations revealed. You cannot edit this attempt after submitting.",
  confirm: "Submit and see results",
  cancel: "Keep learning",
  saving: "Saving…",
  loading: "Loading…",
  networkError:
    "Could not complete the request. Check your connection and retry; your answers are still here.",
  sessionError:
    "Your session expired. Log in again before saving. Your current session remains on this page.",
  results: "Your practice results",
  score: "{score} / {total} correct",
  accuracy: "Accuracy",
  correct: "Correct",
  incorrect: "Review this answer",
  yourAnswer: "Your answer",
  correctAnswer: "Correct answer",
  explanation: "Why this works",
  translation: "English translation",
  saved: "Saved to your account.",
  unsaved: "Demo result · Not saved to an account.",
  newAttempt: "Try a new attempt",
  reviewAnswers: "Review your answers",
  login: "Log in",
  register: "Create your account",
  forgot: "Forgot password?",
  reset: "Set a new password",
  profile: "Profile & preferences",
  email: "Email address",
  password: "Password",
  confirmPassword: "Confirm password",
  displayName: "Display name",
  language: "Interface language",
  goal: "Main learning goal",
  target: "JLPT target level",
  passwordHint:
    "12–128 characters, including uppercase, lowercase and a number.",
  saveProfile: "Save preferences",
  logout: "Log out",
  dashboard: "Dashboard",
  welcome: "Welcome back, {name}.",
  goalLabel: "Your goal",
  courseProgress: "Course progress",
  recent: "Recently studied lessons",
  reviews: "Flashcard reviews",
  attempts: "Quiz attempts",
  average: "Average quiz accuracy",
  suggested: "Your next step",
  noLessons:
    "No lessons studied yet. Lesson content is still in development; start with the vocabulary decks or grammar practice.",
  noAttempts:
    "No quiz attempts yet. Your first completed practice will appear here.",
  noReviews: "No flashcard reviews yet. Choose a deck to begin.",
  noContent: "Lessons are in development. No lesson progress is available yet.",
  empty: "Your learning history starts with your first practice session.",
  unavailable:
    "Account setup is needed. Supabase or the database is unavailable. Demo learning remains available.",
  dbError:
    "We could not load your learning data. Please reload to retry. No statistics have been substituted.",
  signInRequired: "Please log in to access your personal learning space.",
  confirmEmail: "Confirm your email",
  confirmEmailText:
    "Continue to verify this email link. This button prevents email scanners from consuming your link automatically.",
  continue: "Continue",
  invalidLink:
    "This link is invalid or expired. Request a new confirmation or password-reset email.",
  passwordUpdated: "Password updated. Log in with your new password.",
  profileSaved: "Your preferences have been saved.",
  logoutError: "Logout could not be completed. Please retry.",
  sendReset: "Send reset email",
  profileIntro:
    "Choose how you learn. Your preferences are stored with your account.",
  emailNotice: "Confirm your email before logging in.",
  future: "This course is in development. No lessons are available yet.",
  chooseDeck: "Choose a vocabulary deck",
  n5Deck: "N5 · Everyday beginnings",
  n4Deck: "N4 · Build your vocabulary",
  tenCards: "10 curated vocabulary cards",
  admin: "Administration",
  adminDenied: "Administrator access required.",
  adminReady:
    "Administrator identity verified. Content editing tools are not part of this task.",
  setup: "Setup instructions",
  goals: {
    jlpt: "JLPT preparation",
    business: "Business Japanese",
    conversation: "Daily Conversation",
    study: "Studying in Japan",
    work: "Working in Japan",
    travel: "Traveling in Japan",
  },
};
const ja = {
  eyebrow: "毎日の学習",
  flashcards: "単語カード",
  grammar: "N4文法練習",
  intro: "少しの集中が、確かな力に。",
  demo: "ゲストデモ · 結果はこのセッション内のみです。",
  member: "ログイン中 · 復習と結果はアカウントに保存されます。",
  notOfficial: "独自の練習問題です。公式JLPT試験・換算得点ではありません。",
  back: "コースに戻る",
  flip: "裏を見る",
  front: "日本語を見る",
  previous: "前へ",
  next: "次へ",
  known: "覚えた",
  again: "もう一度",
  card: "{total}枚中{current}枚目",
  reviewed: "{count}枚復習済み",
  remaining: "残り{count}枚",
  finish: "結果を見る",
  reviewComplete: "一歩、前へ。",
  reviewSummary:
    "{total}枚を復習しました。覚えた：{known}枚、もう一度：{again}枚。",
  retry: "新しいセッション",
  keyboard:
    "Tabで操作を選び、EnterまたはSpaceで実行します。カードにフォーカス中は左右矢印キーで移動できます。",
  startQuiz: "練習を始める",
  quizIntro: "20問・時間制限なし・各問1つの答え。提出前に答えを見直せます。",
  question: "{total}問中{current}問目",
  answered: "{total}問中{count}問回答済み",
  submit: "解答を提出",
  confirmTitle: "提出しますか？",
  confirmText: "採点と解説を表示します。提出後、この回の解答は変更できません。",
  confirm: "提出して結果を見る",
  cancel: "学習を続ける",
  saving: "保存中…",
  loading: "読み込み中…",
  networkError:
    "処理できませんでした。接続を確認して再試行してください。解答は保持されています。",
  sessionError:
    "セッションが切れました。再ログインしてください。このページの解答は保持されています。",
  results: "練習の結果",
  score: "{total}問中{score}問正解",
  accuracy: "正答率",
  correct: "正解",
  incorrect: "見直しましょう",
  yourAnswer: "あなたの解答",
  correctAnswer: "正解",
  explanation: "文法のポイント",
  translation: "英訳",
  saved: "アカウントに保存しました。",
  unsaved: "デモ結果 · アカウントには保存されません。",
  newAttempt: "もう一度挑戦",
  reviewAnswers: "解答を振り返る",
  login: "ログイン",
  register: "アカウント作成",
  forgot: "パスワードを忘れた場合",
  reset: "新しいパスワードを設定",
  profile: "プロフィールと設定",
  email: "メールアドレス",
  password: "パスワード",
  confirmPassword: "パスワードの確認",
  displayName: "表示名",
  language: "表示言語",
  goal: "主な学習目標",
  target: "JLPT目標レベル",
  passwordHint: "12〜128文字で英大文字・小文字・数字を含めてください。",
  saveProfile: "設定を保存",
  logout: "ログアウト",
  dashboard: "ダッシュボード",
  welcome: "おかえりなさい、{name}さん。",
  goalLabel: "学習目標",
  courseProgress: "コースの進捗",
  recent: "最近学習したレッスン",
  reviews: "単語カードの復習数",
  attempts: "文法練習の回数",
  average: "平均正答率",
  suggested: "次の一歩",
  noLessons:
    "学習済みレッスンはまだありません。レッスンは開発中です。単語カードや文法練習から始めましょう。",
  noAttempts: "練習の記録はまだありません。最初の結果がここに表示されます。",
  noReviews: "復習の記録はまだありません。デッキを選んで始めましょう。",
  noContent: "レッスンは開発中のため、進捗はまだありません。",
  empty: "最初の練習から、学習の記録が始まります。",
  unavailable:
    "Supabaseまたはデータベースの設定が必要です。デモ学習は利用できます。",
  dbError:
    "学習データを取得できません。再読み込みしてください。代わりの数値は表示していません。",
  signInRequired: "学習スペースにアクセスするにはログインしてください。",
  confirmEmail: "メールアドレスを確認",
  confirmEmailText:
    "ボタンを押してメールリンクを確認してください。メールスキャナーによるリンクの自動消費を防ぎます。",
  continue: "続ける",
  invalidLink:
    "リンクが無効か期限切れです。確認メールまたは再設定メールを再度送信してください。",
  passwordUpdated: "更新しました。新しいパスワードでログインしてください。",
  profileSaved: "設定を保存しました。",
  logoutError: "ログアウトできませんでした。再試行してください。",
  sendReset: "再設定メールを送信",
  profileIntro: "学び方を選びましょう。設定はアカウントに保存されます。",
  emailNotice: "ログイン前にメールアドレスを確認してください。",
  future: "このコースは開発中です。レッスンはまだありません。",
  chooseDeck: "単語デッキを選ぶ",
  n5Deck: "N5 · 日常のはじまり",
  n4Deck: "N4 · 語彙を広げる",
  tenCards: "厳選した10枚の単語カード",
  admin: "管理",
  adminDenied: "管理者権限が必要です。",
  adminReady: "管理者を確認しました。編集ツールはこのタスクの対象外です。",
  setup: "設定方法",
  goals: {
    jlpt: "JLPT対策",
    business: "ビジネス日本語",
    conversation: "日常会話",
    study: "日本への留学",
    work: "日本での就職",
    travel: "日本旅行",
  },
};
for (const [locale, study] of [
  ["en", en],
  ["ja", ja],
]) {
  const file = `messages/${locale}.json`;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.Study = study;
  data.Home.availability =
    locale === "ja"
      ? "N5・N4の単語カードとN4文法練習を公開中です。"
      : "Try N5/N4 vocabulary decks and N4 grammar practice.";
  data.Home.flashcardsLink = study.flashcards;
  data.Home.mockTestsLink = study.grammar;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
const file = "src/data/quiz-private.json";
const quiz = JSON.parse(fs.readFileSync(file, "utf8"));
quiz[7].options = ["すぎます", "すぎた", "すぎる", "すぎて"];
quiz[10].options = ["おき", "おいて", "おく", "おこう"];
quiz[10].correctIndex = 0;
quiz[10].explanation =
  "Verb て-form + おく describes preparation for later. Its polite form is ておきます. Here 予約しておきます means “reserve in advance”. Only おき connects to the printed ます ending.";
quiz[17].options = ["みます", "みて", "みる", "みた"];
fs.writeFileSync(file, JSON.stringify(quiz, null, 2) + "\n");
