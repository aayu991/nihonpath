import fs from "node:fs";
const entries = `
organizationIntro|Bring classes, attendance and assigned learning together in one secure workspace. Give each team the access it needs, with learner-controlled progress sharing.|クラス、出欠、学習課題を安全なワークスペースで管理。役割に応じたアクセスと、学習者が選べる進捗共有を提供します。|कक्षा, उपस्थिति र तोकिएको अध्ययन एउटै सुरक्षित कार्यक्षेत्रमा व्यवस्थापन गर्नुहोस्। भूमिकाअनुसार पहुँच र विद्यार्थीले रोज्ने प्रगति साझेदारी।|कक्षा, उपस्थिति और सौंपे गए अध्ययन को एक सुरक्षित कार्यक्षेत्र में जोड़ें। भूमिका के अनुसार पहुँच और विद्यार्थी-नियंत्रित प्रगति साझाकरण।
instituteDescription|Organize classes, support teachers and follow each learner’s assigned-course progress.|クラスを編成し、講師を支援し、割り当てコースの進捗を確認します。|कक्षा मिलाउनुहोस्, शिक्षकलाई सहयोग गर्नुहोस् र तोकिएको पाठ्यक्रमको प्रगति हेर्नुहोस्।|कक्षाएँ व्यवस्थित करें, शिक्षकों को सहयोग दें और सौंपे गए पाठ्यक्रम की प्रगति देखें।
ssw_centerDescription|Coordinate workplace language preparation, industry courses and training attendance.|職場の日本語、分野別コース、研修の出欠をまとめて管理します。|कार्यस्थल भाषा, क्षेत्रीय पाठ्यक्रम र तालिम उपस्थिति समन्वय गर्नुहोस्।|कार्यस्थल भाषा, क्षेत्रीय पाठ्यक्रम और प्रशिक्षण उपस्थिति समन्वित करें।
employerDescription|Assign employee training and review shared learning and safety-course completion.|従業員研修を割り当て、共有された進捗や安全教育の完了状況を確認します。|कर्मचारी तालिम तोक्नुहोस् र साझा अध्ययन तथा सुरक्षा पाठ्यक्रमको पूर्णता हेर्नुहोस्।|कर्मचारी प्रशिक्षण सौंपें और साझा अध्ययन तथा सुरक्षा पाठ्यक्रम की पूर्णता देखें।
training_providerDescription|Run focused cohorts with flexible schedules, private memberships and exportable reports.|柔軟な時間割、限定された所属情報、出力可能なレポートで研修を運営します。|लचिलो तालिका, निजी सदस्यता र निकाल्न मिल्ने प्रतिवेदनसहित समूह सञ्चालन गर्नुहोस्।|लचीली समय सारणी, निजी सदस्यता और निर्यात योग्य रिपोर्ट के साथ समूह चलाएँ।
employerType|Employer|雇用主|रोजगारदाता|नियोक्ता
month|Attendance month|出欠の対象月|उपस्थिति महिना|उपस्थिति माह
signInReturn|Sign in in a new tab, then return here to accept your invitation.|新しいタブでログインし、このページに戻って招待を承認してください。|नयाँ ट्याबमा साइन इन गरी यहाँ फर्केर निमन्त्रणा स्वीकार गर्नुहोस्।|नए टैब में साइन इन करें, फिर यहाँ लौटकर आमंत्रण स्वीकार करें।
dateScope|Dates filter practice activity and session attendance; lesson completion and enrollment counts are current snapshots.|日付は練習と授業の出欠を絞り込みます。完了率と所属数は現在の状態です。|मितिले अभ्यास र सत्र उपस्थिति फिल्टर गर्छ; पाठ पूर्णता र भर्ना हालको अवस्था हुन्।|तिथियाँ अभ्यास और सत्र उपस्थिति फ़िल्टर करती हैं; पाठ पूर्णता और नामांकन वर्तमान स्थिति हैं।
title|Organization workspace|組織ワークスペース|संस्था कार्यक्षेत्र|संगठन कार्यक्षेत्र
intro|Teach with clarity. Train with confidence.|学びと研修を、確かな一歩に。|स्पष्ट शिक्षण, विश्वस्त प्रशिक्षण।|स्पष्ट शिक्षण, भरोसेमंद प्रशिक्षण।
register|Register an organization|組織を登録|संस्था दर्ता गर्नुहोस्|संगठन पंजीकृत करें
onboarding|Join your organization|組織に参加|आफ्नो संस्थामा जोडिनुहोस्|अपने संगठन से जुड़ें
dashboard|Overview|概要|अवलोकन|अवलोकन
learners|Learners & staff|学習者とスタッフ|विद्यार्थी र कर्मचारी|विद्यार्थी और कर्मचारी
classes|Classes|クラス|कक्षाहरू|कक्षाएँ
attendance|Attendance|出欠管理|उपस्थिति|उपस्थिति
assignments|Assignments|学習課題|अध्ययन कार्य|अध्ययन कार्य
teacher|Teacher workspace|講師ワークスペース|शिक्षक कार्यक्षेत्र|शिक्षक कार्यक्षेत्र
employer|Employer reports|雇用主レポート|रोजगारदाता प्रतिवेदन|नियोक्ता रिपोर्ट
reports|Reports|レポート|प्रतिवेदन|रिपोर्ट
settings|Settings & privacy|設定とプライバシー|सेटिङ र गोपनीयता|सेटिंग और गोपनीयता
name|Organization name|組織名|संस्थाको नाम|संगठन का नाम
kind|Organization type|組織の種類|संस्थाको प्रकार|संगठन का प्रकार
institute|Language institute|日本語学校|भाषा संस्था|भाषा संस्थान
ssw_center|SSW training center|特定技能研修センター|SSW तालिम केन्द्र|SSW प्रशिक्षण केंद्र
training_provider|Training provider|研修機関|तालिम प्रदायक|प्रशिक्षण प्रदाता
contact_email|Contact email|連絡先メール|सम्पर्क इमेल|संपर्क ईमेल
contact_phone|Contact phone|電話番号|सम्पर्क फोन|संपर्क फ़ोन
logo_url|Logo HTTPS URL (optional)|ロゴのHTTPS URL（任意）|लोगो HTTPS URL (ऐच्छिक)|लोगो HTTPS URL (वैकल्पिक)
preferred_language|Preferred language|希望言語|रुचाइएको भाषा|पसंदीदा भाषा
timezone|Organization timezone|組織のタイムゾーン|संस्थाको समय क्षेत्र|संगठन का समय क्षेत्र
save|Save changes|変更を保存|परिवर्तन सुरक्षित गर्नुहोस्|परिवर्तन सहेजें
saving|Saving…|保存中…|सुरक्षित गर्दै…|सहेज रहे हैं…
saved|Saved successfully.|保存しました。|सुरक्षित भयो।|सहेजा गया।
invalid|Check all required fields and formats.|必須項目と形式を確認してください。|आवश्यक विवरण र ढाँचा जाँच्नुहोस्।|आवश्यक विवरण और प्रारूप जाँचें।
session|Your session expired. Sign in again.|セッションが切れました。再ログインしてください。|सत्र सकियो। फेरि साइन इन गर्नुहोस्।|सत्र समाप्त। फिर साइन इन करें।
saveError|Save rejected. Check permissions and deployed migrations; your input is retained.|保存できません。権限とマイグレーションを確認してください。入力は保持されています。|सुरक्षित भएन। अनुमति र माइग्रेसन जाँच्नुहोस्; विवरण राखिएको छ।|सहेजा नहीं गया। अनुमति और माइग्रेशन जाँचें; विवरण सुरक्षित है।
stale|This record changed. Reload before editing again.|他の変更があります。再読み込みしてください。|अभिलेख बदलिएको छ। फेरि लोड गर्नुहोस्।|रिकॉर्ड बदल गया। फिर लोड करें।
forbidden|You do not have access to this organization.|この組織へのアクセス権限がありません。|यो संस्थामा पहुँच छैन।|इस संगठन तक पहुँच नहीं है।
unavailable|Organization management is unavailable until the migration is deployed. No organization data is simulated.|組織管理にはマイグレーションが必要です。架空のデータは表示しません。|माइग्रेसन लागू नभएसम्म संस्था व्यवस्थापन उपलब्ध छैन। काल्पनिक तथ्याङ्क छैन।|माइग्रेशन लागू होने तक संगठन प्रबंधन उपलब्ध नहीं है। नकली आँकड़े नहीं दिखाए जाते।
empty|No records match these filters.|条件に合うデータがありません。|फिल्टरसँग मिल्ने अभिलेख छैन।|फ़िल्टर से मेल खाते रिकॉर्ड नहीं हैं।
chooseOrg|Choose organization|組織を選択|संस्था छान्नुहोस्|संगठन चुनें
noOrg|Register an organization or accept an invitation to get started.|組織登録または招待の承認から始めましょう。|संस्था दर्ता गर्नुहोस् वा निमन्त्रणा स्वीकार गर्नुहोस्।|संगठन पंजीकृत करें या आमंत्रण स्वीकार करें।
owner|Owner|オーナー|मालिक|स्वामी
administrator|Administrator|組織管理者|प्रशासक|प्रशासक
instructor|Teacher / trainer|講師・トレーナー|शिक्षक / प्रशिक्षक|शिक्षक / प्रशिक्षक
manager|Employer manager|雇用主マネージャー|रोजगारदाता व्यवस्थापक|नियोक्ता प्रबंधक
learner|Student / employee|学習者・従業員|विद्यार्थी / कर्मचारी|विद्यार्थी / कर्मचारी
platform_admin|Platform administrator|プラットフォーム管理者|प्लेटफर्म प्रशासक|प्लेटफ़ॉर्म प्रशासक
role|Role|役割|भूमिका|भूमिका
active|Active|有効|सक्रिय|सक्रिय
inactive|Inactive|無効|निष्क्रिय|निष्क्रिय
status|Status|状態|अवस्था|स्थिति
search|Search by name|名前で検索|नाम खोज्नुहोस्|नाम खोजें
all|All|すべて|सबै|सभी
invite|Create invitation links|招待リンクを作成|निमन्त्रणा लिङ्क बनाउनुहोस्|आमंत्रण लिंक बनाएँ
emails|Email addresses (one per line, maximum 20)|メールアドレス（1行1件、最大20件）|इमेल (प्रति लाइन एउटा, बढीमा २०)|ईमेल (प्रति पंक्ति एक, अधिकतम 20)
inviteNote|Links expire in 7 days and require the invited email to be verified. Email delivery is not configured; copy each link and deliver it securely yourself.|リンクは7日間有効で、招待先メールの確認が必要です。メール送信は未設定です。リンクを安全に共有してください。|लिङ्क ७ दिनमा समाप्त हुन्छ र इमेल प्रमाणीकरण चाहिन्छ। इमेल पठाउने सेवा छैन; लिङ्क सुरक्षित रूपमा दिनुहोस्।|लिंक 7 दिन में समाप्त होते हैं और ईमेल सत्यापन चाहिए। ईमेल सेवा जुड़ी नहीं है; लिंक सुरक्षित रूप से साझा करें।
inviteError|Invitation unavailable, expired, already used, or for a different verified email.|招待が無効・期限切れ・使用済み、またはメールが異なります。|निमन्त्रणा अमान्य, समाप्त, प्रयोग भएको वा इमेल फरक छ।|आमंत्रण अमान्य, समाप्त, उपयोग किया गया या ईमेल अलग है।
revoke|Revoke invitation|招待を取り消す|निमन्त्रणा रद्द गर्नुहोस्|आमंत्रण रद्द करें
token|Invitation token|招待トークン|निमन्त्रणा टोकन|आमंत्रण टोकन
accept|Accept invitation|招待を承認|निमन्त्रणा स्वीकार गर्नुहोस्|आमंत्रण स्वीकार करें
sharing|Share assigned-course progress with this organization|この組織に割り当てコースの進捗を共有する|यस संस्थासँग तोकिएको पाठ्यक्रमको प्रगति साझा गर्नुहोस्|इस संगठन से सौंपे गए पाठ्यक्रम की प्रगति साझा करें
privacy|Sharing is optional and can be revoked here. It covers assigned-course lesson counts, practice summaries and activity dates. It excludes private messages, AI transcripts, guide notes and unrelated study history. Class attendance remains an organization record.|共有は任意で、ここで解除できます。割り当てコースの完了数、練習結果、活動日のみ共有します。メッセージ、AI会話、個人メモ、無関係な学習履歴は共有しません。出欠は組織記録です。|साझेदारी ऐच्छिक छ र यहाँ बन्द गर्न सकिन्छ। तोकिएका पाठका सङ्ख्या, अभ्यास सारांश र गतिविधि मिति मात्र साझा हुन्छन्। निजी सन्देश, AI संवाद, नोट र अन्य अध्ययन समावेश हुँदैनन्। उपस्थिति संस्थाको अभिलेख हो।|साझा करना वैकल्पिक है और यहाँ बंद किया जा सकता है। केवल सौंपे गए पाठ्यक्रम की पाठ संख्या, अभ्यास सारांश और गतिविधि तिथियाँ साझा होती हैं। निजी संदेश, AI वार्तालाप, नोट और असंबंधित अध्ययन शामिल नहीं हैं। उपस्थिति संगठन का रिकॉर्ड है।
private|Not shared|非共有|साझा गरिएको छैन|साझा नहीं
jlpt|JLPT target|JLPT目標|JLPT लक्ष्य|JLPT लक्ष्य
jft|Preparing for JFT-Basic|JFT-Basic準備中|JFT-Basic तयारी|JFT-Basic तैयारी
industry|SSW industry|特定技能分野|SSW क्षेत्र|SSW क्षेत्र
classTitle|Class title|クラス名|कक्षाको नाम|कक्षा का नाम
schedule|Schedule (include timezone)|時間割（タイムゾーンを記載）|तालिका (समय क्षेत्रसहित)|समय सारणी (समय क्षेत्र सहित)
createClass|Create class|クラスを作成|कक्षा बनाउनुहोस्|कक्षा बनाएँ
edit|Edit|編集|सम्पादन|संपादित करें
class|Class|クラス|कक्षा|कक्षा
person|Member|メンバー|सदस्य|सदस्य
enroll|Enroll in class|クラスに登録|कक्षामा भर्ना|कक्षा में नामांकन
remove|Remove from class|クラス登録を解除|कक्षाबाट हटाउनुहोस्|कक्षा से हटाएँ
assignTeacher|Assign instructor / manager|講師・マネージャーを割り当て|शिक्षक / व्यवस्थापक तोक्नुहोस्|शिक्षक / प्रबंधक सौंपें
sessionTitle|Session title|授業名|सत्रको नाम|सत्र का नाम
starts|Start time (your browser timezone)|開始日時（ブラウザーのタイムゾーン）|सुरु समय (ब्राउजरको समय क्षेत्र)|आरंभ समय (ब्राउज़र समय क्षेत्र)
createSession|Create session|授業を作成|सत्र बनाउनुहोस्|सत्र बनाएँ
selectSession|Class session|授業を選択|कक्षा सत्र|कक्षा सत्र
present|Present|出席|उपस्थित|उपस्थित
absent|Absent|欠席|अनुपस्थित|अनुपस्थित
late|Late|遅刻|ढिलो|देर से
excused|Excused|公欠|अनुमति सहित अनुपस्थित|अनुमति सहित अनुपस्थित
unmarked|Unmarked|未入力|चिन्ह लगाइएको छैन|चिह्नित नहीं
bulk|Mark all visible learners|表示中の全員を一括入力|देखिएका सबैलाई चिन्ह लगाउनुहोस्|दिख रहे सभी को चिह्नित करें
saveAttendance|Save attendance|出欠を保存|उपस्थिति सुरक्षित गर्नुहोस्|उपस्थिति सहेजें
history|Attendance history|出欠履歴|उपस्थिति इतिहास|उपस्थिति इतिहास
course|Course|コース|पाठ्यक्रम|पाठ्यक्रम
deadline|Optional deadline|期限（任意）|ऐच्छिक समयसीमा|वैकल्पिक समय सीमा
assign|Assign course|コースを割り当て|पाठ्यक्रम तोक्नुहोस्|पाठ्यक्रम सौंपें
target|Assignment target|割り当て先|कार्यको लक्ष्य|कार्य का लक्ष्य
remind|Send in-app reminder|アプリ内通知を送信|एपमा सम्झना पठाउनुहोस्|ऐप में अनुस्मारक भेजें
reminders|Your assignment reminders|あなたの課題通知|तपाईंका कार्य सम्झना|आपके कार्य अनुस्मारक
completion|Lesson completion|レッスン完了率|पाठ पूर्णता|पाठ पूर्णता
accuracy|Practice accuracy|練習正答率|अभ्यास शुद्धता|अभ्यास शुद्धता
totalLearners|Learners|学習者数|विद्यार्थी|विद्यार्थी
activeLearners|Active enrollments|有効な所属|सक्रिय भर्ना|सक्रिय नामांकन
totalClasses|Classes|クラス数|कक्षाहरू|कक्षाएँ
attendanceRate|Attendance rate|出席率|उपस्थिति दर|उपस्थिति दर
method|Attendance = present or late / marked records excluding excused. Unmarked records are excluded. Practice accuracy is weighted by answered questions; no answers or denied sharing displays —.|出席率＝（出席＋遅刻）÷公欠以外の入力件数。未入力は除外。正答率は回答数で加重計算。回答なし・非共有は「—」です。|उपस्थिति = उपस्थित वा ढिलो / अनुमति बाहेक चिन्हित अभिलेख। शुद्धता प्रश्न सङ्ख्याले भारित हुन्छ। तथ्याङ्क नभए — देखिन्छ।|उपस्थिति = उपस्थित या देर / अनुमति को छोड़कर चिह्नित रिकॉर्ड। शुद्धता प्रश्न संख्या से भारित है। डेटा न होने पर — दिखता है।
trainingNotice|Internal learning records are not official JLPT, JFT-Basic or SSW certification.|内部学習記録はJLPT・JFT-Basic・特定技能の公式認定ではありません。|आन्तरिक अध्ययन अभिलेख आधिकारिक JLPT, JFT-Basic वा SSW प्रमाणपत्र होइन।|आंतरिक अध्ययन रिकॉर्ड आधिकारिक JLPT, JFT-Basic या SSW प्रमाणपत्र नहीं हैं।
from|From date|開始日|सुरु मिति|आरंभ तिथि
to|To date|終了日|अन्त्य मिति|समाप्ति तिथि
overdue|Overdue only|期限超過のみ|म्याद नाघेका मात्र|केवल समय सीमा पार
export|Export visible records as CSV|表示データをCSV出力|देखिएका अभिलेख CSV निकाल्नुहोस्|दिखते रिकॉर्ड CSV निर्यात करें
monthly|Monthly practice activity|月別練習回数|मासिक अभ्यास गतिविधि|मासिक अभ्यास गतिविधि
weakAreas|Practice by subject|分野別練習|विषयअनुसार अभ्यास|विषय अनुसार अभ्यास
recent|Last lesson activity|最終レッスン活動|पछिल्लो पाठ गतिविधि|अंतिम पाठ गतिविधि
audit|Recent audit records (latest 100)|監査記録（最新100件）|पछिल्ला लेखापरीक्षण अभिलेख (१००)|हाल के ऑडिट रिकॉर्ड (100)
verified|A verified account is required. Creating an organization gives ownership of that organization only.|確認済みアカウントが必要です。作成者はその組織のみのオーナーになります。|प्रमाणित खाता आवश्यक छ। संस्था बनाउँदा त्यही संस्थाको मात्र स्वामित्व मिल्छ।|सत्यापित खाता आवश्यक है। संगठन बनाने से केवल उसी संगठन का स्वामित्व मिलता है।
switch|Switch organization|組織を切り替え|संस्था बदल्नुहोस्|संगठन बदलें
copy|Copy link|リンクをコピー|लिङ्क प्रतिलिपि|लिंक कॉपी करें
vocabulary|Vocabulary|語彙|शब्दावली|शब्दावली
grammar|Grammar|文法|व्याकरण|व्याकरण
kanji|Kanji|漢字|कान्जी|कान्जी
reading|Reading|読解|पठन|पठन
listening|Listening|聴解|श्रवण|श्रवण
languageNote|Organization tools are available in four languages. Existing learning content may use English or Japanese.|組織ツールは4言語対応です。既存教材は英語・日本語の場合があります。|संस्था उपकरण चार भाषामा छन्। पुराना पाठ अंग्रेजी वा जापानीमा हुन सक्छन्।|संगठन उपकरण चार भाषाओं में हैं। पुराने पाठ अंग्रेज़ी या जापानी में हो सकते हैं。
`
  .trim()
  .split("\n")
  .map((l) => l.split("|"));
for (const [index, locale] of ["en", "ja", "ne", "hi"].entries()) {
  const path = `messages/${locale}.json`;
  const base = JSON.parse(
    fs.readFileSync(fs.existsSync(path) ? path : "messages/en.json", "utf8"),
  );
  base.Organization = Object.fromEntries(
    entries.map(([key, ...values]) => [key, values[index]]),
  );
  if (locale === "ne" || locale === "hi") {
    const labels = `courses|पाठ्यक्रम|पाठ्यक्रम
learn|अध्ययन उपकरण|अध्ययन उपकरण
business|व्यावसायिक जापानी|व्यावसायिक जापानी
life|जापानको जीवन|जापान में जीवन
login|साइन इन|साइन इन
register|सुरु गर्नुहोस्|आरंभ करें
explore|पाठ्यक्रम खोज्नुहोस्|पाठ्यक्रम खोजें
home|गृहपृष्ठ|मुखपृष्ठ
back|गृहपृष्ठमा फर्कनुहोस्|मुखपृष्ठ पर लौटें
preview|छिट्टै आउँदैछ|जल्द आ रहा है
menu|मेनु|मेनू
view|अध्ययन मार्ग हेर्नुहोस्|अध्ययन मार्ग देखें
loading|लोड हुँदैछ…|लोड हो रहा है…
brand|जापानी भाषातर्फ तपाईंको यात्रा। जापानसँग तपाईंको सम्बन्ध।|जापानी भाषा की ओर आपका सफ़र। जापान से आपका जुड़ाव।
copyright|© 2026 NihonPath. हरेक दिन थोरै प्रगति।|© 2026 NihonPath. हर दिन थोड़ी प्रगति।
footerNote|सिक्ने जिज्ञासा भएका सबैका लागि।|सीखने की जिज्ञासा रखने वाले सभी लोगों के लिए।
platform|प्लेटफर्म|प्लेटफ़ॉर्म
account|तपाईंको स्थान|आपका स्थान
dashboard|ड्यासबोर्ड|डैशबोर्ड
admin|प्रशासक पूर्वावलोकन|प्रशासक पूर्वावलोकन`
      .split("\n")
      .map((l) => l.split("|"));
    for (const [key, ne, hi] of labels)
      base.Common[key] = locale === "ne" ? ne : hi;
    const categories = {
      learn: ["जापानी सिक्नुहोस्", "जापानी सीखें"],
      jlpt: ["JLPT तयारी", "JLPT तैयारी"],
      "jft-basic": ["JFT-Basic", "JFT-Basic"],
      ssw: ["SSW र सीप", "SSW और कौशल"],
      business: ["व्यावसायिक जापानी", "व्यावसायिक जापानी"],
      "life-in-japan": ["जापान जीवन मार्गदर्शिका", "जापान जीवन मार्गदर्शिका"],
      "ai-practice": ["AI अभ्यास", "AI अभ्यास"],
      organizations: [
        "संस्था र रोजगारदाताका लागि",
        "संस्थानों और नियोक्ताओं के लिए",
      ],
    };
    for (const [key, values] of Object.entries(categories))
      base.Platform.categories[key].label = values[locale === "ne" ? 0 : 1];
    base.Platform.explore =
      locale === "ne" ? "NihonPath अन्वेषण गर्नुहोस्" : "NihonPath खोजें";
    base.Platform.available = locale === "ne" ? "उपलब्ध" : "उपलब्ध";
    base.Platform.comingSoon = base.Common.preview;
    base.Home.flashcardsLink = locale === "ne" ? "शब्द कार्ड" : "शब्द कार्ड";
    base.HomePractice.footerGroups =
      locale === "ne"
        ? ["अध्ययन", "जापान तयारी", "संस्थाहरू", "सहयोग"]
        : ["अध्ययन", "जापान की तैयारी", "संस्थान", "सहायता"];
    base.HomePractice.help = locale === "ne" ? "खाता सहयोग" : "खाता सहायता";
    base.Exams.title = locale === "ne" ? "परीक्षा केन्द्र" : "परीक्षा केंद्र";
    base.Common.language = locale === "ne" ? "भाषा" : "भाषा";
    base.Common.skip =
      locale === "ne" ? "मुख्य सामग्रीमा जानुहोस्" : "मुख्य सामग्री पर जाएँ";
  }
  fs.writeFileSync(path, JSON.stringify(base, null, 2) + "\n");
}
