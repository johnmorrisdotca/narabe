---
title: 棋譜を保存し再生する
section: how-to
order: 4
description: 棋譜を保存し再生するの使い方と注意点。
---

## 設定と手を保存する

棋譜は初期設定と手の一覧です。画像や変更中の盤面ではありません。StoredGameのmoveTimeMsがnullなら時計なしです。時間切れの手は、時計を使ったと分かる棋譜だけで再生できます。

```ts
import {replayTimeline,replayGame,type StoredGame} from "@johnmorrisdotca/narabe";
const saved: StoredGame = {size:15,winLength:5,variant:"freestyle",obstacles:"none",opener:"black",moveTimeMs:null,moves:[{row:7,col:7},{row:7,col:8}]};
console.log(replayTimeline(saved).length);
console.log(replayGame(saved).moves.length);
```

## 選択と版を残す

replayMovesには開始方式での選択と時計の情報を渡せます。StoredGameは色の交換の選択を保存しないため、選んだ側が色を保つものとして再生します。その違いが必要なら選択を別に保存します。初期設定、シード、対局した版も残します。

## 途中で止まる再生を見分ける

入力された手が合法に進められないと、再生は止まります。入力と進み具合を比較し、途中の棋譜を完了として扱いません。有効なundoMoveは最後の手の効果を戻しますが、開始方式での色の選択は戻しません。[問題の確認](troubleshooting.md)も参照してください。
