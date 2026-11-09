import { describe, expect, it } from "vitest";
import {
  videoGameJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  webApplicationJsonLd,
  breadcrumbJsonLd,
} from "./structured-data";

describe("structured-data", () => {
  describe("videoGameJsonLd", () => {
    it("generates Schema.org compliant VideoGame and SoftwareApplication markup", () => {
      const data = videoGameJsonLd({
        name: "도트 낚시",
        description: "평화로운 바다에서 도트 물고기를 낚는 힐링 아케이드",
        url: "https://game.oiyo.net/ko/dot-fishing/",
        image: "https://game.oiyo.net/games/dot-fishing-social.png",
        inLanguage: "ko",
      });

      expect(data["@context"]).toBe("https://schema.org");
      expect(data["@type"]).toEqual(["VideoGame", "SoftwareApplication"]);
      expect(data.name).toBe("도트 낚시");
      expect(data.description).toContain("평화로운 바다");
      expect(data.url).toBe("https://game.oiyo.net/ko/dot-fishing/");
      expect(data.image).toBe("https://game.oiyo.net/games/dot-fishing-social.png");
      expect(data.inLanguage).toBe("ko");
      expect(data.applicationCategory).toBe("GameApplication");
      expect(data.operatingSystem).toBe("Any");
      expect(data.gamePlatform).toEqual(["Web browser", "PC", "Mobile"]);
      expect(data.playMode).toBe("SinglePlayer");
      expect(data.isAccessibleForFree).toBe(true);
      expect(data.offers).toEqual({
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        category: "Free",
      });
      expect(data.publisher).toEqual({
        "@type": "Organization",
        "@id": "https://oiyo.net/#organization",
        name: "OIYO Arcade",
        url: "https://oiyo.net",
      });
    });

    it("supports custom genres and play modes", () => {
      const data = videoGameJsonLd({
        name: "Chess",
        description: "Classic board game",
        url: "https://game.oiyo.net/en/chess/",
        genre: "Board Game",
        playMode: "MultiPlayer",
      });

      expect(data.genre).toBe("Board Game");
      expect(data.playMode).toBe("MultiPlayer");
    });
  });

  describe("faqPageJsonLd", () => {
    it("generates FAQPage schema from items", () => {
      const data = faqPageJsonLd([
        { question: "무료인가요?", answer: "네, 100% 무료입니다." },
      ]);

      expect(data["@type"]).toBe("FAQPage");
      expect(data.mainEntity).toHaveLength(1);
      expect(data.mainEntity[0].name).toBe("무료인가요?");
      expect(data.mainEntity[0].acceptedAnswer.text).toBe("네, 100% 무료입니다.");
    });
  });

  describe("howToJsonLd", () => {
    it("generates HowTo schema with numbered steps", () => {
      const data = howToJsonLd("게임 방법", "설명", ["1단계", "2단계"]);
      expect(data["@type"]).toBe("HowTo");
      expect(data.step).toHaveLength(2);
      expect(data.step[0].position).toBe(1);
      expect(data.step[0].text).toBe("1단계");
    });
  });

  describe("webApplicationJsonLd", () => {
    it("generates WebApplication schema", () => {
      const data = webApplicationJsonLd({
        name: "도구",
        description: "유용한 웹 도구",
      });
      expect(data["@type"]).toBe("WebApplication");
      expect(data.operatingSystem).toBe("All");
      expect(data.offers.price).toBe("0");
    });
  });

  describe("breadcrumbJsonLd", () => {
    it("generates BreadcrumbList with items", () => {
      const data = breadcrumbJsonLd([
        { name: "Home", url: "https://game.oiyo.net/" },
        { name: "Chess", url: "https://game.oiyo.net/ko/chess/" },
      ]);
      expect(data["@type"]).toBe("BreadcrumbList");
      expect(data.itemListElement).toHaveLength(2);
      expect(data.itemListElement[0].position).toBe(1);
    });
  });
});
