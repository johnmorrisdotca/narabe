import { describe, expect, it } from "vitest";
import { parseEmbedMoves } from "./element.ts";
describe("embed record validation", () => {
 it("keeps complete piece, slide, twist and pass data, dropping unrelated fields", () => {
  const moves=[{row:1,col:2,from:{row:3,col:4},kind:"move",extra:"ignored"},{row:0,col:0,cells:[{row:0,col:0,stone:"black"}]},{row:2,col:2,twist:{quadrant:1,clockwise:false}},{row:-1,col:-1,kind:"pass"}];
  const {extra: _extra,...first}=moves[0]!;void _extra;
  expect(parseEmbedMoves(JSON.stringify(moves))).toEqual([first,...moves.slice(1)]);
 });
 it("rejects malformed arrays, unsafe coordinates and malformed nested move data", () => {
  for(const value of["{}","[null]",'["text"]','[{"row":999,"col":0}]','[{"row":0,"col":0,"kind":"unknown"}]','[{"row":0,"col":0,"cells":[{"row":0,"col":0}]}]','[{"row":0,"col":0,"twist":null}]',JSON.stringify(Array.from({length:1001},()=>({row:0,col:0})))])expect(parseEmbedMoves(value)).toBeNull();
 });
 it("accepts an empty record and imports on a server without defining a tag",()=>{expect(parseEmbedMoves(null)).toEqual([]);expect(parseEmbedMoves("")).toEqual([]);});
});
