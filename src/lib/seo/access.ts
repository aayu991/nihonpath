export function privateSeoPath(path: string) {
  return (
    /^\/(en|ja|ne|hi)\/(admin|dashboard|billing|checkout|tutor|organization|onboarding|login|register|forgot-password|reset-password|auth|legal)(\/|$)/.test(
      path,
    ) ||
    /^\/(en|ja|ne|hi)\/(organizations\/(register|onboarding)|tutors\/[^/]+\/book|exams\/[^/]+)(\/|$)/.test(
      path,
    )
  );
}
