import fs from "node:fs";
const id = (prefix, n) =>
  `${prefix.padEnd(8, "0")}-0000-4000-8000-${String(n + 1).padStart(12, "0")}`;
const lessons = [];
const add = (level, subject, title, en, ja, examples) =>
  lessons.push({
    id: id("81", lessons.length),
    courseId: id("6", ["n5", "n4", "n3", "n2", "n1"].indexOf(level)),
    level,
    subject,
    title,
    position: 100 + lessons.filter((x) => x.level === level).length,
    body: {
      text: en,
      subject,
      explanationEn: en,
      explanationJa: ja,
      examples: examples.map(([japanese, english]) => ({ japanese, english })),
    },
  });
add(
  "n5",
  "grammar",
  "を · Marking the object",
  "Use を after the thing affected by an action. The particle is written を and pronounced o. The verb comes at the end.",
  "「を」は、{食|た}べるものや{読|よ}むものの{後|あと}に{置|お}きます。",
  [
    ["パンを{食|た}べます。", "I eat bread."],
    ["{本|ほん}を{読|よ}みます。", "I read a book."],
    ["{水|みず}を{飲|の}みます。", "I drink water."],
  ],
);
add(
  "n5",
  "grammar",
  "に · Time and destination",
  "Use に with a specific clock time. に can also mark a destination with movement verbs. These are different uses of the same particle.",
  "{時間|じかん}を{言|い}うときや、{行|い}く{場所|ばしょ}を{言|い}うときに「に」を{使|つか}います。",
  [
    ["{七時|しちじ}に{起|お}きます。", "I get up at seven."],
    ["{学校|がっこう}に{行|い}きます。", "I go to school."],
  ],
);
add(
  "n4",
  "grammar",
  "ながら · Two actions together",
  "Attach ながら to the verb’s ます-stem: 聞きます → 聞きながら. The same person does both actions at the same time. The main action is in the final clause.",
  "「ます{形|けい}の{語幹|ごかん}＋ながら」は、{同|おな}じ{人|ひと}が{二|ふた}つのことを{同時|どうじ}にするときに{使|つか}います。",
  [
    [
      "{音楽|おんがく}を{聞|き}きながら、{料理|りょうり}をします。",
      "I cook while listening to music.",
    ],
    [
      "{友達|ともだち}と{話|はな}しながら、{駅|えき}まで{歩|ある}きます。",
      "I walk to the station while talking with a friend.",
    ],
    [
      "お{茶|ちゃ}を{飲|の}みながら、{本|ほん}を{読|よ}みます。",
      "I read a book while drinking tea.",
    ],
  ],
);
add(
  "n4",
  "grammar",
  "てから · What happens next",
  "Use a verb’s て-form + から to say that the following action happens after the first action is completed.",
  "「て{形|けい}＋から」は、{先|さき}にすることと、その{後|あと}にすることの{順番|じゅんばん}を{表|あらわ}します。",
  [
    [
      "{宿題|しゅくだい}をしてから、テレビを{見|み}ます。",
      "I watch TV after doing my homework.",
    ],
    [
      "{手|て}を{洗|あら}ってから、ご{飯|はん}を{食|た}べます。",
      "I eat after washing my hands.",
    ],
  ],
);
for (const level of ["n5", "n4"]) {
  add(
    level,
    "vocabulary",
    level === "n5" ? "Everyday words" : "Words for daily plans",
    "Read each word in context, then practice the vocabulary deck. Notice the particle and the verb, not only the isolated word.",
    "{単語|たんご}だけでなく、{文|ぶん}の{中|なか}で{使|つか}い{方|かた}を{見|み}ましょう。",
    level === "n5"
      ? [
          ["{水|みず}を{飲|の}みます。", "I drink water."],
          ["{友達|ともだち}と{話|はな}します。", "I talk with a friend."],
        ]
      : [
          [
            "{明日|あした}の{予定|よてい}を{確認|かくにん}します。",
            "I check tomorrow’s schedule.",
          ],
          [
            "{会議|かいぎ}は{午後|ごご}です。",
            "The meeting is in the afternoon.",
          ],
        ],
  );
  add(
    level,
    "kanji",
    level === "n5" ? "日 and 月 in context" : "会 and 社 in context",
    "Kanji readings depend on the word. Learn a whole word and its reading together; do not assume a character always has one pronunciation.",
    "{漢字|かんじ}は{言葉|ことば}によって{読|よ}み{方|かた}が{変|か}わります。{言葉|ことば}と{一緒|いっしょ}に{覚|おぼ}えましょう。",
    level === "n5"
      ? [
          ["{日曜日|にちようび}です。", "It is Sunday."],
          [
            "{月曜日|げつようび}に{学校|がっこう}へ{行|い}きます。",
            "I go to school on Monday.",
          ],
        ]
      : [
          ["{会社|かいしゃ}で{働|はたら}いています。", "I work at a company."],
          [
            "{会議|かいぎ}は{三時|さんじ}からです。",
            "The meeting starts at three.",
          ],
        ],
  );
  add(
    level,
    "reading",
    level === "n5" ? "A short morning routine" : "A changed meeting time",
    "Read the whole passage first. Identify the person, time and main action before answering the reading practice questions.",
    "まず{全部|ぜんぶ}{読|よ}みましょう。だれが、いつ、{何|なに}をするか{考|かんが}えましょう。",
    level === "n5"
      ? [
          [
            "{田中|たなか}さんは{毎朝|まいあさ}{七時|しちじ}に{起|お}きます。パンを{食|た}べて、{八時|はちじ}に{学校|がっこう}へ{行|い}きます。",
            "Tanaka gets up at seven every morning, eats bread and goes to school at eight.",
          ],
          [
            "{学校|がっこう}へ{行|い}くのは{八時|はちじ}です。",
            "The time for going to school is eight.",
          ],
        ]
      : [
          [
            "{明日|あした}の{会議|かいぎ}は{二時|にじ}からの{予定|よてい}でしたが、{三時|さんじ}に{変|か}わりました。{場所|ばしょ}は{同|おな}じです。",
            "Tomorrow’s meeting was planned for two but has changed to three. The location is the same.",
          ],
          [
            "{変|か}わったのは{時間|じかん}だけです。",
            "Only the time changed.",
          ],
        ],
  );
}
const extraCards = [
  [
    "n3",
    "約束",
    "やくそく",
    "promise; arrangement",
    "{友達|ともだち}との{約束|やくそく}を{守|まも}ります。",
    "I keep my promise to a friend.",
  ],
  [
    "n3",
    "準備",
    "じゅんび",
    "preparation",
    "{旅行|りょこう}の{準備|じゅんび}をします。",
    "I prepare for the trip.",
  ],
  [
    "n3",
    "経験",
    "けいけん",
    "experience",
    "この{経験|けいけん}から{学|まな}びました。",
    "I learned from this experience.",
  ],
  [
    "n2",
    "責任",
    "せきにん",
    "responsibility",
    "{仕事|しごと}に{責任|せきにん}を{持|も}ちます。",
    "I take responsibility for my work.",
  ],
  [
    "n2",
    "提案",
    "ていあん",
    "proposal",
    "{新|あたら}しい{方法|ほうほう}を{提案|ていあん}します。",
    "I propose a new method.",
  ],
  [
    "n2",
    "改善",
    "かいぜん",
    "improvement",
    "{作業|さぎょう}の{手順|てじゅん}を{改善|かいぜん}します。",
    "I improve the work procedure.",
  ],
  [
    "n1",
    "配慮",
    "はいりょ",
    "consideration",
    "{周囲|しゅうい}への{配慮|はいりょ}が{必要|ひつよう}です。",
    "Consideration for others is necessary.",
  ],
  [
    "n1",
    "概念",
    "がいねん",
    "concept",
    "この{概念|がいねん}を{説明|せつめい}します。",
    "I explain this concept.",
  ],
  [
    "n1",
    "是正",
    "ぜせい",
    "correction; rectification",
    "{不公平|ふこうへい}な{制度|せいど}を{是正|ぜせい}します。",
    "I rectify an unfair system.",
  ],
].map(([level, term, reading, meaning, example, exampleTranslation], i) => ({
  id: id("b1", i),
  level,
  term,
  reading,
  translations: {
    en: meaning,
    ja:
      {
        約束: "人と決めたこと。",
        準備: "前もって必要なものを用意すること。",
        経験: "実際に行ったり見たりしたこと。",
        責任: "自分の役割を果たす義務。",
        提案: "考えや方法を示すこと。",
        改善: "今よりよくすること。",
        配慮: "相手や周りのことを考えること。",
        概念: "物事についての基本的な考え。",
        是正: "悪い点や不公平を正すこと。",
      }[term] ?? meaning,
  },
  example,
  exampleTranslation,
  category: "Daily life & work",
}));
const old = JSON.parse(fs.readFileSync("src/data/flashcards.json", "utf8"));
const cards = [
  ...old.map((c, i) => ({
    ...c,
    id: id("1", i),
    category: "Everyday Japanese",
  })),
  ...extraCards,
];
const n5 = [
  [
    "わたしはパン（　）{食|た}べます。",
    ["を", "に", "で", "へ"],
    0,
    "を marks the direct object, the thing eaten. に and へ indicate other relationships; で often marks the place or means of an action.",
    "「を」は{食|た}べるものの{後|あと}です。",
    "I eat bread.",
  ],
  [
    "{学校|がっこう}（　）{日本語|にほんご}を{勉強|べんきょう}します。",
    ["に", "で", "を", "へ"],
    1,
    "で marks the place where an action happens. The studying happens at school. に and へ do not mark the location of this activity.",
    "{勉強|べんきょう}する{場所|ばしょ}には「で」を{使|つか}います。",
    "I study Japanese at school.",
  ],
  [
    "{毎朝|まいあさ}{七時|しちじ}（　）{起|お}きます。",
    ["を", "が", "に", "で"],
    2,
    "に marks a specific clock time. Here the speaker gets up at seven. It is not an object or the means of doing the action.",
    "はっきりした{時間|じかん}の{後|あと}に「に」を{置|お}きます。",
    "I get up at seven every morning.",
  ],
  [
    "きのう{映画|えいが}を（　）。",
    ["見ます", "見ません", "見ましょう", "見ました"],
    3,
    "きのう refers to yesterday, so use the polite past affirmative 見ました for a completed action. The other choices are non-past or an invitation.",
    "きのうのことなので「{見|み}ました」です。",
    "I watched a film yesterday.",
  ],
  [
    "この{本|ほん}は（　）です。",
    ["おもしろい", "おもしろく", "おもしろくて", "おもしろかったら"],
    0,
    "An affirmative non-past い-adjective keeps い before です. おもしろく is an adverbial form; おもしろくて links clauses; おもしろかったら is conditional.",
    "「い{形容詞|けいようし}＋です」の{形|かたち}です。",
    "This book is interesting.",
  ],
  [
    "{友達|ともだち}を{誘|さそ}います。「{一緒|いっしょ}にお{茶|ちゃ}を{飲|の}み（　）。」",
    ["ました", "ませんか", "ませんでした", "ますから"],
    1,
    "ませんか politely invites someone to do something together. 一緒に supports the invitation. The other endings do not form this invitation.",
    "「ませんか」は{丁寧|ていねい}な{誘|さそ}いです。",
    "Would you like to have tea together?",
  ],
  [
    "{机|つくえ}の{上|うえ}に{本|ほん}が（　）。",
    ["います", "します", "あります", "行きます"],
    2,
    "あります expresses the existence of an inanimate object such as a book. います is for people and animals. します means to do; 行きます means to go.",
    "{本|ほん}は{物|もの}なので「あります」です。",
    "There is a book on the desk.",
  ],
  [
    "{教室|きょうしつ}に{学生|がくせい}が（　）。",
    ["あります", "なります", "します", "います"],
    3,
    "います expresses the existence of animate beings such as students. あります is used for inanimate things. The other choices do not state presence.",
    "{学生|がくせい}は{人|ひと}なので「います」です。",
    "There are students in the classroom.",
  ],
  [
    "{日曜日|にちようび}は{学校|がっこう}へ（　）。",
    ["行きません", "行くません", "行きない", "行くない"],
    0,
    "The polite negative of 行きます is 行きません. Replace ます with ません after the stem 行き. The other options mix incompatible forms.",
    "「{行|い}きます」の{否定|ひてい}は「{行|い}きません」です。",
    "I do not go to school on Sunday.",
  ],
  [
    "これはわたし（　）かばんです。",
    ["が", "の", "を", "で"],
    1,
    "の links a possessor to a noun. わたしのかばん means my bag. が, を and で do not express possession in this noun phrase.",
    "「わたしのかばん」は、わたしが{持|も}っているかばんです。",
    "This is my bag.",
  ],
].map(
  ([
    prompt,
    options,
    correctIndex,
    explanation,
    japaneseExplanation,
    translation,
  ]) => ({
    prompt,
    options,
    correctIndex,
    explanation,
    japaneseExplanation,
    translation,
  }),
);
const oldQ = JSON.parse(fs.readFileSync("src/data/quiz-private.json", "utf8"));
const banks = [];
for (const level of ["n5", "n4"]) {
  const qs =
    level === "n5"
      ? n5
      : oldQ
          .slice(0, 10)
          .map((question, i) =>
            i === 7
              ? {
                  ...question,
                  explanation:
                    "Verb ます-stem + すぎる means to do too much. Use its て-form, すぎて, to connect the excessive eating to the following consequence. すぎます, すぎる and すぎた do not supply that linking form.",
                }
              : question,
          );
  banks.push({
    id: id("91", banks.length),
    level,
    subject: "grammar",
    title: `${level.toUpperCase()} grammar · 10 demonstration questions`,
    questions: qs,
  });
  for (const subject of ["vocabulary", "kanji", "reading"]) {
    const term = level === "n5" ? "水" : "予定";
    const reading = level === "n5" ? "みず" : "よてい";
    const samples =
      subject === "vocabulary"
        ? [
            {
              prompt: `「${term}」の{意味|いみ}はどれですか。`,
              options:
                level === "n5"
                  ? ["water", "train", "book", "friend"]
                  : ["weather", "schedule; plan", "company", "meal"],
              correctIndex: level === "n5" ? 0 : 1,
              explanation: `${term} (${reading}) means ${level === "n5" ? "water" : "a schedule or plan"}. Learn it together with a useful example sentence.`,
              japaneseExplanation: `「${term}」は「${reading}」と{読|よ}みます。`,
              translation:
                level === "n5"
                  ? "水を飲みます。 — I drink water."
                  : "予定を確認します。 — I check the schedule.",
            },
          ]
        : subject === "kanji"
          ? [
              {
                prompt:
                  level === "n5"
                    ? "「日曜日」はどう{読|よ}みますか。"
                    : "「会社」はどう{読|よ}みますか。",
                options:
                  level === "n5"
                    ? ["にちようび", "げつようび", "かようび", "すいようび"]
                    : ["がっこう", "かいしゃ", "でんしゃ", "しゃしん"],
                correctIndex: level === "n5" ? 0 : 1,
                explanation:
                  level === "n5"
                    ? "日曜日 is read にちようび and means Sunday. 月曜日 is Monday; 火曜日 is Tuesday; 水曜日 is Wednesday."
                    : "会社 is read かいしゃ and means company. 学校 is school, 電車 is train, and 写真 is photograph.",
                japaneseExplanation:
                  level === "n5"
                    ? "「{日曜日|にちようび}」は{曜日|ようび}の{名前|なまえ}です。"
                    : "「{会社|かいしゃ}」で{働|はたら}いています。",
                translation:
                  level === "n5" ? "It is Sunday." : "I work at a company.",
              },
            ]
          : [
              {
                prompt:
                  level === "n5"
                    ? "{田中|たなか}さんは{七時|しちじ}に{起|お}きて、{八時|はちじ}に{学校|がっこう}へ{行|い}きます。{学校|がっこう}へ{行|い}くのは{何時|なんじ}ですか。"
                    : "{明日|あした}の{会議|かいぎ}は{二時|にじ}からの{予定|よてい}でしたが、{三時|さんじ}に{変|か}わりました。{場所|ばしょ}は{同|おな}じです。{何|なに}が{変|か}わりましたか。",
                options:
                  level === "n5"
                    ? ["六時", "七時", "八時", "九時"]
                    : ["場所", "参加者", "日付", "時間"],
                correctIndex: level === "n5" ? 2 : 3,
                explanation:
                  level === "n5"
                    ? "The passage distinguishes getting up at seven from going to school at eight. The question asks about the school departure, so 八時 is correct."
                    : "The meeting time changes from two to three, while 場所は同じ explicitly says the place stays the same. There is no stated change to the people or date.",
                japaneseExplanation:
                  level === "n5"
                    ? "{学校|がっこう}へ{行|い}くのは{八時|はちじ}です。"
                    : "{二時|にじ}から{三時|さんじ}に{時間|じかん}が{変|か}わりました。",
                translation:
                  level === "n5"
                    ? "Tanaka goes to school at eight."
                    : "The time changed.",
              },
            ];
    banks.push({
      id: id("91", banks.length),
      level,
      subject,
      title: `${level.toUpperCase()} ${subject} · demonstration`,
      questions: samples,
    });
  }
}
let qindex = 0;
for (const bank of banks)
  for (const q of bank.questions) {
    q.id = id("92", qindex);
    q.optionIds = q.options.map((_, i) => id("93", qindex * 4 + i));
    qindex++;
  }
fs.writeFileSync(
  "src/data/study-curriculum.json",
  JSON.stringify(
    {
      lessons,
      cards,
      decks: ["n5", "n4", "n3", "n2", "n1"].map((level, i) => ({
        id: i < 2 ? id("2", i) : id("b2", i),
        level,
        title: `${level.toUpperCase()} vocabulary`,
      })),
      banks,
    },
    null,
    2,
  ) + "\n",
);
