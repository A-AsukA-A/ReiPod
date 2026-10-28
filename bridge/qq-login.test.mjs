import { test, expect } from "vitest";
import { exchangePtloginCredential } from "../node_modules/@yakult-green-tea/qq-music-api/dist-esm/src/services/auth/ptlogin.js";
import { allowedURL } from "./network.mjs";
test("QQ confirmation can exchange all trusted redirect hops without exposing global cookies", async () => {
  const visited = [];
  const state = "fixture-state";
  const fetcher = async (url, options) => {
    expect(allowedURL(url)).toBe(true);
    visited.push(new URL(url).hostname);
    const step = visited.length;
    let response;
    if (step === 1) {
      response = new Response(null, {
        status: 302,
        headers: { location: "https://graph.qq.com/oauth2.0/login_jump" },
      });
      response.headers.getSetCookie = () => [
        "p_uin=fixture-uin; Domain=graph.qq.com; Secure",
        "p_skey=fixture-skey; Domain=graph.qq.com; Secure",
        "pt_oauth_token=fixture-oauth; Domain=graph.qq.com; Secure",
      ];
    } else if (step === 2) response = new Response("ok");
    else if (step === 3) {
      expect(options.headers.cookie).toContain("p_skey=fixture-skey");
      response = new Response(null, {
        status: 302,
        headers: {
          location: `https://y.qq.com/portal/wx_redirect.html?code=${"A".repeat(32)}&state=${state}`,
        },
      });
    } else
      response = Response.json({
        code: 0,
        req: {
          code: 0,
          data: { loginType: 2, musicid: 123, musickey: "fixture-music-key" },
        },
      });
    return response;
  };
  const result = await exchangePtloginCredential(
    "https://ssl.ptlogin2.graph.qq.com/check_sig?fixture=1",
    { fetch: fetcher, state },
  );
  expect(result.musicid).toBe(123);
  expect(visited).toEqual([
    "ssl.ptlogin2.graph.qq.com",
    "graph.qq.com",
    "graph.qq.com",
    "u.y.qq.com",
  ]);
  expect(JSON.stringify(result)).not.toContain("fixture-skey");
});
