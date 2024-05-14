import type MarkdownIt from "markdown-it";
import Prism from "prismjs";

interface Options extends MarkdownIt.Options {
	codeToolbar?: (
		content: string,
		langName: string,
		langAttrs: string,
	) => string;
}

const DEFAULT_LANGUAGE = {
	copy: "Copy",
	copied: "Copied!",
};

let currentLanguage = DEFAULT_LANGUAGE;

function t(key: keyof typeof DEFAULT_LANGUAGE) {
	return currentLanguage[key];
}

export default function markDownItCodeSection(md: MarkdownIt) {
	const { unescapeAll } = md.utils;
	bindCopy();

	// md.renderer.rules.html_inline = (tokens: MarkdownIt.Token[], idx: number) => {
	//   return escapeHtml(tokens[idx].content.trim())
	// }
	// md.renderer.rules.html_block = (tokens: MarkdownIt.Token[], idx: number) => {
	//   return `${escapeHtml(tokens[idx].content.trim())}<br />`
	// }

	md.renderer.rules.fence = (
		tokens: MarkdownIt.Token[],
		idx: number,
		options: Options,
		env,
		slf,
	) => {
		const token = tokens[idx];
		const info = token.info ? unescapeAll(token.info).trim() : "";
		let content = (token.content || "").trim();
		let langName = "";
		let langAttrs = "";

		if (info) {
			const arr = info.split(/(\s+)/g);
			langName = { vue: "html", htm: "html" }[arr[0]] || arr[0] || "txt";
			langAttrs = arr.slice(2).join("");
		}

		content = Prism.languages[langName]
			? Prism.highlight(content, Prism.languages[langName], langName)
			: content;

		let toolbarHtml = `<span>${langName}</span>`;
		if (options.codeToolbar) {
			toolbarHtml =
				options.codeToolbar(token.content, langName, langAttrs) || toolbarHtml;
		}

		// If language exists, inject class gently, without modifying original token.
		// May be, one day we will add .deepClone() for token and simplify this part, but
		// now we prefer to keep things local.
		let tmpToken: Partial<MarkdownIt.Token> = {};
		if (info) {
			const i = token.attrIndex("class");
			const tmpAttrs: any[] = token.attrs ? token.attrs.slice() : [];

			if (i < 0) {
				tmpAttrs.push(["class", options.langPrefix + langName]);
			} else {
				tmpAttrs[i] = tmpAttrs[i].slice();
				tmpAttrs[i][1] += ` ${options.langPrefix}${langName}`;
			}

			// Fake token just to render attributes
			tmpToken = {
				attrs: tmpAttrs,
			};
		}

		return `<div class="md-code-section__container">
  <div class="md-code-section__languagebar">
    ${toolbarHtml}
    <span class="md-code-section__copy">
      <span>
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
          <path fill="currentColor" d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z"/>
        </svg>
        ${currentLanguage.copy}
      </span>
      <span class="md-code-section__copy-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7L10 17l-5-5"/>
        </svg>
        ${currentLanguage.copied}
      </span>
    </span>
  </div>
  <pre class="md-code-section__code language-${langName}" ${slf.renderAttrs(
		tmpToken as any,
	)}><code>${content}</code></pre>
</div>`.trim();
	};
}

markDownItCodeSection.setLanguage = (lang: typeof DEFAULT_LANGUAGE) => {
	currentLanguage = lang;
};

function bindCopy() {
	if (typeof document === "undefined") return;
	try {
		document.addEventListener("click", (e) => {
			const target = (e.target as HTMLElement).closest(
				".md-code-section__copy",
			);
			if (target) {
				const code =
					target.parentElement?.nextElementSibling?.querySelector("code");
				if (code?.textContent) {
					navigator.clipboard.writeText?.(code.textContent);
					target.classList.add("success");
					setTimeout(() => target.classList.remove("success"), 1000);
				}
			}
		});
	} catch (error) {
		console.error(error);
	}
}
