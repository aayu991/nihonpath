import { Fragment } from "react";
export function Japanese({ text }: { text: string }) {
  const pieces = text.split(/(\{[^{}]+\|[^{}]+\})/g);
  return (
    <span lang="ja">
      {pieces.map((piece, i) => {
        const match = /^\{([^|]+)\|([^}]+)\}$/.exec(piece);
        return match ? (
          <ruby key={i}>
            {match[1]}
            <rp>（</rp>
            <rt>{match[2]}</rt>
            <rp>）</rp>
          </ruby>
        ) : (
          <Fragment key={i}>{piece}</Fragment>
        );
      })}
    </span>
  );
}
