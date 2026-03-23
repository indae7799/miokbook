const HEADING_RE = /^(제\d+조|부칙|사업자 정보)/;

export default function PolicyRenderer({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="mt-6 space-y-4 text-sm leading-7 text-gray-700">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split('\n');
        const firstLine = lines[0];

        if (HEADING_RE.test(firstLine)) {
          return (
            <div key={i} className="pt-2">
              <h2 className="mb-1.5 text-sm font-semibold text-gray-900">{firstLine}</h2>
              {lines.slice(1).map((line, j) =>
                line.trim() ? (
                  <p key={j} className="break-keep">
                    {line}
                  </p>
                ) : null,
              )}
            </div>
          );
        }

        return (
          <p key={i} className="break-keep">
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
