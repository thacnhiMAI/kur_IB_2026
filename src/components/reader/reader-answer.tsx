import "katex/dist/katex.min.css";

import { isValidElement, useState, type ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import { ReaderDiagram } from "./reader-diagram";

function normalizeMath(content: string) {
  // Preserve code examples while accepting delimiters also used by older model replies.
  return content.split(/(```[\s\S]*?(?:```|$)|`[^`\n]+`)/g).map((part, i) => i % 2 ? part : part
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expression: string) => "\n\n$$\n" + expression.trim() + "\n$$\n\n")
    .replace(/\\\(([^\n]*?)\\\)/g, (_, expression: string) => "$" + expression.trim() + "$")
    .replace(/^[ \t]*\$[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\$[ \t]*$/gm,
      (_, expression: string) => "$$\n" + expression.trim() + "\n$$")
  ).join("");
}

function AnswerImage({ src, alt }: { src?: string; alt?: string }) {
  const [loaded, setLoaded] = useState(false);
  if (!src || !/^https:\/\//i.test(src)) return alt ? <span>{alt}</span> : null;
  return loaded
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="reader-ai-answer-image" src={src} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" />
    : <button type="button" className="reader-ai-load-image" onClick={() => setLoaded(true)}>{alt || "Изображение"} · Показать</button>;
}

export function ReaderAnswer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        table: ({ node: _node, ...props }) => <div className="reader-ai-table"><table {...props} /></div>,
        img: ({ src, alt }) => <AnswerImage key={typeof src === "string" ? src : ""} src={typeof src === "string" ? src : undefined} alt={alt} />,
        pre: ({ node: _node, children, ...props }) => {
          if (isValidElement(children)) {
            const code = children as ReactElement<{ className?: string; children?: unknown }>;
            if (code.props.className === "language-mermaid" && typeof code.props.children === "string") {
              return <ReaderDiagram source={code.props.children.trim()} />;
            }
          }
          return <pre {...props}>{children}</pre>;
        }
      }}
      rehypePlugins={[[rehypeKatex, { trust: false }]]}
    >
      {normalizeMath(content)}
    </ReactMarkdown>
  );
}
