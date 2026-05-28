import { marked } from "marked";
import DOMPurify from "dompurify";

const renderer = new marked.Renderer();

// Override link renderer to open in new tab and add rel attributes
renderer.link = ({ href, title, text }) => {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

export function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "del",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "a",
      "hr",
      "sup",
      "sub",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
  });
}
