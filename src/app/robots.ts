import type { MetadataRoute } from "next";

// 검색 엔진에는 첫 화면만 보이게 하고, 문제·대회·순위·관리·설정 화면과 API는 긁어 가지 않게 한다.
// robots.txt는 지키는 크롤러에게만 통하는 약속이다. 실제로 데이터를 막는 것은 Supabase의 RLS다.
// 이미 검색 결과에 올라간 주소는 이 파일로 지워지지 않는다(검색 엔진 관리 도구에서 삭제 요청).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/problems", "/contests", "/leaderboard", "/admin", "/settings", "/api/"],
    },
  };
}
