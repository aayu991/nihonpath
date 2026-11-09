import "server-only";
import type { MiniLevel, MiniFeedback } from "./mini-test";
// Editorial source: original samples, not official JLPT items. Keys stay server-side.
export const miniKeys: Record<MiniLevel, Omit<MiniFeedback, "id">[]> = {
  n5: [
    {
      correctIndex: 1,
      explanation:
        "を marks the direct object of an action. Here, bread is what the speaker eats. に and で do not mark that object.",
      example: "パンを{食|た}べます。",
    },
    {
      correctIndex: 2,
      explanation:
        "きのう means yesterday, so the completed action takes the polite past form 見ました. 見ます is non-past; 見ません is negative non-past.",
      example: "きのう{映画|えいが}を{見|み}ました。",
    },
    {
      correctIndex: 0,
      explanation:
        "An い-adjective keeps its final い before です in an affirmative non-past sentence. 高く is an adverbial form; 高くて connects to another clause.",
      example: "このかばんは{高|たか}いです。",
    },
  ],
  n4: [
    {
      correctIndex: 1,
      explanation:
        "Verb past plain form + ことがある describes an experience. 行ったことがあります means 'I have been.' います is used for animate existence, not this pattern.",
      example: "{日本|にほん}へ{行|い}ったことがあります。",
    },
    {
      correctIndex: 2,
      explanation:
        "The main verb 磨きます states the routine action. 寝る前に means 'before going to bed'; 前に follows the dictionary form 寝る.",
      example: "{寝|ね}る{前|まえ}に、{歯|は}を{磨|みが}きます。",
    },
    {
      correctIndex: 0,
      explanation:
        "For positive advice, use a verb's た-form + ほうがいい: 持っていったほうがいい means 'you should take it.' The past form is part of the advice pattern here.",
      example: "{傘|かさ}を{持|も}っていったほうがいいです。",
    },
  ],
  n3: [
    {
      correctIndex: 2,
      explanation:
        "Potential verb + ようになる expresses acquiring an ability. 読めるようになりました means 'became able to read.' ことになる describes a decision or arrangement instead.",
      example: "{漢字|かんじ}が{読|よ}めるようになりました。",
    },
    {
      correctIndex: 0,
      explanation:
        "Plain form + そうだ reports information heard from another source. The forecast is the source, and 降るそうです means 'they say it will rain.'",
      example: "{明日|あした}は{雨|あめ}が{降|ふ}るそうです。",
    },
    {
      correctIndex: 1,
      explanation:
        "Volitional form + としたところ describes the moment when one was about to do something. The phone rang just as the speaker was about to leave.",
      example: "{出|で}かけようとしたところ、{電話|でんわ}が{鳴|な}りました。",
    },
  ],
  n2: [
    {
      correctIndex: 0,
      explanation:
        "Noun + にかかわらず means 'regardless of.' The speaker plans to study abroad whatever the exam result is. につれて expresses a change accompanying another change.",
      example: "{結果|けっか}にかかわらず、{留学|りゅうがく}します。",
    },
    {
      correctIndex: 2,
      explanation:
        "Noun + でなければ + negative predicate means 'unless one is ...'. Here only an expert can explain the system. であるかぎり means 'as long as one is' and does not fit this meaning.",
      example: "{専門家|せんもんか}でなければ{説明|せつめい}できない。",
    },
    {
      correctIndex: 1,
      explanation:
        "からといって ... わけではない rejects an automatic conclusion. Making an effort does not necessarily mean success is guaranteed. べきだ expresses duty, and に違いない strong certainty.",
      example: "{必|かなら}ず{成功|せいこう}するわけではない。",
    },
  ],
  n1: [
    {
      correctIndex: 1,
      explanation:
        "Noun + をよそに means acting without regard to a surrounding concern or reaction. He carried out the plan despite others' opposition. をもとに means 'based on.'",
      example:
        "{反対|はんたい}をよそに、{計画|けいかく}を{実行|じっこう}した。",
    },
    {
      correctIndex: 0,
      explanation:
        "命にかかわる describes something affecting life itself, often a life-threatening matter. にわたる describes a span or extent; に基づく means 'based on.'",
      example: "{命|いのち}にかかわる{問題|もんだい}です。",
    },
    {
      correctIndex: 2,
      explanation:
        "Noun + を禁じ得ない is a formal expression meaning 'cannot suppress' a feeling. The past negative 得なかった makes it 'could not suppress my surprise.'",
      example: "{驚|おどろ}きを{禁|きん}じ{得|え}なかった。",
    },
  ],
};
