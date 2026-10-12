---
title: 問題の確認とFAQ
section: troubleshooting
order: 9
description: 問題の確認とFAQの使い方と注意点。
---

## 手を打っても変わらない

終了、盤外、石のある位置、禁じ手、開始方式、回転待ち、強制パス、連続取りを確認します。各操作の戻り値を保存します。落下ゲームは着地点へ変換され、移動やキューの駒には別の操作があります。合法な候補はエンジンに問い合わせます。

## nullの意味

turnChoicesは囲碁など一覧のない段階、forbiddenReasonは禁じ手の形がないこと、lastMoveは記録した位置がないこと、skipTargetは空きがないことを表します。queuedPieceはキューなし、campOfとstarCampOfは陣地外、サイズの関数は一覧の端、dropTargetは列が埋まっていることです。長さの関数は上限を説明します。applyGoMoveのnullは自殺手で、盤のセルのnullは空きです。

## 埋め込みの盤が空白

parseEmbedMovesのnullはJSON、形、範囲が不正なことを表します。配列が読めても合法な再生が必要です。正常な配置前や不正な設定ではstateがnullです。コンソール、ゲーム名、棋譜、盤の大きさを確認します。ホスト用optionsは構造化した値です。フレームではURLで表せる設定を使います。

## 棋譜が途中で止まる

時間切れの手には時計の情報が必要です。必要な開始方式の選択も別に残します。入力と再生を比較し、初期設定とパッケージの版を確認します。[棋譜](save-and-replay.md)、[埋め込み仕様](../../embeds.md)、[API](entry:main)を参照してください。
