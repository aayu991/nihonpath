import fs from "node:fs";
const rows = `
manageVerification|Update reviewed credential status|資格の審査状態を更新|समीक्षित योग्यता अवस्था अद्यावधिक|समीक्षित योग्यता स्थिति बदलें
applicationFeedback|Review feedback shared with this applicant|申請者に共有する審査フィードバック|यस आवेदकसँग साझा समीक्षा प्रतिक्रिया|इस आवेदक से साझा समीक्षा प्रतिक्रिया
availabilityPage|Availability checks apply to this page of results; use Next results to check more tutors.|空き時間の確認はこの結果ページが対象です。次の結果で他の講師を確認できます。|उपलब्धता यस नतिजा पृष्ठमा जाँचिन्छ; अन्य शिक्षकका लागि अर्को पृष्ठ हेर्नुहोस्।|उपलब्धता इस परिणाम पृष्ठ पर जाँची जाती है; अन्य शिक्षकों हेतु अगला पृष्ठ देखें।
title|Find your Japanese tutor|日本語の先生を探す|आफ्नो जापानी शिक्षक खोज्नुहोस्|अपना जापानी शिक्षक खोजें
intro|Learn with a person who understands your goals.|目標に寄り添う先生と学びましょう。|तपाईंको लक्ष्य बुझ्ने शिक्षकसँग सिक्नुहोस्।|आपके लक्ष्य समझने वाले शिक्षक से सीखें।
description|Explore approved tutor profiles, compare teaching styles and request a free lesson at a time that works for you.|承認済みの講師を比較し、自分に合う時間に無料レッスンをリクエストできます。|स्वीकृत शिक्षकहरू तुलना गरी उपयुक्त समयमा निःशुल्क पाठको अनुरोध गर्नुहोस्।|स्वीकृत शिक्षकों की तुलना करें और सुविधाजनक समय पर निःशुल्क पाठ का अनुरोध करें।
become|Become a tutor|講師になる|शिक्षक बन्नुहोस्|शिक्षक बनें
apply|Tutor application|講師申請|शिक्षक आवेदन|शिक्षक आवेदन
applicationIntro|Share your teaching approach. Applications remain private until reviewed; approved profile details become public only when you publish.|指導方針をお知らせください。申請は審査まで非公開です。承認後、公開操作でプロフィールを掲載できます。|पढाउने तरिका बताउनुहोस्। आवेदन समीक्षा नभएसम्म निजी हुन्छ; स्वीकृत विवरण तपाईंले प्रकाशन गरेपछि मात्र सार्वजनिक हुन्छ।|अपनी शिक्षण शैली बताएँ। समीक्षा तक आवेदन निजी रहता है; स्वीकृत विवरण आपके प्रकाशित करने पर ही सार्वजनिक होता है।
dashboard|Tutor workspace|講師ワークスペース|शिक्षक कार्यक्षेत्र|शिक्षक कार्यक्षेत्र
availability|Availability|対応日時|उपलब्ध समय|उपलब्ध समय
myLessons|My lessons|受講レッスン|मेरा पाठहरू|मेरे पाठ
admin|Tutor marketplace administration|講師マーケット管理|शिक्षक बजार प्रशासन|शिक्षक बाज़ार प्रशासन
name|Display name|表示名|देखिने नाम|दिखने वाला नाम
photo|Profile photo HTTPS URL (optional)|写真のHTTPS URL（任意）|तस्बिर HTTPS URL (ऐच्छिक)|फ़ोटो HTTPS URL (वैकल्पिक)
languages|Teaching languages|指導言語|पढाउने भाषा|पढ़ाने की भाषाएँ
country|Country|国|देश|देश
timezone|Timezone|タイムゾーン|समय क्षेत्र|समय क्षेत्र
levels|JLPT levels taught|指導するJLPTレベル|पढाउने JLPT स्तर|पढ़ाने के JLPT स्तर
specialties|Specialties|専門分野|विशेष क्षेत्र|विशेष क्षेत्र
experience|Years of teaching experience|指導経験（年）|शिक्षण अनुभव (वर्ष)|शिक्षण अनुभव (वर्ष)
biography|About your teaching (50–4,000 characters)|指導紹介（50〜4,000文字）|शिक्षण परिचय (५०–४,००० अक्षर)|शिक्षण परिचय (50–4,000 अक्षर)
video|Introduction video HTTPS link (optional)|紹介動画のHTTPSリンク（任意）|परिचय भिडियो HTTPS लिङ्क (ऐच्छिक)|परिचय वीडियो HTTPS लिंक (वैकल्पिक)
credentials|Qualifications for private review (optional)|資格情報・非公開審査用（任意）|निजी समीक्षाका लागि योग्यता (ऐच्छिक)|निजी समीक्षा हेतु योग्यताएँ (वैकल्पिक)
credentialNotice|Describe relevant qualifications. Do not include identity numbers or private contact details. Document uploads are not supported.|関連資格を記載してください。身分証番号や個人連絡先は記載しないでください。書類アップロードには未対応です。|सम्बन्धित योग्यता लेख्नुहोस्। परिचय नम्बर वा निजी सम्पर्क नलेख्नुहोस्। कागजात अपलोड उपलब्ध छैन।|संबंधित योग्यताएँ लिखें। पहचान संख्या या निजी संपर्क न लिखें। दस्तावेज़ अपलोड उपलब्ध नहीं है।
duration|Duration (minutes)|時間（分）|अवधि (मिनेट)|अवधि (मिनट)
price|Price per lesson|レッスン料金|प्रति पाठ मूल्य|प्रति पाठ मूल्य
currency|Currency|通貨|मुद्रा|मुद्रा
paidUnavailable|Paid booking is unavailable. Published prices are informational until payment integration is implemented. No payment or card information is collected.|有料予約は未対応です。表示料金は決済導入まで参考情報です。支払いやカード情報は収集しません。|सशुल्क बुकिङ उपलब्ध छैन। भुक्तानी सेवा नजोडिएसम्म मूल्य जानकारीका लागि मात्र हो। भुक्तानी वा कार्ड विवरण लिइँदैन।|सशुल्क बुकिंग उपलब्ध नहीं है। भुगतान सेवा जुड़ने तक मूल्य केवल जानकारी हेतु है। भुगतान या कार्ड विवरण नहीं लिया जाता।
free|Free lesson|無料レッスン|निःशुल्क पाठ|निःशुल्क पाठ
save|Save|保存|सुरक्षित गर्नुहोस्|सहेजें
saving|Working…|処理中…|प्रक्रियामा…|प्रक्रिया जारी…
saved|Saved successfully.|保存しました。|सुरक्षित भयो।|सहेजा गया।
submit|Submit application|申請を提出|आवेदन बुझाउनुहोस्|आवेदन जमा करें
draft|Draft|下書き|मस्यौदा|मसौदा
submitted|Submitted|提出済み|बुझाइएको|जमा किया गया
under_review|Under review|審査中|समीक्षामा|समीक्षाधीन
approved|Approved profile|承認済みプロフィール|स्वीकृत प्रोफाइल|स्वीकृत प्रोफ़ाइल
rejected|Changes required / rejected|修正が必要・却下|परिवर्तन आवश्यक / अस्वीकृत|बदलाव आवश्यक / अस्वीकृत
suspended|Suspended|停止中|निलम्बित|निलंबित
pending|Pending tutor confirmation|講師確認待ち|शिक्षकको पुष्टि पर्खाइमा|शिक्षक की पुष्टि की प्रतीक्षा
confirmed|Confirmed|予約確定|पुष्टि भएको|पुष्टि हुई
declined|Declined|辞退|अस्वीकृत|अस्वीकृत
cancelled|Cancelled|キャンセル済み|रद्द भएको|रद्द हुई
completed|Completed|完了|पूरा भएको|पूर्ण हुई
no_show|No-show recorded|欠席の記録|अनुपस्थिति अभिलेख|अनुपस्थिति रिकॉर्ड
expired|Request expired|リクエスト期限切れ|अनुरोधको म्याद सकियो|अनुरोध समाप्त
unavailable|Tutor data is unavailable until the marketplace migration is deployed. No profiles or statistics are simulated.|マーケットのマイグレーション適用後に利用できます。架空の講師や統計は表示しません。|माइग्रेसन लागू भएपछि शिक्षक तथ्याङ्क उपलब्ध हुन्छ। काल्पनिक प्रोफाइल वा आँकडा छैन।|माइग्रेशन लागू होने पर शिक्षक डेटा उपलब्ध होगा। नकली प्रोफ़ाइल या आँकड़े नहीं दिखाए जाते।
empty|No tutors match yet. Try changing your filters or check back after tutors publish approved profiles.|該当する講師はまだいません。条件を変更するか、公開後にご確認ください。|मिल्ने शिक्षक छैनन्। फिल्टर बदल्नुहोस् वा स्वीकृत प्रोफाइल प्रकाशित भएपछि हेर्नुहोस्।|मेल खाते शिक्षक नहीं हैं। फ़िल्टर बदलें या स्वीकृत प्रोफ़ाइल प्रकाशित होने पर देखें।
emptyLessons|No lessons here yet. Bookings will appear after a real request.|まだレッスンがありません。予約リクエスト後に表示されます。|अहिलेसम्म पाठ छैनन्। वास्तविक अनुरोधपछि बुकिङ देखिन्छ।|अभी पाठ नहीं हैं। वास्तविक अनुरोध के बाद बुकिंग दिखेगी।
invalid|Check the required fields, dates and amounts.|必須項目・日時・金額を確認してください。|आवश्यक विवरण, मिति र रकम जाँच्नुहोस्।|आवश्यक विवरण, तिथियाँ और राशि जाँचें।
session|Sign in again to continue.|続けるにはログインしてください。|जारी राख्न फेरि साइन इन गर्नुहोस्।|जारी रखने के लिए फिर साइन इन करें।
forbidden|This operation requires independently authorized administration.|この操作には管理者権限が必要です。|यस कार्यका लागि अधिकृत प्रशासक चाहिन्छ।|इस कार्य हेतु अधिकृत प्रशासक चाहिए।
saveError|The request was rejected. Check permissions, current status and migration setup. Your input is retained.|処理できません。権限・現在の状態・設定を確認してください。入力は保持されています。|अनुरोध अस्वीकृत भयो। अनुमति, अवस्था र माइग्रेसन जाँच्नुहोस्। विवरण राखिएको छ।|अनुरोध अस्वीकृत हुआ। अनुमति, स्थिति और माइग्रेशन जाँचें। विवरण रखा गया है।
stale|This record changed. Reload before trying again.|情報が更新されています。再読み込みしてください。|अभिलेख बदलिएको छ। फेरि लोड गर्नुहोस्।|रिकॉर्ड बदल गया। फिर लोड करें।
slotGone|This time is no longer available. Refresh the available times.|この時間は予約できなくなりました。空き時間を更新してください。|यो समय अब उपलब्ध छैन। उपलब्ध समय फेरि हेर्नुहोस्।|यह समय अब उपलब्ध नहीं है। उपलब्ध समय फिर देखें।
limit|You have reached the daily or pending-request limit. Try later or resolve pending requests.|本日または確認待ち件数の上限です。後で試すか未確定予約をご確認ください。|दैनिक वा बाँकी अनुरोध सीमा पुग्यो। पछि प्रयास गर्नुहोस् वा बाँकी अनुरोध मिलाउनुहोस्।|दैनिक या लंबित अनुरोध सीमा पूरी हुई। बाद में प्रयास करें या लंबित अनुरोध निपटाएँ।
search|Search tutors|講師を検索|शिक्षक खोज्नुहोस्|शिक्षक खोजें
all|All|すべて|सबै|सभी
verified|Credentials reviewed|資格審査済み|योग्यता समीक्षा भएको|योग्यता की समीक्षा हुई
unverified|Credentials not verified|資格未確認|योग्यता प्रमाणित छैन|योग्यता सत्यापित नहीं
minPrice|Minimum price|最低料金|न्यूनतम मूल्य|न्यूनतम मूल्य
maxPrice|Maximum price|最高料金|अधिकतम मूल्य|अधिकतम मूल्य
sort|Sort|並び順|क्रम|क्रम
nameSort|Name|名前|नाम|नाम
experienceSort|Most experience|経験が多い順|धेरै अनुभव|अधिक अनुभव
ratingSort|Published review rating|公開レビュー評価|प्रकाशित समीक्षा मूल्याङ्कन|प्रकाशित समीक्षा रेटिंग
priceSort|Lowest price in selected currency|選択通貨の料金が安い順|छानिएको मुद्रामा न्यून मूल्य|चुनी मुद्रा में कम मूल्य
priceHint|Choose a currency before using price ranges or price sorting.|料金条件や料金順には通貨を選択してください。|मूल्य सीमा वा क्रमअघि मुद्रा छान्नुहोस्।|मूल्य सीमा या क्रम से पहले मुद्रा चुनें।
profile|View profile|プロフィールを見る|प्रोफाइल हेर्नुहोस्|प्रोफ़ाइल देखें
book|Request a lesson|レッスンをリクエスト|पाठ अनुरोध गर्नुहोस्|पाठ का अनुरोध करें
reviews|Completed-lesson reviews|受講完了後のレビュー|पूरा भएका पाठका समीक्षा|पूर्ण पाठ की समीक्षाएँ
noReviews|No published reviews yet.|公開レビューはまだありません。|प्रकाशित समीक्षा छैन।|अभी प्रकाशित समीक्षाएँ नहीं हैं।
about|Teaching approach|指導方針|शिक्षण शैली|शिक्षण शैली
lessonTypes|Lesson types|レッスンの種類|पाठका प्रकार|पाठ के प्रकार
watchVideo|Open introduction video|紹介動画を開く|परिचय भिडियो खोल्नुहोस्|परिचय वीडियो खोलें
weekOf|Search from this date|この日から検索|यस मितिबाट खोज्नुहोस्|इस तिथि से खोजें
compatible|Show times in my timezone|自分のタイムゾーンで表示|मेरो समय क्षेत्रमा देखाउनुहोस्|मेरे समय क्षेत्र में दिखाएँ
startHour|Earliest local hour|希望開始時刻（時）|स्थानीय सुरु घण्टा|स्थानीय आरंभ घंटा
endHour|Latest local hour|希望終了時刻（時）|स्थानीय अन्त्य घण्टा|स्थानीय समाप्ति घंटा
checkAvailability|Check next 7 days|次の7日間を確認|आगामी ७ दिन जाँच्नुहोस्|अगले 7 दिन जाँचें
availableTimes|Available times|予約可能な時間|उपलब्ध समय|उपलब्ध समय
noSlots|No matching times in this seven-day window. Try another date or lesson type.|この7日間に該当する時間はありません。日付や種類を変更してください。|यी ७ दिनमा मिल्ने समय छैन। मिति वा पाठ बदल्नुहोस्।|इन 7 दिनों में समय नहीं है। तिथि या पाठ बदलें।
scheduleConfigured|Availability schedule configured|対応時間を設定済み|समय तालिका तयार छ|समय सारणी तय है
availabilityUnchecked|Check the schedule for current availability.|最新の空き時間をご確認ください。|हालको उपलब्धता तालिकामा जाँच्नुहोस्।|वर्तमान उपलब्धता समय सारणी में जाँचें।
selectSlot|Choose a time|時間を選択|समय छान्नुहोस्|समय चुनें
goals|Learning goals shared with your tutor (optional)|講師と共有する学習目標（任意）|शिक्षकसँग साझा हुने अध्ययन लक्ष्य (ऐच्छिक)|शिक्षक से साझा अध्ययन लक्ष्य (वैकल्पिक)
confirmRequest|Confirm free lesson request|無料レッスンのリクエストを確定|निःशुल्क पाठ अनुरोध पुष्टि गर्नुहोस्|निःशुल्क पाठ अनुरोध की पुष्टि करें
requestSent|Your request is saved. The tutor must confirm it. View it in My lessons.|リクエストを保存しました。講師の確認後に確定します。「受講レッスン」で確認できます。|अनुरोध सुरक्षित भयो। शिक्षकको पुष्टि चाहिन्छ। मेरा पाठहरूमा हेर्नुहोस्।|अनुरोध सहेजा गया। शिक्षक की पुष्टि चाहिए। मेरे पाठ में देखें।
bookingNotice|Times include a UTC offset. Repeated daylight-saving hours are separate instants. Pending requests hold a slot for up to 24 hours; availability is rechecked on confirmation.|時刻にはUTCとの差を表示します。夏時間終了時の同じ時刻は別枠です。リクエストは最大24時間枠を保持し、確定時に再確認します。|समयमा UTC अन्तर हुन्छ। दोहोरिने घण्टा फरक क्षण हुन्। अनुरोधले बढीमा २४ घण्टा समय रोक्छ; पुष्टिमा पुनः जाँच हुन्छ।|समय में UTC अंतर दिखता है। दोहराए घंटे अलग क्षण हैं। अनुरोध अधिकतम 24 घंटे स्लॉट रोकता है; पुष्टि पर फिर जाँच होती है।
weekly|Weekly availability in tutor timezone|講師のタイムゾーンでの毎週の対応時間|शिक्षकको समय क्षेत्रमा साप्ताहिक उपलब्धता|शिक्षक के समय क्षेत्र में साप्ताहिक उपलब्धता
weekday|Day of week|曜日|बार|सप्ताह का दिन
startTime|Start time|開始時刻|सुरु समय|आरंभ समय
endTime|End time|終了時刻|अन्त्य समय|समाप्ति समय
addRule|Add weekly window|毎週の時間帯を追加|साप्ताहिक समय थप्नुहोस्|साप्ताहिक समय जोड़ें
dateSpecific|Date-specific availability or holiday block|特定日の対応時間・休暇|विशेष मितिको उपलब्धता वा बिदा|विशेष तिथि की उपलब्धता या अवकाश
utcInput|Enter these one-off date/time fields in UTC. Weekly windows above use your tutor timezone.|特定日時はUTCで入力してください。毎週の時間帯は講師のタイムゾーンです。|यी विशेष मिति/समय UTC मा दिनुहोस्। साप्ताहिक समय शिक्षकको समय क्षेत्रमा हुन्छ।|ये विशेष तिथि/समय UTC में दें। साप्ताहिक समय शिक्षक के समय क्षेत्र में है।
available|Available|対応可|उपलब्ध|उपलब्ध
blocked|Unavailable / holiday|対応不可・休暇|अनुपलब्ध / बिदा|अनुपलब्ध / अवकाश
remove|Remove window|時間帯を削除|समय हटाउनुहोस्|समय हटाएँ
noticeHours|Minimum booking notice (hours)|予約の最低事前時間（時間）|न्यूनतम अग्रिम समय (घण्टा)|न्यूनतम अग्रिम समय (घंटे)
horizonDays|Maximum booking horizon (days)|予約可能な先の日数（日）|अधिकतम अग्रिम दिन|अधिकतम अग्रिम दिन
publish|Publish approved profile|承認済みプロフィールを公開|स्वीकृत प्रोफाइल प्रकाशित गर्नुहोस्|स्वीकृत प्रोफ़ाइल प्रकाशित करें
published|Published|公開中|प्रकाशित|प्रकाशित
hide|Hide lesson type|レッスンを非公開|पाठ प्रकार लुकाउनुहोस्|पाठ प्रकार छिपाएँ
show|Publish lesson type|レッスンを公開|पाठ प्रकार प्रकाशित गर्नुहोस्|पाठ प्रकार प्रकाशित करें
lessonTitle|Lesson title|レッスン名|पाठको नाम|पाठ का नाम
addLesson|Add lesson type|レッスンを追加|पाठ प्रकार थप्नुहोस्|पाठ प्रकार जोड़ें
calendar|Booking calendar|予約カレンダー|बुकिङ पात्रो|बुकिंग कैलेंडर
date|Filter lesson date|レッスン日で絞り込み|पाठ मिति फिल्टर|पाठ तिथि फ़िल्टर
status|Status|状態|अवस्था|स्थिति
confirm|Confirm request|予約を確定|अनुरोध पुष्टि गर्नुहोस्|अनुरोध की पुष्टि करें
decline|Decline request|リクエストを辞退|अनुरोध अस्वीकार गर्नुहोस्|अनुरोध अस्वीकार करें
cancel|Cancel lesson / accept cancellation|キャンセル・取消依頼を承認|पाठ रद्द / रद्द अनुरोध स्वीकार|पाठ रद्द / रद्द अनुरोध स्वीकार
requestCancel|Request cancellation|キャンセルを依頼|रद्द गर्न अनुरोध|रद्द करने का अनुरोध
cancelRequested|Cancellation requested|キャンセル依頼あり|रद्द अनुरोध भएको|रद्द अनुरोध हुआ
complete|Confirm lesson took place|受講完了を確認|पाठ सम्पन्न भएको पुष्टि|पाठ सम्पन्न होने की पुष्टि
awaitOther|Your completion is recorded; waiting for the other participant.|完了確認を記録しました。相手の確認を待っています。|तपाईंको पुष्टि भयो; अर्को सहभागीको प्रतीक्षा छ।|आपकी पुष्टि दर्ज है; दूसरे सहभागी की प्रतीक्षा है।
completionNotice|Both student and tutor confirm completion after the scheduled end before a review becomes eligible.|予定終了後、学習者と講師の双方が完了を確認するとレビューできます。|नियोजित अन्त्यपछि विद्यार्थी र शिक्षक दुवैले पुष्टि गरेपछि समीक्षा दिन सकिन्छ।|निर्धारित अंत के बाद विद्यार्थी और शिक्षक दोनों की पुष्टि पर समीक्षा दी जा सकती है।
reason|Reason (at least 10 characters for reports/no-show)|理由（報告・欠席記録は10文字以上）|कारण (उजुरी/अनुपस्थितिका लागि कम्तीमा १० अक्षर)|कारण (रिपोर्ट/अनुपस्थिति हेतु कम से कम 10 अक्षर)
meeting|Private meeting URL|非公開の会議URL|निजी बैठक URL|निजी बैठक URL
meetingNotice|Use Google Meet, Zoom or Teams. Only participants see the link. NihonPath hides it one day after the lesson; the external service controls room access.|Google Meet・Zoom・Teamsに対応。リンクは参加者のみ閲覧でき、終了1日後にNihonPathで非表示になります。会議室へのアクセスは外部サービスが管理します。|Meet, Zoom वा Teams प्रयोग गर्नुहोस्। सहभागीले मात्र लिङ्क हेर्छन्। NihonPath ले एक दिनपछि लुकाउँछ; बैठक पहुँच बाह्य सेवाले नियन्त्रण गर्छ।|Meet, Zoom या Teams उपयोग करें। केवल सहभागी लिंक देखते हैं। NihonPath एक दिन बाद छिपाता है; बैठक पहुँच बाहरी सेवा नियंत्रित करती है।
join|Open lesson meeting|レッスンの会議を開く|पाठ बैठक खोल्नुहोस्|पाठ बैठक खोलें
privateNote|Your private lesson note|自分だけのレッスンメモ|तपाईंको निजी पाठ नोट|आपका निजी पाठ नोट
noteNotice|Only you can read this note. It is not shared with the other participant or marketplace administrators.|このメモは自分だけが閲覧できます。相手や管理者には共有しません。|यो नोट तपाईंले मात्र पढ्न सक्नुहुन्छ। अर्को सहभागी वा बजार प्रशासकसँग साझा हुँदैन।|यह नोट केवल आप पढ़ सकते हैं। दूसरे सहभागी या बाज़ार प्रशासक से साझा नहीं होता।
rating|Rating (1–5)|評価（1〜5）|मूल्याङ्कन (१–५)|रेटिंग (1–5)
reviewBody|Lesson review (10–2,000 characters)|レッスンレビュー（10〜2,000文字）|पाठ समीक्षा (१०–२,००० अक्षर)|पाठ समीक्षा (10–2,000 अक्षर)
writeReview|Submit lesson review for moderation|レビューを審査に提出|समीक्षाका लागि पाठ समीक्षा बुझाउनुहोस्|समीक्षा हेतु पाठ समीक्षा जमा करें
response|Tutor response|講師の返信|शिक्षकको जवाफ|शिक्षक का उत्तर
respond|Submit response for moderation|返信を審査に提出|समीक्षाका लागि जवाफ बुझाउनुहोस्|समीक्षा हेतु उत्तर जमा करें
report|Report profile, review or lesson issue|プロフィール・レビュー・レッスンを報告|प्रोफाइल, समीक्षा वा पाठ समस्या रिपोर्ट|प्रोफ़ाइल, समीक्षा या पाठ समस्या रिपोर्ट
moderationPending|Awaiting moderation|公開審査待ち|समीक्षा पर्खाइमा|समीक्षा की प्रतीक्षा
reviewNotes|Private administrator review notes|管理者の非公開審査メモ|प्रशासकको निजी समीक्षा टिप्पणी|प्रशासक की निजी समीक्षा टिप्पणी
qualificationSummary|Public reviewed qualification summary|審査済み資格の公開要約|समीक्षित योग्यताको सार्वजनिक सारांश|समीक्षित योग्यता का सार्वजनिक सारांश
attest|I actually reviewed the qualifications and evidence described here.|記載された資格と根拠を実際に確認しました。|मैले यहाँका योग्यता र प्रमाण वास्तवमै समीक्षा गरेको छु।|मैंने यहाँ की योग्यताओं और प्रमाण की वास्तव में समीक्षा की है।
applications|Tutor applications|講師申請一覧|शिक्षक आवेदनहरू|शिक्षक आवेदन
reports|Reports and disputes|報告・相談|उजुरी र विवाद|रिपोर्ट और विवाद
activity|Booking activity|予約状況|बुकिङ गतिविधि|बुकिंग गतिविधि
logs|Recent moderation history|最近の管理履歴|पछिल्लो समीक्षा इतिहास|हाल का मॉडरेशन इतिहास
hidden|Hidden|非公開|लुकाइएको|छिपाया गया
resolved|Resolved|対応済み|समाधान भएको|समाधान हुआ
purge|Apply private-data retention cleanup|非公開データの保管期限処理|निजी तथ्याङ्क अवधि सफाइ|निजी डेटा अवधि सफाई
retention|Meeting links are hidden after one day. Notes and learning goals are removed after one year when an administrator runs cleanup. Tutor-related records cascade on account deletion; full platform deletion needs the existing data-retention process.|会議リンクは1日後に非表示です。管理者の保管期限処理で1年後のメモ・目標を削除します。アカウント削除時は講師関連記録も削除されます。全体の削除には既存データの保管方針を適用します。|बैठक लिङ्क एक दिनपछि लुक्छ। प्रशासक सफाइमा एक वर्षपछि नोट र लक्ष्य हट्छन्। खाता हटाउँदा शिक्षक अभिलेख हट्छन्; पूरा प्लेटफर्मका लागि विद्यमान डेटा नीति चाहिन्छ।|बैठक लिंक एक दिन बाद छिपता है। प्रशासक सफाई में एक वर्ष बाद नोट और लक्ष्य हटते हैं। खाता हटाने पर शिक्षक रिकॉर्ड हटते हैं; पूरे प्लेटफ़ॉर्म हेतु मौजूदा डेटा नीति चाहिए।
more|Next results|次の結果|अर्का नतिजा|अगले परिणाम
previous|Previous|前へ|अघिल्लो|पिछला
next|Next week|次の週|अर्को हप्ता|अगला सप्ताह
jlpt|JLPT preparation|JLPT対策|JLPT तयारी|JLPT तैयारी
jft|JFT-Basic preparation|JFT-Basic対策|JFT-Basic तयारी|JFT-Basic तैयारी
business|Business Japanese|ビジネス日本語|व्यावसायिक जापानी|व्यावसायिक जापानी
workplace|Workplace Japanese|職場の日本語|कार्यस्थल जापानी|कार्यस्थल जापानी
interviews|Japanese interviews|日本語面接|जापानी अन्तर्वार्ता|जापानी साक्षात्कार
conversation|Daily conversation|日常会話|दैनिक कुराकानी|दैनिक बातचीत
grammar|Kanji and grammar|漢字・文法|कान्जी र व्याकरण|कान्जी और व्याकरण
pronunciation|Speaking and pronunciation|会話・発音|बोलाइ र उच्चारण|बोलना और उच्चारण
industry|Industry-specific Japanese|分野別日本語|क्षेत्रविशेष जापानी|क्षेत्रविशेष जापानी
`
  .trim()
  .split("\n")
  .map((l) => l.split("|"));
for (const [i, locale] of ["en", "ja", "ne", "hi"].entries()) {
  const path = `messages/${locale}.json`,
    m = JSON.parse(fs.readFileSync(path, "utf8"));
  m.Tutor = Object.fromEntries(rows.map(([k, ...v]) => [k, v[i]]));
  fs.writeFileSync(path, JSON.stringify(m, null, 2) + "\n");
}
