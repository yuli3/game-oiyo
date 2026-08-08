import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Puzzle15 from "./Puzzle15";

describe("Puzzle15 SSR hydration contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders the same initial board when server and client randomness differ", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const serverHtml = renderToString(<Puzzle15 locale="ko" />);

    vi.mocked(Math.random).mockReturnValue(0.9);
    const clientHtml = renderToString(<Puzzle15 locale="ko" />);

    expect(clientHtml).toBe(serverHtml);
  });
});
