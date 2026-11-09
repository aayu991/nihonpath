"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Japanese } from "@/components/learning/japanese";
import { Button } from "@/components/ui/button";
const replies = [
  "はい、よろしくお{願|ねが}いします。",
  "おやすみなさい。",
  "ごちそうさまでした。",
];
export function ConversationPreview() {
  const t = useTranslations("HomePractice");
  const [translation, setTranslation] = useState(false);
  const [reply, setReply] = useState<number | null>(null);
  return (
    <section className="section container" aria-labelledby="conversation-title">
      <div className="conversation-panel">
        <div>
          <p className="eyebrow">{t("conversationEyebrow")}</p>
          <h2 id="conversation-title">{t("conversationTitle")}</h2>
          <p>{t("conversationIntro")}</p>
          <Button
            variant="outline"
            aria-expanded={translation}
            aria-controls="dialogue-translation"
            onClick={() => setTranslation(!translation)}
          >
            {t(translation ? "hideTranslation" : "showTranslation")}
          </Button>
          <div id="dialogue-translation" hidden={!translation} lang="en">
            <p>A: Good morning. I’m Tanaka. Nice to meet you.</p>
            <p>B: I’m Sato. Nice to meet you, too.</p>
            <p>A: Shall we go to the meeting room together?</p>
          </div>
        </div>
        <div>
          <div className="dialogue">
            <p className="japanese-sentence">
              <span>A</span>
              <Japanese text="おはようございます。{田中|たなか}です。よろしくお{願|ねが}いします。" />
            </p>
            <p className="japanese-sentence">
              <span>B</span>
              <Japanese text="{佐藤|さとう}です。こちらこそ、よろしくお{願|ねが}いします。" />
            </p>
            <p className="japanese-sentence">
              <span>A</span>
              <Japanese text="{一緒|いっしょ}に{会議室|かいぎしつ}へ{行|い}きましょうか。" />
            </p>
          </div>
          <fieldset className="conversation-replies">
            <legend>{t("chooseReply")}</legend>
            {replies.map((text, i) => (
              <label className={reply === i ? "selected" : ""} key={text}>
                <input
                  type="radio"
                  name="conversation-reply"
                  checked={reply === i}
                  onChange={() => setReply(i)}
                />
                <Japanese text={text} />
              </label>
            ))}
          </fieldset>
          {reply !== null && (
            <p className="dialogue-feedback" role="status">
              {t(`reply${reply}`)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
