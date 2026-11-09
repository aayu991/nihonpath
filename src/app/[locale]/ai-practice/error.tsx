"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="container section-space">
      <h1>Conversation practice unavailable / 会話練習を利用できません</h1>
      <Button onClick={reset}>Try again / 再試行</Button>
    </section>
  );
}
