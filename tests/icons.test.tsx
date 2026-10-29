import { describe, it, expect } from "bun:test";
import { renderToString } from "react-dom/server";
import { EchoIcon, type IconName } from "../src/components/ui/icons";

const allIcons: IconName[] = [
  "board",
  "hours",
  "invoices",
  "directory",
  "settings",
  "logout",
  "timer",
  "show",
  "hide",
  "login",
  "loading",
];

describe("EchoIcon component", () => {
  it("renders all 11 icons without throwing", () => {
    for (const name of allIcons) {
      const html = renderToString(<EchoIcon name={name} />);
      expect(html).toContain("<svg");
      expect(html).toContain('viewBox="0 0 128 128"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('focusable="false"');
    }
  });

  it("isolates instance IDs when multiple instances are rendered", () => {
    const htmlSingle = renderToString(<EchoIcon name="board" />);
    expect(htmlSingle).toContain("<svg");

    const htmlMultiple = renderToString(
      <div>
        <EchoIcon name="board" />
        <EchoIcon name="board" />
      </div>
    );
    // Find all IDs in htmlMultiple
    const idMatches = Array.from(htmlMultiple.matchAll(/id="([^"]+)"/g)).map(m => m[1]);
    const uniqueIds = new Set(idMatches);
    // There should be no duplicate IDs
    expect(uniqueIds.size).toBe(idMatches.length);
    expect(idMatches.length).toBeGreaterThan(0);
  });

  it("provides accessible title when requested", () => {
    const html = renderToString(<EchoIcon name="timer" title="Tempo ativo" />);
    expect(html).toContain('role="img"');
    expect(html).not.toContain('aria-hidden="true"');
    expect(html).toContain("<title");
    expect(html).toContain("Tempo ativo");
  });

  it("respects custom sizes", () => {
    const html17 = renderToString(<EchoIcon name="board" size={17} />);
    expect(html17).toContain('width="17"');
    expect(html17).toContain('height="17"');

    const html32 = renderToString(<EchoIcon name="timer" size={32} />);
    expect(html32).toContain('width="32"');
    expect(html32).toContain('height="32"');
  });
});
