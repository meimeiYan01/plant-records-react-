import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

/**
 * Markdown渲染组件
 * 支持基本的markdown语法渲染，并适配暗色主题
 * 支持语法：
 * - **加粗** / __加粗__
 * - ==高亮==
 * - *斜体* / _斜体_
 * - ~~删除线~~
 * - 表格
 * - 任务列表
 * - 等等
 */
export function MarkdownRenderer({ content, className = "" }) {
  if (!content || typeof content !== "string") return null;

  // 预处理：将==高亮==转换为HTML标记
  // 使用正则表达式匹配==text==，但要避免匹配已经处理过的
  // 注意：需要转义特殊字符，避免与Markdown语法冲突
  const processedContent = content.replace(/==([^=\n]+?)==/g, (match, text) => {
    // 转义HTML特殊字符
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 px-1 rounded">${escapedText}</mark>`;
  });

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // 自定义渲染组件以适配暗色主题
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-4 mb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-3 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 leading-relaxed" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 mb-2 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside text-sm text-zinc-700 dark:text-zinc-300 mb-2 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-sm text-zinc-700 dark:text-zinc-300" {...props} />
          ),
          code: ({ node, inline, ...props }) =>
            inline ? (
              <code
                className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                {...props}
              />
            ) : (
              <code
                className="block p-3 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-mono overflow-x-auto mb-2"
                {...props}
              />
            ),
          pre: ({ node, ...props }) => (
            <pre className="mb-2" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-3 py-1 my-2 text-sm text-zinc-600 dark:text-zinc-400 italic"
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-zinc-200 dark:border-zinc-700 my-3" {...props} />
          ),
          img: ({ node, ...props }) => (
            <img className="max-w-full rounded-lg my-2" {...props} />
          ),
          // 支持删除线
          del: ({ node, ...props }) => (
            <del className="line-through text-zinc-500 dark:text-zinc-400" {...props} />
          ),
          // 支持表格
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-zinc-200 dark:border-zinc-700" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-zinc-100 dark:bg-zinc-700" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="border-b border-zinc-200 dark:border-zinc-700" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300" {...props} />
          ),
          // 支持任务列表
          input: ({ node, checked, ...props }) => (
            <input
              type="checkbox"
              checked={checked}
              disabled
              className="mr-2 accent-zinc-900 dark:accent-zinc-100"
              {...props}
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

