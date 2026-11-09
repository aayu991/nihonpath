import fs from "node:fs";
const en = {
  help: "Help and support",
  intro:
    "Find practical help for your account, Japanese learning and Japan preparation. Some services require additional configuration.",
  contact: "Contact support",
  faq: "Frequently asked questions",
  categories: [
    "Account access",
    "Courses and lessons",
    "Examinations",
    "AI conversation",
    "Subscriptions and payments",
    "Tutor bookings",
    "Institutes and employers",
  ],
  answers: [
    "Use password reset from the login page. Email confirmation and recovery depend on the configured authentication email service. Never share your password or verification code with support.",
    "Published courses contain the available lessons. Demonstrations and unfinished features are labeled. Save progress by signing in; draft or restricted content is not publicly available.",
    "Reviewed practice is graded by the server. Full mocks and listening sections may remain unavailable. Report a question using its page and general issue, without copying private examination answers.",
    "Live AI needs an enabled provider and usage allowance. Demonstration conversations are labeled. Do not submit private workplace, medical, financial or immigration documents.",
    "Live payments are disabled. Test checkout appears only for configured test providers and prices. Stripe subscriptions renew automatically; Nepal wallet passes require manual renewal. A return page alone does not confirm payment.",
    "Only approved published tutors can offer available lessons. Current bookings are free. Check your lesson workspace for status and private meeting links; cancellation and completion rules apply.",
    "Organization access requires an actual membership and authorized role. Selecting an onboarding goal never grants administrator access. Contact the organization owner for invitations and assignments.",
  ],
  signIn: "Log in to submit a private support request",
  category: "Topic",
  subject: "Subject",
  message: "Message",
  warning:
    "Do not include passwords, payment credentials, identification documents, medical details or private conversation transcripts.",
  consent:
    "I understand this request is stored privately for authorized support review.",
  submit: "Submit request",
  busy: "Saving…",
  saved: "Your request was saved for review. No email delivery is promised.",
  unavailable:
    "This service is unavailable until its database migration and configuration are ready.",
  invalid: "Check the fields and try again.",
  limit: "The request limit has been reached. Try again later.",
  history: "Your support requests",
  status: "Status",
  open: "Open",
  in_review: "Under review",
  resolved: "Resolved",
  admin: "Operations and support",
  forbidden: "You do not have permission to view this area.",
  save: "Save",
  preferences: "Email preferences",
  learning: "Optional learning updates",
  renewal: "Optional renewal reminders",
  essential:
    "Security and essential booking/payment notifications are separate from optional learning updates. Delivery remains disabled until a provider is approved.",
  analytics: "Privacy choices",
  analyticsBody:
    "Optional first-party analytics records aggregate event counts and performance buckets. No account identifiers, transcripts, payment details, IP addresses or page query strings are sent by this collector.",
  allow: "Allow optional analytics",
  decline: "Decline optional analytics",
  enabled: "Optional analytics allowed on this browser.",
  disabled: "Optional analytics disabled on this browser.",
  privacy: "Privacy policy draft",
  terms: "Terms of service draft",
  refund: "Refund policy draft",
  cancellation: "Cancellation policy draft",
  subscription: "Subscription terms draft",
  providers: "Payment provider information",
  commercial: "Commercial disclosure draft",
  draft:
    "DRAFT — pending owner and qualified legal review. This text has not been approved for a public commercial launch.",
  legalIntro:
    "NihonPath is an independent Japanese learning and Japan preparation platform for a worldwide community. It does not claim affiliation with examination authorities or provide immigration eligibility decisions.",
  legalPrivacy:
    "Account identifiers, learning progress, organization memberships, tutoring records, payment verification records and support requests are processed for their stated functions. Private transcripts and payment secrets are excluded from analytics. Optional browser analytics requires consent; essential aggregate operational counts are separate. Retention, data-request handling, processor agreements and international transfers require owner review before launch.",
  legalTerms:
    "Use only accounts and content you are authorized to access. Course completion is not an official examination certificate or a promise of employment, visa approval or professional qualification. Features under development remain labeled. The operating entity, governing terms, age rules, support contact and dispute process must be supplied and approved before commercial use.",
  legalRefund:
    "No real charges are enabled. In test mode, verified full or partial refunds and disputes revoke access from the affected order; other valid purchases retain their own periods. Production eligibility, deadlines, statutory rights, fees and provider-specific refund procedures require review and publication before real purchases.",
  legalCancellation:
    "Stripe test cancellation stops future renewal at the configured period end. Nepal wallet passes expire without automatic renewal. Tutor cancellation follows the booking workflow. Cancellation is distinct from refund eligibility; no live cancellation fee or refund promise is established here.",
  legalSubscription:
    "Monthly and annual Stripe plans renew automatically where configured. One-time 30-day and 365-day wallet passes renew manually. Access requires backend payment verification and ends according to the paid period. Failed payments do not extend access. Actual recurring prices, taxes, notices, renewal consent and mandatory consumer rights require approval.",
  legalProviders:
    "Stripe, eSewa and Khalti integration code is restricted to test environments. Unconfigured methods are hidden. NihonPath does not collect card or wallet passwords. Provider onboarding, settlement eligibility, commercial terms, tax invoices and privacy agreements remain prerequisites to a live service.",
  legalCommercial:
    "No operating company name, registration number, business address, tax identifier, commercial telephone number or authorized representative has been supplied. These details must be verified and published where applicable before any public commercial launch.",
  policyLinks: "Review documents",
  analyticsReport: "Aggregate analytics",
  monitoring: "Operations in the last 24 hours",
  emails: "Email queue",
  vitals: "Performance buckets",
  noData: "No recorded data. This is not a simulated metric.",
  source: "Source",
  event: "Event",
  count: "Count",
  review: "Review status",
  home: "Home",
};
const ja = {
  help: "ヘルプとサポート",
  intro:
    "アカウント、日本語学習、渡航準備のヘルプ。一部のサービスには追加設定が必要です。",
  contact: "サポートに問い合わせ",
  faq: "よくある質問",
  categories: [
    "アカウント",
    "コースと授業",
    "試験",
    "AI会話",
    "契約と決済",
    "講師の予約",
    "学校・企業",
  ],
  answers: [
    "ログイン画面からパスワードを再設定できます。確認・復旧メールにはメール配信設定が必要です。パスワードや確認コードをサポートへ送らないでください。",
    "公開コースで利用可能な授業を確認できます。デモや開発中の機能は表示で区別しています。進捗保存にはログインが必要です。",
    "確認済みの練習問題をサーバーで採点します。総合模試や聴解は未公開の場合があります。問題のページと一般的な不具合を報告してください。",
    "ライブAIには配信設定と利用枠が必要です。デモ会話は区別されます。職場・医療・金融・在留手続きの私的資料を送信しないでください。",
    "本番決済は無効です。設定済みのテスト方法のみ表示します。Stripeは自動更新、ウォレットパスは手動更新です。戻り画面だけでは決済確認になりません。",
    "承認・公開済みの講師のみ予約枠を提供できます。現在の予約は無料です。予約状況と非公開リンクは授業画面で確認してください。",
    "組織アクセスには正式なメンバー資格と権限が必要です。学習目標の選択だけでは管理者になれません。招待や課題について組織の所有者に確認してください。",
  ],
  signIn: "ログインして非公開の問い合わせを送信",
  category: "項目",
  subject: "件名",
  message: "内容",
  warning:
    "パスワード、決済認証情報、身分証明書、医療情報、私的な会話は含めないでください。",
  consent:
    "権限のあるサポート担当者による確認のため、この内容が非公開で保存されることを理解します。",
  submit: "問い合わせを送信",
  busy: "保存中…",
  saved: "確認用に保存しました。メール送信は保証されません。",
  unavailable: "データベースと設定が完了するまで利用できません。",
  invalid: "入力内容を確認してください。",
  limit: "送信回数の上限です。後で再度お試しください。",
  history: "問い合わせ履歴",
  status: "状況",
  open: "未対応",
  in_review: "確認中",
  resolved: "対応済み",
  admin: "運用とサポート",
  forbidden: "この画面を表示する権限がありません。",
  save: "保存",
  preferences: "メール設定",
  learning: "任意の学習通知",
  renewal: "任意の更新通知",
  essential:
    "セキュリティと予約・決済の重要通知は任意通知と別です。承認済みの配信設定が完了するまでメールは送信されません。",
  analytics: "プライバシー設定",
  analyticsBody:
    "任意の自社解析は集計件数と性能区分のみを記録します。アカウントID、会話、決済情報、IPアドレス、URLのクエリは送信しません。",
  allow: "任意の解析を許可",
  decline: "任意の解析を拒否",
  enabled: "このブラウザーで任意の解析を許可しました。",
  disabled: "このブラウザーで任意の解析を無効にしました。",
  privacy: "プライバシー方針案",
  terms: "利用規約案",
  refund: "返金方針案",
  cancellation: "解約方針案",
  subscription: "サブスクリプション規約案",
  providers: "決済サービスの情報",
  commercial: "商業情報の開示案",
  draft:
    "草案 — 所有者と専門家の確認待ちです。商用公開用に承認されていません。",
  legalIntro:
    "NihonPathは世界の学習者向けの独立した日本語学習・渡航準備サービスです。試験機関との提携や在留資格の適格性判断は提供しません。",
  legalPrivacy:
    "アカウント、学習進捗、組織、授業予約、決済確認、問い合わせの情報を各機能に使用します。私的な会話や決済秘密情報は解析に含めません。任意のブラウザー解析は同意が必要で、運用上の集計とは別です。保存期間、情報請求、委託先契約、国際移転は公開前に確認が必要です。",
  legalTerms:
    "権限のあるアカウントと教材のみ利用してください。修了は公的試験資格、就職、査証承認の保証ではありません。開発中の機能は明示します。運営主体、準拠条件、年齢条件、連絡先、紛争手続きは商用公開前に承認が必要です。",
  legalRefund:
    "実際の課金は無効です。テスト環境の返金・一部返金・異議申立ては対象注文のアクセスを停止します。他の有効な購入期間は維持されます。本番の返金条件、期限、法定権利、手数料、手続きは事前確認が必要です。",
  legalCancellation:
    "Stripeのテスト解約は次回更新を停止します。ウォレットパスは自動更新しません。講師予約は予約手順に従います。解約と返金は別であり、本番の手数料や返金を約束するものではありません。",
  legalSubscription:
    "設定済みのStripe月額・年額は自動更新です。30日・365日のウォレットパスは手動更新です。アクセスにはサーバー確認が必要で、未払いは期間を延長しません。価格、税、通知、更新同意、消費者の権利は確認が必要です。",
  legalProviders:
    "Stripe、eSewa、Khaltiはテスト環境のみです。未設定の方法は表示しません。カードやウォレットのパスワードを収集しません。加盟店審査、精算条件、税務書類、プライバシー契約は本番の前提です。",
  legalCommercial:
    "運営会社名、登録番号、住所、税番号、連絡先、代表者は未提供です。適用される公開義務に従い、商用公開前に確認・掲載が必要です。",
  policyLinks: "確認用文書",
  analyticsReport: "集計解析",
  monitoring: "過去24時間の運用",
  emails: "メール待ち行列",
  vitals: "性能区分",
  noData: "記録はありません。架空の数値は表示しません。",
  source: "記録元",
  event: "項目",
  count: "件数",
  review: "状況を確認",
  home: "ホーム",
};
const ne = {
  help: "मद्दत र सहयोग",
  intro:
    "खाता, जापानी अध्ययन र जापान तयारीको सहयोग। केही सेवाका लागि थप सेटअप आवश्यक छ।",
  contact: "सहयोगमा सम्पर्क",
  faq: "बारम्बार सोधिने प्रश्न",
  categories: [
    "खाता पहुँच",
    "पाठ्यक्रम र पाठ",
    "परीक्षा",
    "AI कुराकानी",
    "सदस्यता र भुक्तानी",
    "शिक्षक बुकिङ",
    "संस्था र रोजगारदाता",
  ],
  answers: [
    "लग इन पृष्ठबाट पासवर्ड पुनः सेट गर्नुहोस्। इमेल पुष्टि र पुनःप्राप्तिका लागि इमेल सेवा सेटअप चाहिन्छ। पासवर्ड वा पुष्टि कोड नपठाउनुहोस्।",
    "प्रकाशित पाठ्यक्रममा उपलब्ध पाठ देखिन्छन्। नमुना र अधूरा सुविधा छुट्टै चिनिन्छन्। प्रगति बचत गर्न लग इन गर्नुहोस्।",
    "समीक्षा भएका अभ्यास सर्भरले जाँच्छ। पूर्ण परीक्षा र सुनाइ अभ्यास उपलब्ध नहुन सक्छन्। प्रश्नको पृष्ठ र समस्याको सामान्य विवरण दिनुहोस्।",
    "प्रत्यक्ष AI का लागि सक्रिय सेवा र उपयोग सीमा चाहिन्छ। नमुना कुराकानी चिनाइएको हुन्छ। निजी रोजगार, स्वास्थ्य, वित्त वा अध्यागमन कागजात नपठाउनुहोस्।",
    "वास्तविक भुक्तानी बन्द छ। सेटअप भएका परीक्षण विधि मात्र देखिन्छन्। Stripe स्वतः नवीकरण हुन्छ, वालेट पास आफैँ नवीकरण गर्नुपर्छ। फर्किएको पृष्ठ मात्रै भुक्तानी प्रमाण होइन।",
    "स्वीकृत र प्रकाशित शिक्षकले मात्र समय दिन सक्छन्। हालको बुकिङ निःशुल्क छ। स्थिति र निजी बैठक लिङ्क आफ्नो पाठ क्षेत्रमा हेर्नुहोस्।",
    "संस्थाको पहुँचका लागि वास्तविक सदस्यता र भूमिका चाहिन्छ। लक्ष्य छान्दैमा प्रशासक अधिकार पाइँदैन। निमन्त्रणा र कार्यका लागि संस्था मालिकसँग सम्पर्क गर्नुहोस्।",
  ],
  signIn: "निजी सहयोग अनुरोधका लागि लग इन गर्नुहोस्",
  category: "विषय",
  subject: "शीर्षक",
  message: "सन्देश",
  warning:
    "पासवर्ड, भुक्तानी गोप्य विवरण, परिचयपत्र, स्वास्थ्य विवरण वा निजी कुराकानी नलेख्नुहोस्।",
  consent:
    "अधिकृत सहयोग समीक्षाका लागि यो अनुरोध निजी रूपमा सुरक्षित हुने बुझ्छु।",
  submit: "अनुरोध पठाउनुहोस्",
  busy: "सुरक्षित हुँदै…",
  saved: "अनुरोध समीक्षाका लागि सुरक्षित भयो। इमेल पठाउने वाचा गरिएको छैन।",
  unavailable: "डाटाबेस र सेटअप तयार नभएसम्म सेवा उपलब्ध छैन।",
  invalid: "विवरण जाँचेर फेरि प्रयास गर्नुहोस्।",
  limit: "अनुरोध सीमा पुग्यो। पछि प्रयास गर्नुहोस्।",
  history: "तपाईंका अनुरोध",
  status: "स्थिति",
  open: "खुला",
  in_review: "समीक्षामा",
  resolved: "समाधान",
  admin: "सञ्चालन र सहयोग",
  forbidden: "यस क्षेत्रमा अनुमति छैन।",
  save: "सुरक्षित गर्नुहोस्",
  preferences: "इमेल प्राथमिकता",
  learning: "वैकल्पिक अध्ययन सूचना",
  renewal: "वैकल्पिक नवीकरण सम्झना",
  essential:
    "सुरक्षा र आवश्यक बुकिङ वा भुक्तानी सूचना अलग छन्। स्वीकृत सेवा सेटअप नभएसम्म इमेल बन्द रहन्छ।",
  analytics: "गोपनीयता विकल्प",
  analyticsBody:
    "वैकल्पिक आफ्नै विश्लेषणले जम्मा घटना र प्रदर्शन वर्ग मात्र राख्छ। खाता परिचय, कुराकानी, भुक्तानी, IP वा URL प्रश्न विवरण पठाइँदैन।",
  allow: "वैकल्पिक विश्लेषण अनुमति",
  decline: "वैकल्पिक विश्लेषण अस्वीकार",
  enabled: "यस ब्राउजरमा वैकल्पिक विश्लेषण अनुमति छ।",
  disabled: "यस ब्राउजरमा वैकल्पिक विश्लेषण बन्द छ।",
  privacy: "गोपनीयता नीतिको मस्यौदा",
  terms: "सेवा सर्तको मस्यौदा",
  refund: "रकम फिर्ता नीतिको मस्यौदा",
  cancellation: "रद्द नीतिको मस्यौदा",
  subscription: "सदस्यता सर्तको मस्यौदा",
  providers: "भुक्तानी सेवा विवरण",
  commercial: "व्यावसायिक खुलासाको मस्यौदा",
  draft:
    "मस्यौदा — मालिक र योग्य कानुनी समीक्षाको पर्खाइमा। सार्वजनिक व्यावसायिक प्रयोगका लागि स्वीकृत छैन।",
  legalIntro:
    "NihonPath विश्वभरका लागि स्वतन्त्र जापानी अध्ययन र जापान तयारी मञ्च हो। यसले परीक्षा निकायसँग सम्बन्ध वा अध्यागमन योग्यताको निर्णय दाबी गर्दैन।",
  legalPrivacy:
    "खाता, अध्ययन प्रगति, संस्था सदस्यता, शिक्षक बुकिङ, भुक्तानी प्रमाणीकरण र सहयोग अनुरोध सम्बन्धित कामका लागि प्रयोग हुन्छन्। निजी कुराकानी र भुक्तानी गोप्य विवरण विश्लेषणमा पर्दैनन्। वैकल्पिक ब्राउजर विश्लेषणलाई सहमति चाहिन्छ। राख्ने अवधि, डाटा अनुरोध, सेवा सम्झौता र अन्तरदेशीय हस्तान्तरण सार्वजनिक प्रयोगअघि समीक्षा चाहिन्छ।",
  legalTerms:
    "आफूलाई अनुमति भएका खाता र सामग्री मात्र प्रयोग गर्नुहोस्। पाठ पूरा हुनु आधिकारिक प्रमाणपत्र, जागिर वा भिसाको ग्यारेन्टी होइन। अधूरा सुविधा चिनाइन्छन्। सञ्चालक, उमेरका नियम, सम्पर्क र विवाद प्रक्रिया व्यावसायिक प्रयोगअघि स्वीकृत हुनुपर्छ।",
  legalRefund:
    "वास्तविक शुल्क बन्द छ। परीक्षणमा प्रमाणित पूर्ण वा आंशिक फिर्ता र विवादले सम्बन्धित खरिदको पहुँच रोक्छ। अन्य मान्य खरिदको अवधि यथावत रहन्छ। वास्तविक फिर्ता योग्यता, समय, कानुनी अधिकार, शुल्क र प्रक्रिया समीक्षा चाहिन्छ।",
  legalCancellation:
    "Stripe परीक्षण रद्द गर्दा आगामी नवीकरण रोकिन्छ। वालेट पास स्वतः नवीकरण हुँदैन। शिक्षक बुकिङ आफ्नै प्रक्रियाअनुसार रद्द हुन्छ। रद्द र फिर्ता अलग हुन्; वास्तविक शुल्क वा फिर्ताको वाचा छैन।",
  legalSubscription:
    "सेटअप भएमा Stripe मासिक र वार्षिक योजना स्वतः नवीकरण हुन्छन्। ३० वा ३६५ दिने वालेट पास हातैले नवीकरण गर्नुपर्छ। पहुँच सर्भरले प्रमाणित गर्छ र असफल भुक्तानीले अवधि बढाउँदैन। मूल्य, कर, सूचना र उपभोक्ता अधिकार समीक्षा चाहिन्छ।",
  legalProviders:
    "Stripe, eSewa र Khalti परीक्षणमा मात्र छन्। सेटअप नभएका विधि लुकाइन्छन्। कार्ड वा वालेट पासवर्ड लिइँदैन। व्यापारी स्वीकृति, फर्छ्योट, कर कागजात र गोपनीयता सम्झौता वास्तविक सेवाअघि चाहिन्छ।",
  legalCommercial:
    "सञ्चालक कम्पनी, दर्ता नम्बर, ठेगाना, कर परिचय, फोन र प्रतिनिधि दिइएको छैन। लागू हुने विवरण व्यावसायिक सार्वजनिक प्रयोगअघि प्रमाणित गरी प्रकाशन गर्नुपर्छ।",
  policyLinks: "समीक्षाका कागजात",
  analyticsReport: "समष्टिगत विश्लेषण",
  monitoring: "पछिल्लो २४ घण्टाको सञ्चालन",
  emails: "इमेल पङ्क्ति",
  vitals: "प्रदर्शन वर्ग",
  noData: "कुनै अभिलेख छैन। काल्पनिक आँकडा होइन।",
  source: "स्रोत",
  event: "घटना",
  count: "संख्या",
  review: "स्थिति समीक्षा",
  home: "गृहपृष्ठ",
};
const hi = {
  help: "मदद और सहायता",
  intro:
    "खाते, जापानी अध्ययन और जापान की तैयारी में सहायता। कुछ सेवाओं के लिए अतिरिक्त सेटअप आवश्यक है।",
  contact: "सहायता से संपर्क",
  faq: "अक्सर पूछे जाने वाले प्रश्न",
  categories: [
    "खाते तक पहुँच",
    "पाठ्यक्रम और पाठ",
    "परीक्षा",
    "AI बातचीत",
    "सदस्यता और भुगतान",
    "शिक्षक बुकिंग",
    "संस्थान और नियोक्ता",
  ],
  answers: [
    "लॉग इन पृष्ठ से पासवर्ड रीसेट करें। ईमेल पुष्टि और पुनर्प्राप्ति के लिए ईमेल सेवा का सेटअप चाहिए। पासवर्ड या सत्यापन कोड न भेजें।",
    "प्रकाशित पाठ्यक्रम में उपलब्ध पाठ दिखते हैं। नमूने और अधूरी सुविधाएँ अलग चिन्हित हैं। प्रगति बचाने के लिए लॉग इन करें।",
    "समीक्षित अभ्यास सर्वर पर जाँचे जाते हैं। पूर्ण परीक्षा और श्रवण अभ्यास उपलब्ध न भी हों। प्रश्न का पृष्ठ और सामान्य समस्या बताएँ।",
    "लाइव AI के लिए सक्रिय सेवा और उपयोग सीमा चाहिए। नमूना बातचीत चिन्हित है। निजी रोजगार, स्वास्थ्य, वित्त या आव्रजन दस्तावेज न भेजें।",
    "वास्तविक भुगतान बंद है। केवल कॉन्फ़िगर किए परीक्षण तरीके दिखते हैं। Stripe स्वतः नवीकरण करता है; वॉलेट पास स्वयं नवीकरण करें। लौटने वाला पृष्ठ अकेले भुगतान का प्रमाण नहीं है।",
    "केवल स्वीकृत और प्रकाशित शिक्षक समय दे सकते हैं। वर्तमान बुकिंग निःशुल्क है। स्थिति और निजी बैठक लिंक अपने पाठ क्षेत्र में देखें।",
    "संस्थान की पहुँच के लिए वास्तविक सदस्यता और भूमिका चाहिए। लक्ष्य चुनने से प्रशासक अधिकार नहीं मिलते। निमंत्रण और कार्य के लिए संस्थान मालिक से संपर्क करें।",
  ],
  signIn: "निजी सहायता अनुरोध के लिए लॉग इन करें",
  category: "विषय",
  subject: "शीर्षक",
  message: "संदेश",
  warning:
    "पासवर्ड, भुगतान गोपनीय विवरण, पहचान पत्र, स्वास्थ्य विवरण या निजी बातचीत न लिखें।",
  consent:
    "मैं समझता हूँ कि अधिकृत सहायता समीक्षा के लिए यह अनुरोध निजी रूप से रखा जाएगा।",
  submit: "अनुरोध भेजें",
  busy: "सहेजा जा रहा है…",
  saved: "अनुरोध समीक्षा के लिए सहेजा गया। ईमेल भेजने का वादा नहीं है।",
  unavailable: "डेटाबेस और सेटअप तैयार होने तक सेवा उपलब्ध नहीं है।",
  invalid: "विवरण जाँचकर फिर प्रयास करें।",
  limit: "अनुरोध सीमा पूरी हुई। बाद में प्रयास करें।",
  history: "आपके अनुरोध",
  status: "स्थिति",
  open: "खुला",
  in_review: "समीक्षा में",
  resolved: "हल किया गया",
  admin: "संचालन और सहायता",
  forbidden: "इस क्षेत्र की अनुमति नहीं है।",
  save: "सहेजें",
  preferences: "ईमेल प्राथमिकताएँ",
  learning: "वैकल्पिक अध्ययन सूचनाएँ",
  renewal: "वैकल्पिक नवीकरण अनुस्मारक",
  essential:
    "सुरक्षा और आवश्यक बुकिंग या भुगतान सूचनाएँ अलग हैं। स्वीकृत सेवा के सेटअप तक ईमेल बंद रहेगा।",
  analytics: "गोपनीयता विकल्प",
  analyticsBody:
    "वैकल्पिक प्रथम-पक्ष विश्लेषण केवल कुल घटनाएँ और प्रदर्शन वर्ग रखता है। खाता पहचान, बातचीत, भुगतान, IP या URL क्वेरी नहीं भेजी जाती।",
  allow: "वैकल्पिक विश्लेषण की अनुमति",
  decline: "वैकल्पिक विश्लेषण अस्वीकार",
  enabled: "इस ब्राउज़र में वैकल्पिक विश्लेषण की अनुमति है।",
  disabled: "इस ब्राउज़र में वैकल्पिक विश्लेषण बंद है।",
  privacy: "गोपनीयता नीति का मसौदा",
  terms: "सेवा शर्तों का मसौदा",
  refund: "वापसी नीति का मसौदा",
  cancellation: "रद्द नीति का मसौदा",
  subscription: "सदस्यता शर्तों का मसौदा",
  providers: "भुगतान प्रदाता जानकारी",
  commercial: "व्यावसायिक प्रकटीकरण का मसौदा",
  draft:
    "मसौदा — मालिक और योग्य कानूनी समीक्षा की प्रतीक्षा। सार्वजनिक व्यावसायिक उपयोग के लिए स्वीकृत नहीं।",
  legalIntro:
    "NihonPath विश्वव्यापी समुदाय के लिए स्वतंत्र जापानी अध्ययन और जापान तैयारी मंच है। यह परीक्षा संस्थानों से संबद्धता या आव्रजन पात्रता का निर्णय नहीं देता।",
  legalPrivacy:
    "खाता, अध्ययन प्रगति, संस्थान सदस्यता, शिक्षक बुकिंग, भुगतान सत्यापन और सहायता अनुरोध संबंधित कार्यों के लिए उपयोग होते हैं। निजी बातचीत और भुगतान रहस्य विश्लेषण में नहीं जाते। वैकल्पिक ब्राउज़र विश्लेषण को सहमति चाहिए। संग्रह अवधि, डेटा अनुरोध, सेवा समझौते और अंतरराष्ट्रीय हस्तांतरण की समीक्षा आवश्यक है।",
  legalTerms:
    "केवल अधिकृत खाते और सामग्री उपयोग करें। पाठ पूरा करना आधिकारिक प्रमाणपत्र, नौकरी या वीज़ा की गारंटी नहीं है। अधूरी सुविधाएँ चिन्हित हैं। संचालक, आयु नियम, संपर्क और विवाद प्रक्रिया व्यावसायिक उपयोग से पहले स्वीकृत होनी चाहिए।",
  legalRefund:
    "वास्तविक शुल्क बंद है। परीक्षण में सत्यापित पूर्ण या आंशिक वापसी और विवाद संबंधित खरीद की पहुँच रोकते हैं। अन्य वैध खरीद की अवधि बनी रहती है। वास्तविक वापसी पात्रता, समय, कानूनी अधिकार, शुल्क और प्रक्रिया की समीक्षा आवश्यक है।",
  legalCancellation:
    "Stripe परीक्षण रद्द करने से आगामी नवीकरण रुकता है। वॉलेट पास स्वतः नवीकरण नहीं करते। शिक्षक बुकिंग की अपनी प्रक्रिया है। रद्द करना और वापसी अलग हैं; वास्तविक शुल्क या वापसी का वादा नहीं है।",
  legalSubscription:
    "सेटअप होने पर Stripe मासिक और वार्षिक योजना स्वतः नवीकरण करती हैं। ३० या ३६५ दिन के वॉलेट पास स्वयं नवीकरण करें। पहुँच सर्वर से सत्यापित होती है और असफल भुगतान अवधि नहीं बढ़ाता। मूल्य, कर, सूचना और उपभोक्ता अधिकार की समीक्षा आवश्यक है।",
  legalProviders:
    "Stripe, eSewa और Khalti केवल परीक्षण में हैं। बिना सेटअप के तरीके नहीं दिखते। कार्ड या वॉलेट पासवर्ड नहीं लिया जाता। व्यापारी अनुमोदन, निपटान, कर दस्तावेज और गोपनीयता समझौते वास्तविक सेवा से पहले आवश्यक हैं।",
  legalCommercial:
    "संचालक कंपनी, पंजीकरण संख्या, पता, कर पहचान, फोन और प्रतिनिधि नहीं दिए गए हैं। लागू विवरण व्यावसायिक सार्वजनिक उपयोग से पहले सत्यापित और प्रकाशित होने चाहिए।",
  policyLinks: "समीक्षा दस्तावेज",
  analyticsReport: "समेकित विश्लेषण",
  monitoring: "पिछले २४ घंटे का संचालन",
  emails: "ईमेल कतार",
  vitals: "प्रदर्शन वर्ग",
  noData: "कोई रिकॉर्ड नहीं। काल्पनिक आँकड़ा नहीं है।",
  source: "स्रोत",
  event: "घटना",
  count: "संख्या",
  review: "स्थिति समीक्षा",
  home: "मुखपृष्ठ",
};
for (const [locale, Launch] of Object.entries({ en, ja, ne, hi })) {
  const p = `messages/${locale}.json`,
    m = JSON.parse(fs.readFileSync(p, "utf8"));
  m.Launch = Launch;
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
}
