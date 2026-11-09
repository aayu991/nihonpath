"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  Target,
  GraduationCap,
  BriefcaseBusiness,
  Plane,
  School,
  Users,
  BookOpen,
} from "lucide-react";
import { goalKeys, type LearningGoal } from "@/lib/platform/catalog";
import { saveLearningGoals, type GoalsState } from "@/actions/goals";
import { Button } from "@/components/ui/button";
const icons = {
  jft: BookOpen,
  ssw: BriefcaseBusiness,
  workplace: Target,
  jlpt: BookOpen,
  student: GraduationCap,
  future_worker: Target,
  professional: BriefcaseBusiness,
  tourist: Plane,
  teacher: School,
  organization_admin: Users,
};
export function GoalSelector({
  initial,
  disabled = false,
}: {
  initial: LearningGoal[];
  disabled?: boolean;
}) {
  const t = useTranslations("Platform");
  const locale = useLocale();
  const [selected, setSelected] = useState(initial);
  const [state, action, pending] = useActionState(
    saveLearningGoals.bind(null, locale),
    {} as GoalsState,
  );
  return (
    <form action={action} className="goal-form" aria-busy={pending}>
      <fieldset disabled={pending || disabled} aria-describedby="goal-note">
        <legend>{t("goalsTitle")}</legend>
        <p>{t("goalsIntro")}</p>
        <div className="goal-options">
          {goalKeys.map((goal) => {
            const Icon = icons[goal];
            return (
              <label
                className={selected.includes(goal) ? "selected" : ""}
                key={goal}
              >
                <input
                  type="checkbox"
                  name="goals"
                  value={goal}
                  checked={selected.includes(goal)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, goal]
                        : current.filter((g) => g !== goal),
                    )
                  }
                />
                <Icon size={24} aria-hidden="true" />
                <span>{t(`goals.${goal}`)}</span>
                {selected.includes(goal) && (
                  <Check size={18} aria-hidden="true" />
                )}
              </label>
            );
          })}
        </div>
        <p id="goal-note" className="goal-note">
          {t("goalsNote")}
        </p>
        <Button type="submit" disabled={!selected.length}>
          {pending ? t("saving") : t("saveGoals")}
        </Button>
      </fieldset>
      {state.error && (
        <p role="alert" className="form-message error">
          {t(state.error)}
        </p>
      )}
    </form>
  );
}
