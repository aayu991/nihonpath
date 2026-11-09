import { getTranslations } from "next-intl/server";
import { confirmEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
export default async function Confirm({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { locale } = await params;
  const { token_hash, type } = await searchParams;
  const t = await getTranslations("Study");
  return (
    <section className="container preview-page">
      <h1>{t("confirmEmail")}</h1>
      <p>{t("confirmEmailText")}</p>
      {token_hash && ["signup", "recovery"].includes(type ?? "") ? (
        <form
          action={confirmEmail.bind(null, locale)}
          className="preview-actions"
        >
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <Button>{t("continue")}</Button>
        </form>
      ) : (
        <p role="alert">{t("invalidLink")}</p>
      )}
    </section>
  );
}
