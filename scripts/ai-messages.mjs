import fs from "node:fs";
const en = {
  title: "A little conversation. A world of confidence.",
  intro:
    "Practise everyday and professional Japanese, one thoughtful reply at a time.",
  eyebrow: "NIHONPATH / CONVERSATION",
  textMode: "Text conversation",
  demo: "Scripted demo · No live AI",
  demoNote:
    "Sample responses are scripted, not live AI. They do not adapt to your full conversation or assess arbitrary text. Demo transcripts stay in this page and disappear on refresh.",
  live: "Live AI · Private saved practice",
  liveNote:
    "Your replies and conversation context are sent to OpenAI. Transcripts and feedback are saved privately in your account. Avoid personal identifiers or confidential information. AI feedback can be mistaken; it is not a proficiency score.",
  signIn: "Sign in for live conversations when the provider is enabled.",
  disabled: "Live AI is not enabled here. Explore the scripted demo below.",
  scenarios: "Choose a conversation",
  suggested: "Suggested level",
  startPractice: "Start practice",
  configure: "Make this practice yours",
  level: "JLPT level",
  scenario: "Scenario",
  correctionMode: "Corrections",
  each: "After each answer",
  end: "At the end",
  furigana: "Show reviewed furigana",
  translation: "Show English translations",
  readingNote:
    "Readings appear only on reviewed text. AI replies use plain Japanese; automatic readings are not invented.",
  target: "Conversation turns",
  turns: "turns",
  start: "Start conversation",
  saveSettings: "Save preferences",
  saved: "Preferences saved.",
  settingsNote:
    "Session level, scenario and target are fixed once started. Start another session to change them.",
  history: "Your conversations",
  emptyHistory: "No saved conversations yet.",
  resume: "Open transcript",
  delete: "Delete transcript",
  deleteConfirm:
    "Delete this saved conversation and its feedback? This cannot be undone.",
  localDelete: "Clear demo",
  conversation: "Conversation",
  you: "You",
  tutor: "Tutor",
  reply: "Your Japanese reply",
  placeholder: "日本語で一文書いてみましょう。",
  send: "Submit reply",
  sending: "Thinking…",
  endSession: "End session",
  endConfirm: "End this practice and view the summary?",
  newSession: "Start another session",
  viewCorrections: "View corrections",
  reviewVocabulary: "Review vocabulary",
  summary: "Your practice, reflected",
  completed: "Completed turns",
  finished: "Session completed",
  progress: "Conversation progress",
  corrections: "Language feedback",
  deferred: "Corrections will appear when you end the session.",
  original: "Your sentence",
  correction: "Suggested correction",
  natural: "More natural expression",
  polite: "Contextual polite alternative",
  grammar: "Grammar pattern",
  example: "Example",
  vocabulary: "Vocabulary to revisit",
  expressions: "Useful expressions",
  recommended: "Recommended learning",
  reviewItems: "Items to review",
  noItems:
    "No correction items recorded. This is not a validated proficiency result.",
  aiEstimate:
    "AI-generated learning feedback, not an official JLPT score or validated proficiency measurement.",
  demoEstimate:
    "Scripted example feedback, not an evaluation of your Japanese.",
  noVoice:
    "Text practice is available. Voice and pronunciation feedback are planned; no audio is recorded.",
  examples: "Try a sample sentence",
  usage: "Today's AI usage (UTC)",
  requests: "requests / 30",
  tokens: "tokens",
  cost: "Estimated USD",
  costUnknown: "Dollar estimate unavailable; token counts are shown.",
  usageUnknown:
    "Failed or pending requests may have unreported token usage. Totals are lower bounds; check the provider dashboard for billing.",
  historyError:
    "Saved history is unavailable. Check the AI migrations and your session.",
  loading: "Loading…",
  retryNote:
    "Your draft has been kept. Retry when ready; no automatic paid retry is made.",
  categories: {
    correct: "Correct and natural",
    grammar: "Grammar correction",
    wording: "More natural wording",
    register: "Register improvement · not a grammar error",
    non_japanese: "Japanese input guidance",
    unassessed: "Not evaluated",
  },
  errors: {
    sign_in: "Please sign in again.",
    quota:
      "Your request limit has been reached. Try later; daily limits reset at 00:00 UTC.",
    pending:
      "A reply is pending or this request was already attempted. Reopen the transcript before retrying.",
    ended: "This session has ended. Open its summary or start another.",
    provider_busy:
      "The AI provider is busy or has reached a limit. Please try later.",
    timeout: "The tutor took too long to respond. Your draft is still here.",
    unavailable:
      "Saved AI practice is unavailable. Check the schema and provider configuration.",
    provider_failed:
      "A valid tutor reply could not be completed. Please retry later.",
    disabled:
      "Live AI has been disabled. You can still read saved transcripts.",
    not_found: "This conversation is unavailable.",
    invalid: "Please check your input (maximum 1,200 characters).",
    origin: "This request could not be verified. Reload the page.",
    network: "Connection failed. Your draft has been kept.",
  },
};
const ja = {
  title: "一言ずつ、自信につながる会話を。",
  intro: "日常や仕事の場面で使う日本語を、自分のペースで練習しましょう。",
  eyebrow: "NIHONPATH / 会話練習",
  textMode: "テキスト会話",
  demo: "台本付きデモ・ライブAIではありません",
  demoNote:
    "応答は用意されたサンプルです。会話全体への適応や自由入力の評価は行いません。デモの記録は画面内だけに保持され、再読み込みで消えます。",
  live: "ライブAI・非公開の学習記録",
  liveNote:
    "返信と会話の文脈をOpenAIに送信します。記録とフィードバックはアカウントに非公開で保存されます。個人番号や機密情報は入力しないでください。AIの解説には誤りがあり、能力の測定結果ではありません。",
  signIn: "ライブ会話が有効な場合は、ログインして利用できます。",
  disabled: "現在ライブAIは無効です。下の台本付きデモをお試しください。",
  scenarios: "会話の場面を選ぶ",
  suggested: "おすすめレベル",
  startPractice: "練習する",
  configure: "練習を設定する",
  level: "JLPTレベル",
  scenario: "場面",
  correctionMode: "添削のタイミング",
  each: "返信ごと",
  end: "終了時",
  furigana: "確認済みのふりがなを表示",
  translation: "英訳を表示",
  readingNote:
    "ふりがなは確認済みの文章だけに表示します。AIの返信に自動生成の読み方は付けません。",
  target: "目標の往復数",
  turns: "往復",
  start: "会話を始める",
  saveSettings: "設定を保存",
  saved: "設定を保存しました。",
  settingsNote:
    "開始後のレベル・場面・目標は固定です。変更するには新しい会話を始めてください。",
  history: "会話の記録",
  emptyHistory: "保存された会話はまだありません。",
  resume: "記録を開く",
  delete: "記録を削除",
  deleteConfirm: "この会話とフィードバックを削除しますか。元に戻せません。",
  localDelete: "デモを消去",
  conversation: "会話",
  you: "あなた",
  tutor: "チューター",
  reply: "日本語の返信",
  placeholder: "日本語で一文書いてみましょう。",
  send: "返信する",
  sending: "考えています…",
  endSession: "練習を終了",
  endConfirm: "練習を終了して、まとめを表示しますか。",
  newSession: "新しい会話を始める",
  viewCorrections: "添削を見る",
  reviewVocabulary: "語彙を復習",
  summary: "今回の練習のまとめ",
  completed: "完了した往復数",
  finished: "練習が終了しました",
  progress: "会話の進み具合",
  corrections: "日本語のフィードバック",
  deferred: "添削は練習の終了後に表示します。",
  original: "あなたの文",
  correction: "修正案",
  natural: "より自然な表現",
  polite: "場面に合う丁寧な表現",
  grammar: "文法パターン",
  example: "例文",
  vocabulary: "復習する語彙",
  expressions: "役立つ表現",
  recommended: "おすすめの学習",
  reviewItems: "見直すポイント",
  noItems: "修正の記録はありません。日本語能力の測定結果ではありません。",
  aiEstimate:
    "AIによる学習の参考情報です。公式JLPTの得点や検証済みの能力測定ではありません。",
  demoEstimate: "サンプルの解説であり、あなたの日本語の評価ではありません。",
  noVoice:
    "現在はテキスト練習のみです。音声や発音の評価は今後の予定で、録音は行いません。",
  examples: "サンプル文を試す",
  usage: "今日のAI利用（UTC）",
  requests: "回 / 30回",
  tokens: "トークン",
  cost: "推定米ドル",
  costUnknown: "金額の推定は未設定です。トークン数を表示します。",
  usageUnknown:
    "失敗・処理中のリクエストには未報告の利用量がある場合があります。合計は下限値です。請求はプロバイダーで確認してください。",
  historyError:
    "保存記録を読み込めません。AIのマイグレーションとログイン状態を確認してください。",
  loading: "読み込み中…",
  retryNote:
    "入力した文は保持されています。準備ができたら再試行してください。自動で有料リクエストを繰り返しません。",
  categories: {
    correct: "自然で正しい表現",
    grammar: "文法の修正",
    wording: "より自然な言い方",
    register: "丁寧さの改善・文法の誤りではありません",
    non_japanese: "日本語入力のヒント",
    unassessed: "未評価",
  },
  errors: {
    sign_in: "もう一度ログインしてください。",
    quota:
      "利用回数の上限です。しばらく待ってください。日次上限はUTC午前0時にリセットされます。",
    pending:
      "返信を処理中、または試行済みです。記録を開き直して確認してください。",
    ended:
      "この会話は終了しています。まとめを見るか、新しい会話を始めてください。",
    provider_busy:
      "AIが混み合っているか、利用上限に達しています。しばらくお待ちください。",
    timeout: "応答がタイムアウトしました。入力した文は保持されています。",
    unavailable:
      "保存付きAI練習を利用できません。スキーマとプロバイダー設定を確認してください。",
    provider_failed:
      "有効な応答を完了できませんでした。後で再試行してください。",
    disabled: "ライブAIは無効です。保存済みの会話は閲覧できます。",
    not_found: "この会話は利用できません。",
    invalid: "入力を確認してください（最大1,200文字）。",
    origin: "リクエストを確認できません。再読み込みしてください。",
    network: "接続できません。入力した文は保持されています。",
  },
};
for (const [locale, messages] of Object.entries({ en, ja })) {
  const path = `messages/${locale}.json`;
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  data.Ai = messages;
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
