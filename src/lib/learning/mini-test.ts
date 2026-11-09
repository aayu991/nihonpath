export const miniLevels = ["n5", "n4", "n3", "n2", "n1"] as const;
export type MiniLevel = (typeof miniLevels)[number];
export interface MiniQuestion {
  id: string;
  prompt: string;
  options: string[];
}
export interface MiniFeedback {
  id: string;
  correctIndex: number;
  explanation: string;
  example: string;
}
export interface MiniResult {
  score: number;
  answers: MiniFeedback[];
}
export const miniQuestions: Record<MiniLevel, MiniQuestion[]> = {
  n5: [
    {
      id: "n5-1",
      prompt: "わたしは{毎朝|まいあさ}パン（　）{食|た}べます。",
      options: ["に", "を", "で"],
    },
    {
      id: "n5-2",
      prompt: "きのう{映画|えいが}を（　）。",
      options: ["見ます", "見ません", "見ました"],
    },
    {
      id: "n5-3",
      prompt: "このかばんは（　）です。",
      options: ["高い", "高く", "高くて"],
    },
  ],
  n4: [
    {
      id: "n4-1",
      prompt: "{日本|にほん}へ{行|い}ったことが（　）。",
      options: ["います", "あります", "します"],
    },
    {
      id: "n4-2",
      prompt: "{寝|ね}る{前|まえ}に、{歯|は}を（　）。",
      options: ["磨きましたら", "磨いた", "磨きます"],
    },
    {
      id: "n4-3",
      prompt:
        "{雨|あめ}が{降|ふ}っているので、{傘|かさ}を（　）ほうがいいです。",
      options: ["持っていった", "持っていくの", "持っていき"],
    },
  ],
  n3: [
    {
      id: "n3-1",
      prompt:
        "{毎日|まいにち}{練習|れんしゅう}して、{漢字|かんじ}が{読|よ}める（　）なりました。",
      options: ["ために", "ことに", "ように"],
    },
    {
      id: "n3-2",
      prompt:
        "{天気予報|てんきよほう}によると、{明日|あした}は{雨|あめ}が{降|ふ}る（　）です。",
      options: ["そう", "ため", "ところ"],
    },
    {
      id: "n3-3",
      prompt: "{出|で}かけようとした（　）、{電話|でんわ}が{鳴|な}りました。",
      options: ["ばかり", "ところ", "まま"],
    },
  ],
  n2: [
    {
      id: "n2-1",
      prompt:
        "{試験|しけん}の{結果|けっか}に（　）、{留学|りゅうがく}するつもりです。",
      options: ["かかわらず", "つれて", "応じてから"],
    },
    {
      id: "n2-2",
      prompt:
        "この{制度|せいど}については、{専門家|せんもんか}で（　）{説明|せつめい}できない。",
      options: ["あってもなくても", "あるかぎり", "なければ"],
    },
    {
      id: "n2-3",
      prompt:
        "{努力|どりょく}したからといって、{必|かなら}ず{成功|せいこう}する（　）。",
      options: ["べきだ", "わけではない", "に違いない"],
    },
  ],
  n1: [
    {
      id: "n1-1",
      prompt:
        "{彼|かれ}は{周囲|しゅうい}の{反対|はんたい}を（　）、{計画|けいかく}を{実行|じっこう}した。",
      options: ["もとに", "よそに", "通じて"],
    },
    {
      id: "n1-2",
      prompt:
        "{命|いのち}に（　）{問題|もんだい}だから、{慎重|しんちょう}に{判断|はんだん}すべきだ。",
      options: ["かかわる", "わたる", "基づく"],
    },
    {
      id: "n1-3",
      prompt:
        "その{知|し}らせを{聞|き}いて、{驚|おどろ}きを{禁|きん}じ（　）。",
      options: ["かねない", "ようがない", "得なかった"],
    },
  ],
};
