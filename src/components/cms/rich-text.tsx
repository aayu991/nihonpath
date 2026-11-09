import { Japanese } from "@/components/learning/japanese";
export type RichBlock = {
  type: "paragraph" | "heading" | "bullet";
  text: string;
};
export function RichText({ blocks }: { blocks: RichBlock[] }) {
  return (
    <div className="cms-rich-preview">
      {blocks.map((b, i) =>
        b.type === "heading" ? (
          <h3 key={i}>
            <Japanese text={b.text} />
          </h3>
        ) : b.type === "bullet" ? (
          <ul key={i}>
            <li>
              <Japanese text={b.text} />
            </li>
          </ul>
        ) : (
          <p key={i}>
            <Japanese text={b.text} />
          </p>
        ),
      )}
    </div>
  );
}
