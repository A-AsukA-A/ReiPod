import test from 'node:test';
import assert from 'node:assert/strict';
import { compatiblePlayback, installQQPlaybackCompat, probeMP3 } from './qq-playback-compat.mjs';
import { createRequire } from 'node:module';
const mid = '0010qJ2f1f8uRj', media = '001234567890ab';
const auth = { device: {}, credential: { str_musicid: '123', secret: 'private' } };
const failed = () => ({ [mid]: { url: '', restriction: { key: 'url_unavailable', codes: { result: 104003, subcode: 1 } } } });
test('same-account same-track RPC retry requires a grant and a readable MP3', async () => {
  const calls=[];
  const fn=compatiblePlayback(async()=>failed(),async(...args)=>{
    calls.push(args);assert.equal(args[6],auth.credential);
    return args[4]==='get_song_detail_yqq' ? {track_info:{mid,file:{media_mid:media}}} : {sip:['https://isure.stream.qqmusic.qq.com/'],midurlinfo:[{songmid:mid,result:0,purl:`M500${media}.mp3?vkey=private`}]};
  },async url=>url.startsWith('https://isure.stream.qqmusic.qq.com/M500'));
  const result=await fn({},auth,{},mid,128);
  assert.ok(result[mid].url);assert.equal(calls[1][3],'music.vkey.GetEVkey');assert.equal(calls[1][4],'CgiGetEVkey');
  assert.deepEqual(calls[1][5].filename,[`M500${media}.mp3`]);
  assert.deepEqual(calls[1][7],{ct:24,cv:0,format:'json',uin:'123'});
});
test('denial, mismatched song, foreign CDN and unreadable audio preserve restriction',async()=>{
  for(const mode of ['denied','mismatch','foreign','unreadable','exception']) {
    const first=failed();
    const fn=compatiblePlayback(async()=>first,async(...args)=>{
      if(mode==='exception')throw Error('failed');
      if(args[4]==='get_song_detail_yqq')return {track_info:{mid,file:{media_mid:media}}};
      return {sip:[mode==='foreign'?'https://evil.test/':'https://isure.stream.qqmusic.qq.com/'],midurlinfo:[{songmid:mode==='mismatch'?'other':mid,result:mode==='denied'?104003:0,purl:`M500${media}.mp3`}]};
    },async()=>mode!=='unreadable');
    assert.deepEqual(await fn({},auth,{},mid,128),failed());
  }
});
test('successful playback, other failures and previews never try the candidate',async()=>{
 for(const [result,options] of [[{[mid]:{url:'https://original'}},{}],[{[mid]:{restriction:{codes:{result:1}}}},{}],[failed(),{preview:true}]]) {
  let calls=0; const fn=compatiblePlayback(async()=>result,()=>{calls++;throw Error('must not call');});
  assert.equal(await fn({},auth,{},mid,128,undefined,options),result);assert.equal(calls,0);
 }
});
test('pinned CommonJS serverless graph accepts the compatibility hook',()=>{
 const require=createRequire(import.meta.url);installQQPlaybackCompat(require);
 assert.equal(typeof require('@yakult-green-tea/qq-music-api/serverless').handleRequest,'function');
});

test('MP3 probe rejects HTML, encrypted/unrecognized bytes and redirects', async () => {
 const previous=globalThis.fetch;
 try {
  for(const [bytes,status,expected] of [[[73,68,51,0],206,true],[[255,251,0],206,true],[[60,104,116],200,false],[[81,77,67],206,false],[[73,68,51],403,false]]) {
   globalThis.fetch=async (_url,options)=>{assert.equal(options.redirect,'error');assert.equal(options.headers.Range,'bytes=0-4095');return new Response(new Uint8Array(bytes),{status});};
   assert.equal(await probeMP3('https://isure.stream.qqmusic.qq.com/test'),expected);
  }
 } finally {globalThis.fetch=previous;}
});

test('candidate web comm preserves the same auth credential in the real protocol serializer',async()=>{
 const require=createRequire(import.meta.url);
 const {dirname,join}=await import('node:path');
 const root=dirname(require.resolve('@yakult-green-tea/qq-music-api/package.json'));
 const {callMusicu}=require(join(root,'dist/src/services/auth/musicuProtocol.js'));
 const credential={musicid:123,str_musicid:'123',musickey:'PRIVATE',loginType:2};
 const http={post:async(_url,body)=>{
  assert.equal(body.comm.ct,24);assert.equal(body.comm.cv,0);assert.equal(body.comm.uin,'123');
  assert.equal(body.comm.authst,'PRIVATE');assert.equal(body.comm.tmeLoginType,2);
  return {status:200,data:{code:0,req_0:{code:0,data:{midurlinfo:[]}}}};
 }};
 await callMusicu(http,{},'test','music.vkey.GetEVkey','CgiGetEVkey',{},credential,{ct:24,cv:0,format:'json',uin:'123'});
});
