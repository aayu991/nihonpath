import fs from "node:fs";
const en = {
  selectSubject: "Select a subject",
  subjects: {
    vocabulary: "Vocabulary",
    kanji: "Kanji",
    grammar: "Grammar",
    reading: "Reading",
    listening: "Listening",
  },
  lessonCount: "{count} published lessons",
  demoCount: "{count} bundled demonstration lessons · not a database count",
  progress: "{completed} of {total} lessons completed",
  noLessons: "No published lessons for this subject yet.",
  noAudio: "Listening is unavailable until verified, playable audio is added.",
  openLesson: "Study lesson",
  completed: "Completed",
  guestLesson: "Demo lesson · session only",
  ready: "Ready to study",
  allCourses: "All courses",
  backCourse: "Back to course",
  demoNotice:
    "Bundled demonstration mode. The learning database is unavailable. You can practice here, but progress will not be saved.",
  databaseError:
    "Learning data is unavailable. Apply the documented migrations and try again. No progress has been fabricated.",
  dashboard: "My dashboard",
  enroll: "Enroll in this course",
  enrolled: "Enrolled",
  saving: "Saving…",
  saveError:
    "Could not save. Please try again; your work has not been marked as saved.",
  flashcards: "Vocabulary flashcards",
  hideFurigana: "Hide furigana",
  showFurigana: "Show furigana",
  hideTranslation: "Hide English",
  showTranslation: "Show English",
  lessonNavigation: "Lesson navigation",
  previousLesson: "Previous lesson",
  nextLesson: "Next lesson",
  practiceFlashcards: "Practice flashcards",
  takeQuiz: "Take a practice quiz",
  completeLesson: "Mark as completed",
  completedHere: "Completed in this view",
  guestCompletion:
    "Guest practice lasts for this session only. Sign in to save learning progress.",
  signInSave: "Sign in to save progress",
  timer: "Use an optional practice timer (no time limit)",
  elapsed: "Elapsed",
  questionNavigation: "Questions and answer status",
  answered: "answered",
  unanswered: "unanswered",
  scheduleRule:
    "Simple review schedule: Known → 1, 2, 4, 8, 16, then 30 days; Again → tomorrow and resets the streak. This is a prototype, not an advanced memory model.",
  signedInReviews:
    "Signed-in reviews are saved after a successful server response.",
  noDue:
    "No scheduled cards are due yet. Study a vocabulary deck to begin your review schedule.",
  noCards: "No published flashcards are available for this level.",
  quizSaved:
    "Submitted results are scored on the server and saved to your account.",
  history: "Previous attempts",
  noAttempts:
    "No quiz attempts yet. Complete a practice quiz to see your scores.",
  yourLearning: "Your learning journey",
  continueLearning: "Continue learning",
  chooseCourse: "Choose a course",
  enrolledCourses: "Enrolled courses",
  noEnrollments: "No enrollments yet. Open a course and select Enroll.",
  reviewQueue: "Review queue",
  dueCount: "{count} cards due",
  subjectAccuracy: "Quiz accuracy by subject",
  learningStudio: "Learning content studio",
  editorHelp:
    "Author a structured JSON draft. Use the course reference IDs below. Preview and review the Japanese, readings, translations and answer key before approval. Structural checks do not replace educator review. Used decks and banks need a new revision to preserve learner history.",
  document: "Learning document (JSON)",
  state: "Review state",
  published: "Published",
  unpublished: "Unpublished",
  saveDraft: "Save draft",
  newRevision: "Save as new revision",
  preview: "Preview draft",
  invalidContent: "Please fix: ",
  reviewError:
    "Review failed. Reload the latest version, check the parent publication and validate the Japanese content.",
  saveBeforeReview: "Save your edits before reviewing or publishing.",
  request_review: "Request review",
  approve: "Approve reviewed content",
  publish: "Publish",
  unpublish: "Unpublish",
  correctOption: "Correct option (admin preview only)",
  accessDenied: "Administrator access required.",
  courseReferences: "Course reference IDs",
  createNew: "Create a new draft",
  grammarDemo: "Demonstration grammar practice",
  returnLesson: "Return to lessons",
};
const ja = {
  ...en,
  selectSubject: "科目を選ぶ",
  subjects: {
    vocabulary: "語彙",
    kanji: "漢字",
    grammar: "文法",
    reading: "読解",
    listening: "聴解",
  },
  lessonCount: "公開レッスン：{count}件",
  demoCount: "デモレッスン：{count}件（データベースの件数ではありません）",
  progress: "{total}レッスン中{completed}完了",
  noLessons: "この科目の公開レッスンはまだありません。",
  noAudio: "再生可能な音声を確認できるまで、聴解は利用できません。",
  openLesson: "学習する",
  completed: "完了",
  guestLesson: "デモレッスン・今回のみ",
  ready: "学習できます",
  allCourses: "すべてのコース",
  backCourse: "コースへ戻る",
  demoNotice:
    "デモモードです。学習データベースを利用できないため、練習はできますが進捗は保存されません。",
  databaseError:
    "学習データを読み込めません。移行手順を確認し、もう一度お試しください。架空の進捗は表示しません。",
  dashboard: "マイダッシュボード",
  enroll: "このコースに登録",
  enrolled: "登録済み",
  saving: "保存中…",
  saveError:
    "保存できませんでした。保存済みにはなっていません。もう一度お試しください。",
  flashcards: "語彙の単語カード",
  hideFurigana: "ふりがなを隠す",
  showFurigana: "ふりがなを表示",
  hideTranslation: "英訳を隠す",
  showTranslation: "英訳を表示",
  lessonNavigation: "レッスンの移動",
  previousLesson: "前のレッスン",
  nextLesson: "次のレッスン",
  practiceFlashcards: "単語カードで練習",
  takeQuiz: "練習クイズに挑戦",
  completeLesson: "完了として記録",
  completedHere: "この画面で完了",
  guestCompletion:
    "ゲストの練習は今回のみ有効です。進捗を保存するにはログインしてください。",
  signInSave: "ログインして進捗を保存",
  timer: "練習タイマーを使う（時間制限なし）",
  elapsed: "経過時間",
  questionNavigation: "問題と解答状況",
  answered: "解答済み",
  unanswered: "未解答",
  scheduleRule:
    "簡易復習予定：「覚えた」は1・2・4・8・16・30日後。「もう一度」は翌日に戻ります。高度な記憶モデルではなく試作方式です。",
  signedInReviews:
    "ログイン中の復習は、サーバーでの保存が成功してから記録されます。",
  noDue: "復習予定の単語はまだありません。単語カードで練習を始めましょう。",
  noCards: "このレベルの公開単語カードはまだありません。",
  quizSaved: "解答後にサーバーで採点し、アカウントに結果を保存します。",
  history: "過去の受験履歴",
  noAttempts:
    "まだ練習結果がありません。クイズに挑戦してスコアを記録しましょう。",
  yourLearning: "あなたの学習",
  continueLearning: "学習を続ける",
  chooseCourse: "コースを選ぶ",
  enrolledCourses: "登録コース",
  noEnrollments: "登録コースはまだありません。コース画面から登録できます。",
  reviewQueue: "復習リスト",
  dueCount: "復習する単語：{count}件",
  subjectAccuracy: "科目別のクイズ正答率",
  learningStudio: "学習コンテンツ管理",
  document: "学習コンテンツ（JSON）",
  state: "レビュー状況",
  published: "公開中",
  unpublished: "未公開",
  saveDraft: "下書きを保存",
  newRevision: "新しい版として保存",
  preview: "下書きをプレビュー",
  invalidContent: "修正してください：",
  reviewError:
    "レビューできませんでした。最新版、親コンテンツの公開状態、日本語の内容を確認してください。",
  saveBeforeReview: "レビューや公開の前に変更を保存してください。",
  request_review: "レビューを依頼",
  approve: "確認した内容を承認",
  publish: "公開",
  unpublish: "公開を停止",
  correctOption: "正しい選択肢（管理者専用プレビュー）",
  accessDenied: "管理者権限が必要です。",
  courseReferences: "コースの参照ID",
  createNew: "新しい下書きを作成",
  grammarDemo: "文法のデモ練習",
  returnLesson: "レッスンへ戻る",
  editorHelp:
    "JSON形式で下書きを作成します。下のコースIDを使ってください。日本語、読み、訳、正答をプレビューで確認してから承認してください。自動検証は教育者による確認の代わりにはなりません。学習履歴のある単語集や問題集は、新しい版として保存します。",
};
for (const [locale, copy] of Object.entries({ en, ja })) {
  const p = `messages/${locale}.json`;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.Learning = copy;
  data.Study.checking = locale === "en" ? "Checking answers…" : "採点中…";
  data.Study.shuffle = locale === "en" ? "Shuffle cards" : "カードをシャッフル";
  data.Study.quizIntro =
    locale === "en"
      ? "One answer per question. No time limit. You can revisit your answers before submitting."
      : "各問題の答えは一つです。時間制限はありません。送信前に解答を見直せます。";
  data.Study.questions = locale === "en" ? "questions" : "問";
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}
