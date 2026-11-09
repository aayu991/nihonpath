import fs from "node:fs";
const uid = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const courseId = (n) => uid("d6010000", n),
  bankId = (n) => uid("d6020000", n);
let qi = 0;
const questions = [];
function add(category, prompt, options, index, en, ja, translation = "") {
  questions.push({
    category,
    prompt,
    options,
    correctIndex: index,
    explanation: en,
    japaneseExplanation: ja,
    translation,
  });
}
const meanings = [
  ["やくそく", "Promise or appointment", "A meal", "A station"],
  ["つごう", "Availability or convenience", "A window", "A factory"],
  ["じゅんび", "Preparation", "Payment", "Weather"],
  ["れんらく", "Contact or communication", "Cleaning", "Walking"],
  ["しめきり", "Deadline", "Holiday", "Breakfast"],
  ["ちゅうい", "Caution or attention", "Reservation", "Price"],
  ["うけつけ", "Reception desk", "Exit", "Kitchen"],
  ["りょうきん", "Fee or charge", "Schedule", "Uniform"],
  ["けいけん", "Experience", "Luggage", "Medicine"],
  ["せつめい", "Explanation", "Delivery", "Rest"],
];
for (const [word, correct, a, b] of meanings)
  add(
    "word-meaning",
    `「${word}」の意味を選んでください。`,
    [correct, a, b],
    0,
    `${word} means “${correct.toLowerCase()}”. Choose the meaning rather than a similar everyday topic.`,
    `「${word}」の意味を確認しましょう。ほかの選択肢とは意味が違います。`,
    correct,
  );
const usage = [
  [
    "傘",
    "雨が降っていますから、（　）を持っていきます。",
    "靴下",
    "切手",
    "It is raining, so take an umbrella.",
    "The rain provides the context for 傘, umbrella.",
  ],
  [
    "予約",
    "ホテルに電話して、部屋を（　）しました。",
    "散歩",
    "洗濯",
    "I called the hotel and booked a room.",
    "予約する means to reserve, which fits booking a hotel room.",
  ],
  [
    "休憩",
    "二時間働いたので、十分（　）します。",
    "出発",
    "到着",
    "After working for two hours, I will take a ten-minute break.",
    "休憩する means to take a break after work.",
  ],
  [
    "相談",
    "分からないことがあったら、先生に（　）してください。",
    "料理",
    "運転",
    "If something is unclear, please consult the teacher.",
    "相談する means to discuss something or ask for advice.",
  ],
  [
    "確認",
    "送る前に、住所をもう一度（　）します。",
    "運動",
    "入院",
    "I check the address again before sending it.",
    "確認する means to check information is correct.",
  ],
  [
    "遅刻",
    "電車が止まったので、会社に（　）しました。",
    "貯金",
    "掃除",
    "The train stopped, so I was late for work.",
    "遅刻する means arriving late for an appointment or work.",
  ],
  [
    "案内",
    "駅までの道をお客さんに（　）しました。",
    "睡眠",
    "注文",
    "I showed the customer the way to the station.",
    "案内する means guiding someone or showing a route.",
  ],
  [
    "注文",
    "レストランで、カレーを（　）しました。",
    "卒業",
    "通勤",
    "I ordered curry at a restaurant.",
    "注文する is used for ordering food.",
  ],
  [
    "提出",
    "書いた申込書を受付に（　）します。",
    "出席",
    "欠席",
    "I submit the completed application at reception.",
    "提出する means handing in a document.",
  ],
  [
    "連絡",
    "仕事を休むときは、会社に（　）してください。",
    "買物",
    "洗顔",
    "Please contact the company when you will be absent.",
    "連絡する means contacting someone to share information.",
  ],
];
for (const [word, prompt, a, b, tr, en] of usage)
  add(
    "word-usage",
    prompt,
    [word, a, b],
    0,
    en,
    `この場面では「${word}」を使います。文全体の状況に合う言葉を選びます。`,
    tr,
  );
const kanji = [
  ["入口", "いりぐち", "でぐち", "いりくち", "entrance"],
  ["出口", "でぐち", "でくち", "いりぐち", "exit"],
  ["休日", "きゅうじつ", "きゅうにち", "きゅじつ", "day off"],
  ["住所", "じゅうしょ", "じゅしょ", "じゅうじょ", "address"],
  ["時間", "じかん", "しかん", "じけん", "time"],
  ["会社", "かいしゃ", "がいしゃ", "かいじゃ", "company"],
  ["電車", "でんしゃ", "てんしゃ", "でんじゃ", "train"],
  ["毎朝", "まいあさ", "まいちょう", "まえあさ", "every morning"],
  ["病院", "びょういん", "びよういん", "びょうえん", "hospital"],
  ["食事", "しょくじ", "しょくし", "たべじ", "meal"],
];
for (const [word, reading, a, b, meaning] of kanji)
  add(
    "kanji-reading",
    `「${word}」の読み方を選んでください。`,
    [reading, a, b],
    0,
    `${word} is read ${reading} and means ${meaning}. Pay attention to the length and voicing of the sounds.`,
    `「${word}」は「${reading}」と読みます。音の長さや濁音に注意しましょう。`,
    meaning,
  );
const grammar = [
  [
    "毎朝、六時（　）起きます。",
    ["に", "を", "で"],
    0,
    "に marks the specific time when an action occurs.",
    "「に」は動作が行われる時刻を表します。",
    "I get up at six every morning.",
  ],
  [
    "ここで写真を撮って（　）ですか。",
    ["もいい", "います", "しまう"],
    0,
    "て-form + もいいですか asks permission.",
    "「てもいいですか」は許可を求める表現です。",
    "May I take photos here?",
  ],
  [
    "昨日、スーパーで野菜を（　）。",
    ["買いました", "買います", "買いません"],
    0,
    "昨日 indicates a completed past event, so the affirmative past 買いました fits.",
    "「昨日」の出来事なので、過去の「買いました」を使います。",
    "I bought vegetables yesterday.",
  ],
  [
    "明日は休みなので、買い物に（　）つもりです。",
    ["行く", "行き", "行って"],
    0,
    "Dictionary form + つもり states an intention.",
    "「辞書形＋つもりです」は予定や意志を表します。",
    "I intend to go shopping tomorrow because it is a day off.",
  ],
  [
    "友達を誘います。「いっしょに昼ご飯を（　）か。」",
    ["食べません", "食べました", "食べています"],
    0,
    "ませんか is a polite invitation in this explicit invitation context.",
    "誘うときは「ませんか」を使います。",
    "Would you like to have lunch together?",
  ],
  [
    "今、電話を（　）います。",
    ["かけて", "かける", "かけた"],
    0,
    "て-form + います describes an action in progress.",
    "今している動作には「て形＋います」を使います。",
    "I am making a phone call now.",
  ],
  [
    "この部屋は、あの部屋（　）広いです。",
    ["より", "まで", "だけ"],
    0,
    "より marks the reference point in a comparison.",
    "比較の基準を表すときは「より」を使います。",
    "This room is larger than that one.",
  ],
  [
    "駅へ（　）には、どのバスに乗ればいいですか。",
    ["行く", "行って", "行きます"],
    0,
    "Dictionary form + には introduces the goal of the following advice question.",
    "「辞書形＋には」で目的を示して、方法を尋ねます。",
    "Which bus should I take to go to the station?",
  ],
  [
    "受付で名前を（　）から、中に入ってください。",
    ["書いて", "書く", "書きます"],
    0,
    "て-form + から expresses the order: first write, then enter.",
    "「てから」は動作の順序を表します。",
    "Please write your name at reception before entering.",
  ],
  [
    "熱があるので、今日は（　）ほうがいいです。",
    ["休んだ", "休み", "休んで"],
    0,
    "た-form + ほうがいい gives advice.",
    "助言するときは「た形＋ほうがいいです」を使います。",
    "Since you have a fever, you should rest today.",
  ],
];
for (const [p, o, i, e, j, tr] of grammar)
  add("grammar-expression", p, o, i, e, j, tr);
const situations = [
  [
    "お店で、商品がどこにあるか店員に尋ねます。",
    [
      "すみません、これはどこにありますか。",
      "いただきます。",
      "おかえりなさい。",
    ],
    "Ask politely where the product is. すみません gets the staff member’s attention.",
    "商品の場所を尋ねるときは「どこにありますか」を使います。",
  ],
  [
    "初めて会った人に自己紹介をします。",
    [
      "はじめまして。田中です。よろしくお願いします。",
      "ごちそうさまでした。",
      "お大事に。",
    ],
    "はじめまして and よろしくお願いします fit a first introduction.",
    "初めて会うときの自然なあいさつです。",
  ],
  [
    "もう一度、ゆっくり言ってほしいです。",
    [
      "すみません、もう一度ゆっくりお願いします。",
      "お先に失礼します。",
      "いってらっしゃい。",
    ],
    "Request repetition and slower speech politely.",
    "聞き取れないときは、もう一度ゆっくり話してもらいます。",
  ],
  [
    "先に仕事を終えて帰るとき、同僚に何と言いますか。",
    ["お先に失礼します。", "ただいま。", "お待たせしました。"],
    "お先に失礼します is used when leaving work before others.",
    "同僚より先に帰るときのあいさつです。",
  ],
  [
    "食事を用意してもらいました。食べ始める前に何と言いますか。",
    ["いただきます。", "おかえりなさい。", "行ってきます。"],
    "いただきます is said before beginning a meal.",
    "食べ始める前には「いただきます」と言います。",
  ],
  [
    "病気で休む同僚に声をかけます。",
    ["お大事にしてください。", "いらっしゃいませ。", "いただきます。"],
    "お大事に expresses care for someone who is ill.",
    "病気の人の体を気遣う表現です。",
  ],
  [
    "人に親切にしてもらいました。",
    ["ありがとうございます。", "お待ちください。", "どうぞお入りください。"],
    "ありがとうございます expresses thanks for help.",
    "親切にしてもらったときは感謝を伝えます。",
  ],
  [
    "約束の時間に遅れて到着しました。",
    ["遅れてすみません。", "どういたしまして。", "よいお年を。"],
    "Apologize for arriving late with 遅れてすみません.",
    "遅れたことを謝る表現です。",
  ],
  [
    "電話で、相手の名前を丁寧に尋ねます。",
    [
      "お名前を伺ってもよろしいですか。",
      "何を食べますか。",
      "どこに座りますか。",
    ],
    "伺ってもよろしいですか is a polite way to ask for someone’s name.",
    "「伺ってもよろしいですか」で丁寧に尋ねます。",
  ],
  [
    "相手が「ありがとうございます」と言いました。返事をします。",
    ["どういたしまして。", "いただきます。", "お帰りなさい。"],
    "どういたしまして is an appropriate response to thanks.",
    "感謝への返事に使う表現です。",
  ],
];
const situationTranslations = [
  "Ask a shop assistant where a product is.",
  "Introduce yourself to someone you are meeting for the first time.",
  "Ask someone to say it again slowly.",
  "What do you say to colleagues when you leave work before them?",
  "Someone has prepared a meal. What do you say before eating?",
  "Speak to a colleague who is taking sick leave.",
  "Someone has kindly helped you.",
  "You have arrived late for an appointment.",
  "Ask someone their name politely on the telephone.",
  "Respond to someone who has thanked you.",
];
situations.forEach(([p, o, e, j], i) =>
  add("situational-conversation", p, o, 0, e, j, situationTranslations[i]),
);
const notices = [
  [
    "入口：右のドアをご利用ください。",
    "どのドアを使いますか。",
    ["右のドア", "左のドア", "どのドアでもよい"],
    0,
    "The notice directs people to the door on the right.",
    "「右のドア」と書いてあります。",
  ],
  [
    "本日は休館です。明日は午前九時から開きます。",
    "今日はこの施設を利用できますか。",
    ["できません", "午前九時からできます", "一日中できます"],
    0,
    "本日は休館 means the facility is closed today.",
    "「本日は休館」なので今日は利用できません。",
  ],
  [
    "この先、工事中。別の道をお通りください。",
    "どうしますか。",
    ["別の道を通ります", "この道を進みます", "ここで買い物をします"],
    0,
    "The notice asks people to use another route during construction.",
    "「別の道を」と案内されています。",
  ],
  [
    "飲食禁止",
    "ここでしてはいけないことは何ですか。",
    ["食べたり飲んだりすること", "本を読むこと", "静かに座ること"],
    0,
    "飲食禁止 prohibits eating and drinking.",
    "「飲食」は食べたり飲んだりすることです。",
  ],
  [
    "受付は二階です。",
    "受付はどこですか。",
    ["二階", "一階", "三階"],
    0,
    "The notice specifies the second floor.",
    "「二階」と書いてあります。",
  ],
  [
    "土足禁止。靴を脱いでお入りください。",
    "入る前に何をしますか。",
    ["靴を脱ぎます", "帽子を買います", "窓を開けます"],
    0,
    "Visitors must remove their outdoor shoes before entering.",
    "「靴を脱いで」と指示されています。",
  ],
  [
    "この電車は各駅に止まります。",
    "この電車はどういう電車ですか。",
    ["すべての駅に止まる電車", "終点だけに止まる電車", "駅に止まらない電車"],
    0,
    "各駅 means every station.",
    "「各駅」はそれぞれの駅という意味です。",
  ],
  [
    "お会計はレジでお願いします。",
    "どこでお金を払いますか。",
    ["レジ", "入口の外", "席の下"],
    0,
    "Customers are asked to pay at the register.",
    "「レジ」で会計をします。",
  ],
  [
    "使用後は電気を消してください。",
    "使い終わったら、どうしますか。",
    ["電気を消します", "電気をつけます", "電気を買います"],
    0,
    "使用後 indicates what to do after use: turn off the light.",
    "使った後に電気を消すように書いてあります。",
  ],
  [
    "こちらは職員専用です。",
    "誰が利用できますか。",
    ["職員", "すべてのお客さん", "子供だけ"],
    0,
    "職員専用 means for staff use only.",
    "「専用」は決められた人だけが使うことを表します。",
  ],
];
for (const [notice, p, o, i, e, j] of notices)
  add("signs-notices", `${notice}\n\n${p}`, o, i, e, j, notice);
const schedules = [
  [
    "月〜金：九時〜十八時／土：十時〜十六時／日：休み",
    "土曜日は何時に開きますか。",
    ["十時", "九時", "十八時"],
    0,
    "The Saturday row opens at ten.",
    "土曜日の開始時間は十時です。",
  ],
  [
    "明日の集合は駅の東口、午前八時です。田中",
    "明日はどこに集まりますか。",
    ["駅の東口", "駅の西口", "会社の受付"],
    0,
    "The message specifies the station’s east exit.",
    "集合場所は「駅の東口」です。",
  ],
  [
    "会議は火曜日から水曜日に変わりました。時間は十時のままです。",
    "会議はいつですか。",
    ["水曜日の十時", "火曜日の十時", "水曜日の十一時"],
    0,
    "The day changes to Wednesday, while the time remains ten.",
    "曜日は水曜日になり、時間は十時のままです。",
  ],
  [
    "予約：十月二十五日 午後二時／場所：三〇一号室",
    "予約した部屋はどれですか。",
    ["三〇一号室", "三〇二号室", "二〇一号室"],
    0,
    "The reservation lists room 301.",
    "場所の欄に「三〇一号室」とあります。",
  ],
  [
    "バス：八時十分発、八時四十分発、九時十分発",
    "八時二十分に着きました。次のバスは何時ですか。",
    ["八時四十分", "八時十分", "九時十分"],
    0,
    "The first departure after 8:20 is 8:40.",
    "八時二十分より後で最も早い便は八時四十分です。",
  ],
  [
    "明日、午後三時に荷物が届きます。家で受け取ってください。",
    "明日の午後三時に何をしますか。",
    [
      "家で荷物を受け取ります",
      "駅へ荷物を持っていきます",
      "店で荷物を買います",
    ],
    0,
    "The message asks the reader to receive the delivery at home.",
    "家で荷物を受け取るように頼んでいます。",
  ],
  [
    "昼休み：十二時〜十三時／午後の仕事：十三時〜十七時",
    "午後の仕事は何時に始まりますか。",
    ["十三時", "十二時", "十七時"],
    0,
    "The afternoon work period begins at 13:00.",
    "午後の仕事は十三時からです。",
  ],
  [
    "買ってきてください：牛乳一本、卵六個。パンは家にあります。",
    "買わなくてもよいものは何ですか。",
    ["パン", "牛乳", "卵"],
    0,
    "Bread is already at home, so it does not need to be bought.",
    "パンは家にあると書いてあります。",
  ],
  [
    "今週の当番：月・田中／火・山田／水・佐藤",
    "火曜日の当番は誰ですか。",
    ["山田さん", "田中さん", "佐藤さん"],
    0,
    "The Tuesday row names Yamada.",
    "火曜日の欄は山田さんです。",
  ],
  [
    "セミナー：受付九時半／開始十時／終了十二時",
    "セミナーは何時に終わりますか。",
    ["十二時", "十時", "九時半"],
    0,
    "終了 means the end; the listed finishing time is twelve.",
    "「終了」の時刻は十二時です。",
  ],
];
for (const [passage, p, o, i, e, j] of schedules)
  add("messages-schedules", `${passage}\n\n${p}`, o, i, e, j, passage);
const sectorRows = [
  [
    "nursing-care",
    "Nursing care",
    "介護",
    "Careful, respectful communication with residents.",
    "利用者への丁寧な声かけを練習します。",
    [
      [
        "介護",
        "かいご",
        "Caregiving",
        "介護の仕事について勉強しています。",
        "I am studying caregiving work.",
      ],
      [
        "利用者",
        "りようしゃ",
        "Service user / resident",
        "利用者の方に名前を伺います。",
        "I politely ask the resident their name.",
      ],
      [
        "車椅子",
        "くるまいす",
        "Wheelchair",
        "車椅子の場所を職員に確認します。",
        "I check the wheelchair’s location with a staff member.",
      ],
      [
        "食事",
        "しょくじ",
        "Meal",
        "食事の時間をお知らせします。",
        "I let people know the mealtime.",
      ],
      [
        "水分",
        "すいぶん",
        "Fluids / hydration",
        "水分について職員に相談します。",
        "I consult staff about hydration.",
      ],
      [
        "体調",
        "たいちょう",
        "Physical condition",
        "体調はいかがですか。",
        "How are you feeling?",
      ],
      [
        "見守り",
        "みまもり",
        "Watching over / supervision",
        "見守りの担当を確認します。",
        "I check who is assigned to supervision.",
      ],
      [
        "記録",
        "きろく",
        "Record",
        "記録の書き方を教えてください。",
        "Please teach me how to write the record.",
      ],
      [
        "声かけ",
        "こえかけ",
        "Speaking to someone / prompting",
        "移動する前に声かけをします。",
        "I speak to the person before moving.",
      ],
      [
        "職員",
        "しょくいん",
        "Staff member",
        "分からないことは職員に聞きます。",
        "I ask staff about anything I do not understand.",
      ],
    ],
  ],
  [
    "food-service",
    "Food service",
    "外食",
    "Polite service, orders and clear communication.",
    "接客や注文の確認を練習します。",
    [
      [
        "注文",
        "ちゅうもん",
        "Order",
        "ご注文を確認します。",
        "I will confirm your order.",
      ],
      [
        "お客様",
        "おきゃくさま",
        "Customer / guest",
        "お客様をご案内します。",
        "I will show the customer to their seat.",
      ],
      [
        "会計",
        "かいけい",
        "Payment / bill",
        "お会計はこちらです。",
        "Please pay here.",
      ],
      [
        "予約",
        "よやく",
        "Reservation",
        "ご予約のお名前をお願いします。",
        "May I have the name on the reservation?",
      ],
      [
        "配膳",
        "はいぜん",
        "Serving meals",
        "配膳の順番を確認します。",
        "I check the order for serving meals.",
      ],
      [
        "洗浄",
        "せんじょう",
        "Washing / cleaning",
        "洗浄の手順を確認します。",
        "I check the washing procedure.",
      ],
      [
        "食材",
        "しょくざい",
        "Ingredients",
        "食材の名前を覚えます。",
        "I learn the names of ingredients.",
      ],
      [
        "アレルギー",
        "あれるぎー",
        "Allergy",
        "アレルギーについて担当者に確認します。",
        "I check with the person in charge about allergies.",
      ],
      [
        "手洗い",
        "てあらい",
        "Handwashing",
        "手洗いの場所を教えてください。",
        "Please show me where to wash my hands.",
      ],
      [
        "満席",
        "まんせき",
        "All seats occupied",
        "ただいま満席です。",
        "We are currently full.",
      ],
    ],
  ],
  [
    "accommodation",
    "Accommodation",
    "宿泊",
    "Guest greetings, reservations and directions.",
    "宿泊客へのご案内を練習します。",
    [
      [
        "宿泊",
        "しゅくはく",
        "Overnight stay",
        "二泊の宿泊を予約しました。",
        "I booked a two-night stay.",
      ],
      [
        "受付",
        "うけつけ",
        "Reception",
        "受付でお名前を伺います。",
        "We ask for your name at reception.",
      ],
      [
        "客室",
        "きゃくしつ",
        "Guest room",
        "客室は三階です。",
        "The guest room is on the third floor.",
      ],
      [
        "鍵",
        "かぎ",
        "Key",
        "こちらがお部屋の鍵です。",
        "Here is your room key.",
      ],
      [
        "朝食",
        "ちょうしょく",
        "Breakfast",
        "朝食は七時からです。",
        "Breakfast starts at seven.",
      ],
      [
        "清掃",
        "せいそう",
        "Cleaning",
        "清掃の時間を確認します。",
        "I confirm the cleaning time.",
      ],
      [
        "荷物",
        "にもつ",
        "Luggage",
        "お荷物はこちらにお願いします。",
        "Please place your luggage here.",
      ],
      [
        "確認",
        "かくにん",
        "Confirmation / checking",
        "予約の内容を確認します。",
        "I confirm the reservation details.",
      ],
      [
        "非常口",
        "ひじょうぐち",
        "Emergency exit",
        "非常口の場所を確認します。",
        "I check the location of the emergency exit.",
      ],
      [
        "連泊",
        "れんぱく",
        "Consecutive nights",
        "三日間の連泊です。",
        "It is a stay of three consecutive nights.",
      ],
    ],
  ],
  [
    "construction",
    "Construction",
    "建設",
    "Understand instructions and ask before acting.",
    "指示の確認や質問の表現を学びます。",
    [
      [
        "安全",
        "あんぜん",
        "Safety",
        "安全について説明を受けます。",
        "I receive an explanation about safety.",
      ],
      [
        "現場",
        "げんば",
        "Worksite",
        "現場の担当者に挨拶します。",
        "I greet the person in charge at the worksite.",
      ],
      [
        "保護具",
        "ほごぐ",
        "Protective equipment",
        "必要な保護具を担当者に確認します。",
        "I ask the person in charge which protective equipment is required.",
      ],
      [
        "工具",
        "こうぐ",
        "Tool",
        "工具の名前を教えてください。",
        "Please tell me the name of the tool.",
      ],
      [
        "足元",
        "あしもと",
        "Area around one’s feet / footing",
        "足元に注意してください。",
        "Please watch your step.",
      ],
      [
        "立入禁止",
        "たちいりきんし",
        "No entry",
        "立入禁止の表示を読みます。",
        "I read the no-entry sign.",
      ],
      [
        "指示",
        "しじ",
        "Instruction",
        "指示が分からないので確認します。",
        "I check because I do not understand the instruction.",
      ],
      [
        "点検",
        "てんけん",
        "Inspection",
        "点検の担当者を確認します。",
        "I check who is responsible for inspection.",
      ],
      [
        "報告",
        "ほうこく",
        "Report",
        "担当者に報告します。",
        "I report to the person in charge.",
      ],
      [
        "休憩",
        "きゅうけい",
        "Break",
        "休憩の時間は何時ですか。",
        "What time is the break?",
      ],
    ],
  ],
  [
    "manufacturing",
    "Manufacturing",
    "工業製品製造業",
    "Report problems and communicate with your team.",
    "問題の報告やチームで使う表現を学びます。",
    [
      [
        "製品",
        "せいひん",
        "Product",
        "製品の名前を確認します。",
        "I confirm the product name.",
      ],
      [
        "部品",
        "ぶひん",
        "Part / component",
        "部品の番号を読みます。",
        "I read the part number.",
      ],
      [
        "機械",
        "きかい",
        "Machine",
        "機械について担当者に質問します。",
        "I ask the person in charge about the machine.",
      ],
      [
        "異常",
        "いじょう",
        "Abnormality / problem",
        "異常について上司に報告します。",
        "I report the problem to my supervisor.",
      ],
      [
        "停止",
        "ていし",
        "Stop / suspension",
        "停止の表示が出ています。",
        "The stop indicator is showing.",
      ],
      [
        "検査",
        "けんさ",
        "Inspection / examination",
        "検査の担当者はどなたですか。",
        "Who is responsible for inspection?",
      ],
      [
        "数量",
        "すうりょう",
        "Quantity",
        "数量を確認してください。",
        "Please check the quantity.",
      ],
      [
        "手順",
        "てじゅん",
        "Procedure / sequence",
        "手順をもう一度説明してください。",
        "Please explain the procedure again.",
      ],
      [
        "保護眼鏡",
        "ほごめがね",
        "Safety glasses",
        "保護眼鏡の場所を確認します。",
        "I check where the safety glasses are.",
      ],
      [
        "作業",
        "さぎょう",
        "Task / work",
        "作業の内容を確認します。",
        "I confirm the details of the task.",
      ],
    ],
  ],
  [
    "agriculture",
    "Agriculture",
    "農業",
    "Field tasks, produce and clear instructions.",
    "農作業や農産物に関する表現を学びます。",
    [
      [
        "収穫",
        "しゅうかく",
        "Harvest",
        "収穫の日を確認します。",
        "I confirm the harvest date.",
      ],
      [
        "畑",
        "はたけ",
        "Field",
        "畑の場所を教えてください。",
        "Please tell me where the field is.",
      ],
      [
        "苗",
        "なえ",
        "Seedling",
        "苗の名前を覚えます。",
        "I learn the names of seedlings.",
      ],
      [
        "水やり",
        "みずやり",
        "Watering",
        "水やりの担当を確認します。",
        "I check who is responsible for watering.",
      ],
      [
        "肥料",
        "ひりょう",
        "Fertilizer",
        "肥料について担当者に聞きます。",
        "I ask the person in charge about fertilizer.",
      ],
      [
        "選別",
        "せんべつ",
        "Sorting / selection",
        "選別の基準を確認します。",
        "I confirm the sorting criteria.",
      ],
      [
        "出荷",
        "しゅっか",
        "Shipping",
        "出荷の時間を確認します。",
        "I confirm the shipping time.",
      ],
      [
        "天候",
        "てんこう",
        "Weather conditions",
        "天候を確認してから相談します。",
        "I check the weather conditions before discussing the plan.",
      ],
      [
        "農具",
        "のうぐ",
        "Farm tool",
        "農具の名前を教えてください。",
        "Please tell me the name of the farm tool.",
      ],
      [
        "手袋",
        "てぶくろ",
        "Gloves",
        "必要な手袋を確認します。",
        "I check which gloves are required.",
      ],
    ],
  ],
];
const sectors = sectorRows.map(
  ([slug, title, titleJa, summary, summaryJa, rows], i) => ({
    id: uid("d6030000", i + 1),
    slug,
    title,
    titleJa,
    summary,
    summaryJa,
    courseId: courseId(i + 2),
    deckId: uid("d6040000", i + 1),
    cards: rows.map(([term, reading, meaning, example, translation], j) => ({
      id: uid("d6050000", i * 10 + j + 1),
      vocabularyId: uid("d6060000", i * 10 + j + 1),
      level: "workplace",
      programLabel: title,
      term,
      reading,
      translations: { en: meaning, ja: term },
      example,
      exampleTranslation: translation,
      category: j >= 7 ? "Safety & communication" : "Workplace basics",
      topic: j >= 7 ? "Safety & communication" : "Workplace basics",
      difficulty: "basic",
    })),
  }),
);
const meaningJa = {
  やくそく: "人と予定を決めたり、あることを守ると伝えたりすることです。",
  つごう: "予定や事情から考えた、時間などのよさを表します。",
  じゅんび: "何かを始める前に、必要なものやことをそろえることです。",
  れんらく: "相手に必要な情報を知らせることです。",
  しめきり: "書類などを出さなければならない最後の日や時刻です。",
  ちゅうい: "危険などに気をつけたり、大切な点をよく見たりすることです。",
  うけつけ: "来た人の名前や用件を確認する場所や仕事です。",
  りょうきん: "サービスなどを利用するときに払うお金です。",
  けいけん: "自分で実際に見たり、したりしたことです。",
  せつめい: "相手に分かるように、内容や方法を話すことです。",
};
const usageJa = {
  傘: "雨にぬれないために傘を持っていきます。",
  予約: "ホテルの部屋を前もって取ることを予約と言います。",
  休憩: "働いた後で、短い時間休むことを休憩と言います。",
  相談: "分からないことを話して、助言をもらうために相談します。",
  確認: "住所が正しいかもう一度調べるので確認を使います。",
  遅刻: "決められた時刻より後に着くことを遅刻と言います。",
  案内: "道や場所を人に教えるときは案内を使います。",
  注文: "店で料理を頼むときは注文を使います。",
  提出: "書類を決められた相手や場所に出すことです。",
  連絡: "欠勤することを会社に知らせるので連絡を使います。",
};
for (const q of questions) {
  if (q.category === "word-meaning") {
    const word = Object.keys(meaningJa).find((w) => q.prompt.includes(w));
    if (word) q.japaneseExplanation = meaningJa[word];
  }
  if (q.category === "word-usage")
    q.japaneseExplanation = usageJa[q.options[q.correctIndex]];
}
const noticeTranslations = [
  "Entrance: please use the door on the right. Which door should you use?",
  "The facility is closed today. It opens tomorrow at 9 a.m. Can you use it today?",
  "Construction ahead. Please use another route. What should you do?",
  "No eating or drinking. Which activity is prohibited here?",
  "Reception is on the second floor. Where is reception?",
  "No outdoor shoes. Please take off your shoes before entering. What should you do first?",
  "This train stops at every station. What kind of train is it?",
  "Please pay at the register. Where should you pay?",
  "Please turn off the light after use. What should you do when finished?",
  "Staff only. Who may use this area?",
];
const scheduleTranslations = [
  "Monday to Friday: 9 a.m.–6 p.m. Saturday: 10 a.m.–4 p.m. Sunday: closed. What time does it open on Saturday?",
  "Tomorrow, meet at the station’s east exit at 8 a.m. — Tanaka. Where should you meet?",
  "The meeting has moved from Tuesday to Wednesday. It is still at ten. When is the meeting?",
  "Reservation: October 25 at 2 p.m. Location: room 301. Which room was reserved?",
  "Bus departures: 8:10, 8:40, 9:10. You arrived at 8:20. When is the next bus?",
  "A parcel will arrive at 3 p.m. tomorrow. Please receive it at home. What should you do at that time?",
  "Lunch break: noon–1 p.m. Afternoon work: 1–5 p.m. When does afternoon work begin?",
  "Please buy one carton of milk and six eggs. We have bread at home. What do you not need to buy?",
  "This week’s duty roster: Monday, Tanaka; Tuesday, Yamada; Wednesday, Sato. Who is on duty Tuesday?",
  "Seminar: reception at 9:30, start at 10, end at noon. When does the seminar finish?",
];
questions
  .filter((q) => q.category === "signs-notices")
  .forEach((q, i) => (q.translation = noticeTranslations[i]));
questions
  .filter((q) => q.category === "messages-schedules")
  .forEach((q, i) => (q.translation = scheduleTranslations[i]));
let banks = [];
const categories = [...new Set(questions.map((q) => q.category))];
for (const category of categories) {
  for (const mode of ["section", "quick"]) {
    const n = banks.length + 1;
    const subject = ["word-meaning", "word-usage"].includes(category)
      ? "vocabulary"
      : category === "kanji-reading"
        ? "kanji"
        : ["signs-notices", "messages-schedules"].includes(category)
          ? "reading"
          : "grammar";
    banks.push({
      id: bankId(n),
      courseId: courseId(1),
      category,
      mode,
      subject,
      title: `JFT-Basic · ${category} · ${mode}`,
      questions: questions
        .filter((q) => q.category === category)
        .slice(0, mode === "quick" ? 3 : 10)
        .map((q) => {
          const n = ++qi;
          return {
            ...q,
            id: uid("d6070000", n),
            optionIds: q.options.map((_, i) => uid("d6080000", n * 4 + i + 1)),
          };
        }),
    });
  }
}
const sceneData = [
  [
    "Offer assistance",
    "A resident is seated. Ask permission before offering help.",
    "利用者の方に、手伝いが必要か丁寧に尋ねます。",
    "職員",
    "何かお手伝いしましょうか。",
    "May I help you with anything?",
    "利用者",
    "はい、お願いします。",
    "Yes, please.",
    "利用者に丁寧に手伝いを申し出ます。どれが適切ですか。",
    [
      "何かお手伝いしましょうか。",
      "早くしてください。",
      "自分でやってください。",
    ],
    "Ask rather than assume. This respects the person’s choice; it is language practice, not clinical instruction.",
    "相手の希望を確認し、丁寧に申し出ます。専門的な介助手順の練習ではありません。",
  ],
  [
    "Confirm an order",
    "A guest orders tea. Confirm the order politely.",
    "お客様がお茶を注文しました。内容を確認します。",
    "お客様",
    "お茶を一つお願いします。",
    "One tea, please.",
    "店員",
    "お茶をお一つですね。",
    "One tea, correct?",
    "注文を確認するとき、どれが適切ですか。",
    ["お茶をお一つですね。", "何もありません。", "もう帰ってください。"],
    "Repeating the item and quantity politely checks the order.",
    "品物と数を繰り返して、注文を確認します。",
  ],
  [
    "Welcome a guest",
    "A guest arrives at the hotel. Ask for the reservation name.",
    "ホテルに到着したお客様に、予約のお名前を伺います。",
    "スタッフ",
    "いらっしゃいませ。ご予約はございますか。",
    "Welcome. Do you have a reservation?",
    "お客様",
    "はい、田中です。",
    "Yes, under Tanaka.",
    "予約のお名前を丁寧に尋ねます。",
    [
      "ご予約のお名前を伺ってもよろしいですか。",
      "名前を言え。",
      "何を食べましたか。",
    ],
    "伺ってもよろしいですか politely requests information from a guest.",
    "「伺ってもよろしいですか」で丁寧に尋ねます。",
  ],
  [
    "Clarify a safety instruction",
    "You do not understand a supervisor’s instruction. Ask for clarification before proceeding.",
    "上司の安全に関する指示が分かりません。作業前に確認します。",
    "上司",
    "ここから先は立入禁止です。",
    "Do not enter beyond this point.",
    "作業員",
    "分かりました。範囲をもう一度教えてください。",
    "Understood. Please show me the boundary again.",
    "指示が分からないとき、どれが適切ですか。",
    [
      "すみません、もう一度説明してください。",
      "分かりませんが、進みます。",
      "聞かずに作業します。",
    ],
    "Ask for clarification rather than acting on an unclear instruction. Follow trained supervision and workplace procedures.",
    "分からない指示は確認します。実際の安全判断や作業は職場の訓練と手順に従います。",
  ],
  [
    "Report a machine problem",
    "You notice an unusual sound. Report what you noticed to the supervisor.",
    "機械の音がいつもと違います。気づいたことを上司に報告します。",
    "作業員",
    "機械からいつもと違う音がします。",
    "The machine is making an unusual sound.",
    "上司",
    "分かりました。担当者に確認します。",
    "Understood. I will check with the person responsible.",
    "問題を報告するとき、どれが適切ですか。",
    [
      "機械からいつもと違う音がします。",
      "何も見ていません。",
      "報告しなくてもいいです。",
    ],
    "Describe the observed problem clearly; this exercise does not teach machine operation or emergency response.",
    "気づいたことを具体的に報告します。機械の操作方法を教える問題ではありません。",
  ],
  [
    "Confirm a field task",
    "Your supervisor asks you to sort produce. Ask which standard to use.",
    "農産物の選別を頼まれました。基準を確認します。",
    "上司",
    "この箱の野菜を選別してください。",
    "Please sort the vegetables in this box.",
    "作業員",
    "選別の基準を教えてください。",
    "Please explain the sorting criteria.",
    "基準を確認するとき、どれが適切ですか。",
    [
      "選別の基準を教えてください。",
      "全部同じ箱に入れます。",
      "何も確認しません。",
    ],
    "Ask for the criteria before starting an unfamiliar task.",
    "初めての作業では、基準を確認してから始めます。",
  ],
];
const scenarios = sectors.map((s, i) => {
  const [
    title,
    situation,
    situationJa,
    s1,
    j1,
    e1,
    s2,
    j2,
    e2,
    prompt,
    options,
    explanation,
    japaneseExplanation,
  ] = sceneData[i];
  const n = ++qi;
  const bank = {
    id: bankId(15 + i),
    courseId: s.courseId,
    category: "workplace-conversation",
    mode: "scenario",
    subject: "grammar",
    title,
    questions: [
      {
        id: uid("d6070000", n),
        prompt,
        options,
        optionIds: options.map((_, j) => uid("d6080000", n * 4 + j + 1)),
        correctIndex: 0,
        explanation,
        japaneseExplanation,
        translation: situation,
      },
    ],
  };
  banks.push(bank);
  return {
    id: uid("d6090000", i + 1),
    sectorId: s.id,
    lessonId: uid("d6100000", i + 1),
    bankId: bank.id,
    title,
    situation,
    situationJa,
    dialogue: [
      { speaker: s1, ja: j1, en: e1 },
      { speaker: s2, ja: j2, en: e2 },
    ],
  };
});
for (const [i, s] of sectors.entries()) {
  const qs = s.cards.slice(0, 5).map((c) => {
    const n = ++qi;
    return {
      id: uid("d6070000", n),
      prompt: `「${c.term}」の意味を選んでください。`,
      options: [
        c.translations.en,
        s.cards[(s.cards.indexOf(c) + 1) % 10].translations.en,
        s.cards[(s.cards.indexOf(c) + 2) % 10].translations.en,
      ],
      optionIds: [0, 1, 2].map((j) => uid("d6080000", n * 4 + j + 1)),
      correctIndex: 0,
      explanation: `${c.term} (${c.reading}) means ${c.translations.en.toLowerCase()}. In context: ${c.exampleTranslation}`,
      japaneseExplanation: `「${c.term}」の意味を例文と一緒に確認しましょう。`,
      translation: c.exampleTranslation,
    };
  });
  banks.push({
    id: bankId(21 + i),
    courseId: s.courseId,
    category: "industry-vocabulary",
    mode: "industry",
    subject: "vocabulary",
    title: `${s.title} · vocabulary check`,
    questions: qs,
  });
  s.bankId = bankId(21 + i);
}
const interviewRows = [
  [
    "Introduction",
    "自己紹介をお願いします。",
    "はじめまして。〇〇と申します。日本語を勉強しています。本日はよろしくお願いいたします。",
    "My name is __. I am studying Japanese. Thank you for meeting with me today.",
    "Replace 〇〇 with your name. Keep your introduction brief and truthful.",
    "〇〇を自分の名前に変えて、簡潔に伝えます。",
  ],
  [
    "Work experience",
    "これまでの仕事について教えてください。",
    "以前は〇〇の仕事をしていました。主に〇〇を担当していました。",
    "Previously I worked in __. My main responsibility was __.",
    "Describe only your actual experience. If you have none, explain what you have learned instead.",
    "実際の経験を伝えます。未経験なら、学んだことを説明します。",
  ],
  [
    "Motivation",
    "なぜ日本で働きたいですか。",
    "日本語を使って働き、〇〇の技術を学びたいと考えています。",
    "I would like to work using Japanese and learn skills in __.",
    "Give your own specific motivation; do not present this template as a personal fact.",
    "自分の具体的な理由に合わせて答えます。",
  ],
  [
    "Strengths",
    "あなたの長所を教えてください。",
    "私の長所は、分からないことを確認してから行動することです。",
    "My strength is checking what I do not understand before acting.",
    "Support a truthful strength with an example from your own life.",
    "本当の長所を、自分の経験を添えて説明します。",
  ],
  [
    "Areas to improve",
    "改善したい点はありますか。",
    "日本語で話すとき、まだ時間がかかります。毎日声に出して練習しています。",
    "Speaking Japanese still takes me time. I practise speaking aloud every day.",
    "State a real area for improvement and the steps you are taking.",
    "改善したい点と、そのための努力を伝えます。",
  ],
  [
    "Polite clarification",
    "質問が聞き取れないとき、どう言いますか。",
    "申し訳ありません。もう一度、ゆっくりお話しいただけますか。",
    "I am sorry. Could you please say that again slowly?",
    "It is appropriate to request clarification instead of pretending to understand.",
    "分かったふりをせず、丁寧に聞き直します。",
  ],
  [
    "Closing questions",
    "最後に質問はありますか。",
    "入社後の研修について教えていただけますか。",
    "Could you tell me about the training after joining?",
    "Ask a genuine question about the role or training.",
    "仕事内容や研修について、知りたいことを丁寧に尋ねます。",
  ],
];
const interviews = interviewRows.map(
  ([topic, prompt, answer, translation, explanation, explanationJa], i) => ({
    id: uid("d6110000", i + 1),
    lessonId: uid("d6100000", i + 7),
    sectorId: null,
    topic,
    prompt,
    answer,
    translation,
    explanation,
    explanationJa,
  }),
);
sectors.forEach((s, i) =>
  interviews.push({
    id: uid("d6110000", i + 8),
    lessonId: uid("d6100000", i + 14),
    sectorId: s.id,
    topic: s.title,
    prompt: "この仕事で大切だと思うことは何ですか。",
    answer:
      "分からないことを確認し、周りの人と丁寧に話すことが大切だと考えています。",
    translation:
      "I think it is important to check what I do not understand and communicate respectfully with others.",
    explanation: `For ${s.title.toLowerCase()}, connect this answer to a truthful experience. Language practice alone does not demonstrate professional competence.`,
    explanationJa:
      "自分の経験に合わせて答えます。日本語の練習だけで専門的な能力を証明するものではありません。",
  }),
);
const resources = [
  {
    id: uid("d6120000", 1),
    category: "jft",
    title: "Japan Foundation · JFT-Basic structure",
    url: "https://www.jpf.go.jp/jft-basic/e/about/index.html",
    summary:
      "Four sections, around 50 questions in 60 minutes. Review stays within the current section; listening does not allow previous/next review.",
    summaryJa:
      "四分野、約50問、60分です。前の分野には戻れず、聴解では前後の問題を見直せません。",
    reviewedAt: "2026-10-24",
  },
  {
    id: uid("d6120000", 2),
    category: "ssw",
    title: "Immigration Services Agency · SSW fields",
    url: "https://www.ssw.go.jp/en/about/visa/",
    summary:
      "Consult the current official sector pages. The six NihonPath tracks are a learning subset, not a complete eligibility list. The food-service page currently notes a pause on new applications.",
    summaryJa:
      "最新の分野情報は公式ページで確認してください。当サイトの六つの学習分野は全対象分野の一覧ではありません。外食分野には新規申請に関する停止の案内があります。",
    reviewedAt: "2026-10-24",
  },
  {
    id: uid("d6120000", 3),
    category: "ssw",
    title: "Prometric · Tests and schedules",
    url: "https://www.prometric-jp.com/ssw/",
    summary:
      "Check the test provider for current examination subjects, locations and booking dates. NihonPath does not make test reservations.",
    summaryJa:
      "試験科目、会場、予約日程は試験実施機関で確認してください。当サイトでは試験の予約を行いません。",
    reviewedAt: "2026-10-24",
  },
  {
    id: uid("d6120000", 4),
    category: "ssw",
    title: "ISA · Nursing care language requirements",
    url: "https://www.ssw.go.jp/en/about/visa/nursing_care_1/",
    summary:
      "The nursing care field lists JLPT N4 or higher or JFT-Basic, plus its additional nursing care Japanese evaluation. Skill tests and any exemptions must be checked on the official pages.",
    summaryJa:
      "介護分野にはJLPT N4以上またはJFT-Basicに加え、介護日本語評価試験の案内があります。技能試験や免除条件は公式情報で確認してください。",
    reviewedAt: "2026-10-24",
  },
];
// Balance answer positions without changing the authored keys.
for (const bank of banks)
  for (const [i, q] of bank.questions.entries()) {
    const shift = (i + banks.indexOf(bank)) % q.options.length;
    const options = q.options.map(
      (_, j) => q.options[(j - shift + q.options.length) % q.options.length],
    );
    q.options = options;
    q.correctIndex = (q.correctIndex + shift) % q.options.length;
  }
const readings = {
  茶: "ちゃ",
  手伝: "てつだ",
  予約: "よやく",
  名前: "なまえ",
  伺: "うかが",
  注文: "ちゅうもん",
  範囲: "はんい",
  立入禁止: "たちいりきんし",
  説明: "せつめい",
  機械: "きかい",
  担当者: "たんとうしゃ",
  確認: "かくにん",
  野菜: "やさい",
  選別: "せんべつ",
  基準: "きじゅん",
  教: "おし",
  日本語: "にほんご",
  仕事: "しごと",
  経験: "けいけん",
  自分: "じぶん",
  改善: "かいぜん",
  質問: "しつもん",
  研修: "けんしゅう",
};
function ruby(text) {
  return Object.entries(readings).reduce(
    (t, [word, reading]) =>
      t.replaceAll(word, "{" + word + "|" + reading + "}"),
    text,
  );
}
for (const scene of scenarios)
  for (const line of scene.dialogue) line.ja = ruby(line.ja);
for (const item of interviews) {
  item.answer = ruby(item.answer);
  item.prompt = ruby(item.prompt);
}
resources[3].sectorId = sectors[0].id;
const fieldPaths = [
  "food_service_1",
  "accommodation_1",
  "construction_1",
  "industrial_product_manufacturing_1",
  "agriculture_1",
];
sectors
  .slice(1)
  .forEach((sector, i) =>
    resources.push({
      id: uid("d6120000", i + 5),
      sectorId: sector.id,
      category: "ssw",
      title: `ISA · ${sector.title} skills & language guidance`,
      url: `https://www.ssw.go.jp/en/about/visa/${fieldPaths[i]}/`,
      summary:
        i === 0
          ? "The official notice describes a suspension of certificate-of-eligibility issuance and links to skills-test booking restrictions. Check current updates before planning."
          : "Read the official field-specific skills assessment, Japanese language standards and exemption guidance. This learning track does not replace the skills assessment.",
      summaryJa:
        i === 0
          ? "公式ページには在留資格認定証明書の交付停止や技能試験の予約制限に関する案内があります。計画前に最新情報を確認してください。"
          : "分野別の技能評価、日本語要件、免除条件は公式ページで確認してください。この学習教材は技能評価試験の代わりではありません。",
      reviewedAt: "2026-10-24",
    }),
  );
const result = {
  jftCourseId: courseId(1),
  interviewCourseId: courseId(8),
  programs: [
    {
      id: uid("d6000000", 1),
      slug: "jft-basic-foundation",
      title: "JFT-Basic preparation",
      category: "jft-basic",
    },
    {
      id: uid("d6000000", 2),
      slug: "ssw-workplace",
      title: "SSW workplace Japanese",
      category: "ssw",
    },
  ],
  sectors,
  banks,
  scenarios,
  interviews,
  resources,
};
fs.writeFileSync(
  "src/data/preparation-content.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log({
  originalJftQuestions: questions.length,
  industryCards: sectors.reduce((n, s) => n + s.cards.length, 0),
  scenarios: scenarios.length,
  interviews: interviews.length,
});
