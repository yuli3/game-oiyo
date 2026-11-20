import { describe, expect, it } from "vitest";
import { unityEditionLabel } from "./UnityEditionLabel";

describe("unityEditionLabel", () => {
  it("follows the BCP47 page language and never leaks Korean into other locales", () => {
    expect(unityEditionLabel("ko-KR")).toBe("3D 버전으로 플레이");
    expect(unityEditionLabel("zh-CN")).toBe("玩 3D 版");
    for (const lang of ["en", "ja-JP", "zh-CN", "fr-FR", "es-ES", "de", undefined]) {
      expect(unityEditionLabel(lang)).not.toMatch(/[가-힣]/);
    }
  });
});
