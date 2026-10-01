// The demo's own names and one-line rules for each game. The engine has none:
// names and rules text belong to whichever app shows the games.

export const GROUPS = [
  {
    name: "Five in a row",
    nameJa: "五目並べ",
    games: [
      { key: "freestyle", name: "Gomoku", kanji: "五目並べ", rule: "Five or more in a row wins.", ruleJa: "5つ以上を縦・横・斜めに並べたら勝ちです。" },
      { key: "standard", name: "Tournament Gomoku", kanji: "競技五目", rule: "Exactly five wins. Six or more does not.", ruleJa: "ちょうど5つで勝ち。6つ以上は勝ちになりません。" },
      { key: "renju", name: "Renju", kanji: "連珠", rule: "Black may not make a double three, a double four or an overline. White may.", ruleJa: "黒は三三、四四、長連（6つ以上）が禁じ手です。白は打てます。" },
      { key: "omok", name: "Omok", kanji: "오목", rule: "The double three is forbidden for both sides. Overlines win.", ruleJa: "三三は両者の禁じ手です。長連は勝ちになります。" },
      { key: "caro", name: "Caro", kanji: "Cờ ca-rô", rule: "Exactly five wins, and only if it is not shut in at both ends.", ruleJa: "ちょうど5つで勝ち。ただし両端がふさがれていないときだけです。" },
      { key: "connect6", name: "Connect6", kanji: "六子棋", rule: "Two stones a turn. Six in a row wins.", ruleJa: "1手に2つ置きます。6つ並べたら勝ちです。" },
      { key: "misereFive", name: "Misère Five", kanji: "負け五目", rule: "Five in a row loses. Make your opponent complete it.", ruleJa: "5つ並べると負けです。相手に並べさせましょう。" },
      { key: "hexFive", name: "Hex Five", kanji: "六角五目", rule: "Five in a row on a hexagon of hexagons: six neighbours a cell, three ways to line them up.", ruleJa: "六角形に並んだ六角形の盤で5つ並べます。となりは6つあり、並べ方は3方向です。" },
    ],
  },
  {
    name: "Captures",
    nameJa: "取り",
    games: [
      { key: "ninuki", name: "Ninuki-renju", kanji: "二抜き連珠", rule: "Five in a row wins. So does capturing five pairs.", ruleJa: "5つ並べるか、5組の石をはさんで取ると勝ちです。" },
      { key: "sannuki", name: "Sannuki-renju", kanji: "三抜き連珠", rule: "The capture game where a flank takes a pair or a triple. Fifteen stones win.", ruleJa: "2つでも3つでも、はさんで取れる連珠です。15個取れば勝ちです。" },
    ],
  },
  {
    name: "Drops",
    nameJa: "落とし",
    games: [
      { key: "dropFour", name: "Drop Four", kanji: "落とし四目", rule: "Stones fall to the bottom of their column. Four in a row wins.", ruleJa: "石は列の底まで落ちます。4つ並べたら勝ちです。" },
      { key: "ringDrop", name: "Ring Drop", kanji: "輪落とし", rule: "Drop Four on a cylinder: the left and right edges join.", ruleJa: "筒の形の落とし四目。左右の端がつながっています。" },
      { key: "holeDrop", name: "Hole Drop", kanji: "穴落とし", rule: "One square is dead: nothing can land on it or count through it.", ruleJa: "1か所は穴です。石は乗らず、並びも数えません。" },
      { key: "hotDrop", name: "Hot Drop", kanji: "熱点落とし", rule: "A hotspot counts as either colour, and a hole counts as nothing.", ruleJa: "熱点はどちらの色にも数えられ、穴は何にも数えられません。" },
      { key: "clearDrop", name: "Clear Drop", kanji: "消し落とし", rule: "A full bottom row vanishes and everything drops a row.", ruleJa: "いちばん下の段がそろうと消え、すべてが1段落ちます。" },
      { key: "giveawayDrop", name: "Giveaway Drop", kanji: "譲り落とし", rule: "Making four loses. Force your opponent into it.", ruleJa: "4つ並べると負けです。相手に並べさせましょう。" },
      { key: "edgeDrop", name: "Edge Drop", kanji: "縁寄せ", rule: "Gravity from all four edges: a stone must rest on something.", ruleJa: "重力が四方の縁から働きます。石は何かに寄りかかって止まります。" },
      { key: "wormDrop", name: "Wormhole Drop", kanji: "穴通し落とし", rule: "Two squares are joined: a line entering one comes out of the other.", ruleJa: "2か所がつながっています。入った線は、もう一方から出てきます。" },
    ],
  },
  {
    name: "Small boards",
    nameJa: "小さな盤",
    games: [
      { key: "tictactoe", name: "Tic-tac-toe", kanji: "三目並べ", rule: "Three in a row on a 3×3 board.", ruleJa: "3×3の盤で3つ並べます。" },
      { key: "wildTicTacToe", name: "Wild Tic-tac-toe", kanji: "自由三目", rule: "Place either mark. Three in a row of either wins for whoever makes it.", ruleJa: "どちらの印も置けます。3つ並べた人が勝ちです。" },
      { key: "notakto", name: "Notakto", kanji: "黒だけ三目", rule: "Only black stones. Whoever makes three in a row loses.", ruleJa: "黒の石だけを使います。3つ並べた人が負けです。" },
      { key: "trapThree", name: "Trap Three", kanji: "罠三", rule: "Four in a row wins. Three in a row loses.", ruleJa: "4つ並べると勝ち、3つ並べると負けです。" },
      { key: "squareFour", name: "Square Four", kanji: "四角四目", rule: "Four pieces each. Line them up, or make a square.", ruleJa: "それぞれ4つの駒。1列に並べるか、正方形を作ります。" },
      { key: "makerBreaker", name: "Maker and Breaker", kanji: "作り手と壊し手", rule: "Both players place either colour. One wants a five, the other wants none.", ruleJa: "どちらも好きな色を置きます。一方は5つ並べたく、もう一方は並べさせたくありません。" },
    ],
  },
  {
    name: "Strange boards",
    nameJa: "ふしぎな盤",
    games: [
      { key: "toroidalFive", name: "Toroidal Five", kanji: "輪王五目", rule: "Five in a row on a board with no edges: every side joins its opposite.", ruleJa: "縁のない盤で5つ並べます。どの辺も反対側の辺とつながっています。" },
      { key: "obstacleFive", name: "Obstacle Five", kanji: "石場五目", rule: "Five in a row across a board scattered with dead squares and hotspots.", ruleJa: "動かせないマスと熱点がちらばる盤で5つ並べます。" },
      { key: "scatteredRocks", name: "Scattered Rocks", kanji: "乱石五目", rule: "Five in a row around twelve rocks and two hotspots, all there from the first move.", ruleJa: "最初から12個の岩と2つの熱点がある盤で5つ並べます。" },
      { key: "rockfall", name: "Rockfall", kanji: "落石五目", rule: "Five in a row on an open board, until twenty rocks and two hotspots fall after the eighth stone.", ruleJa: "何もない盤で5つ並べます。8手目のあと、20個の岩と2つの熱点が落ちてきます。" },
      { key: "dominoFive", name: "Domino Five", kanji: "二連五目", rule: "Gomoku with dominoes: every piece is two stones, and not always yours.", ruleJa: "ドミノを使う五目並べ。1つの駒は石2つで、どちらも自分の色とは限りません。" },
      { key: "blockFive", name: "Block Five", kanji: "積み五目", rule: "Gomoku with falling-block pieces: four stones each, two of each colour.", ruleJa: "落ちものの形の駒を使う五目並べ。駒は4つの石で、色は2つずつです。" },
      { key: "twistFive", name: "Twist Five", kanji: "回し五目", rule: "Place a stone, then turn one quarter of the board. Five wins.", ruleJa: "石を置いたあと、盤の4分の1を回します。5つ並べたら勝ちです。" },
      { key: "twistFour", name: "Twist Four", kanji: "回し四目", rule: "The small twist game: four 2×2 quadrants, four in a row.", ruleJa: "小さな回転ゲーム。2×2の区画が4つ、4つ並べたら勝ちです。" },
    ],
  },
  {
    name: "Flipping",
    nameJa: "裏返し",
    games: [
      { key: "reversi", name: "Reversi", kanji: "リバーシ", rule: "Bracket a run of the other colour and it turns. Most discs at the end wins.", ruleJa: "相手の色の列をはさむと裏返ります。最後に石が多いほうの勝ちです。" },
      { key: "classicReversi", name: "Classic Reversi", kanji: "古式リバーシ", rule: "The 1880s rule: the players lay the first four discs themselves. Any flipping game here can be set up either way.", ruleJa: "1880年代のルール。最初の4つは自分たちで置きます。ここのどのゲームも、この始め方にできます。" },
      { key: "antiReversi", name: "Anti-Reversi", kanji: "逆リバーシ", rule: "Everything turns as usual, but the fewer discs wins.", ruleJa: "裏返しは同じですが、石が少ないほうの勝ちです。" },
      { key: "miniReversi", name: "Mini Reversi", kanji: "小リバーシ", rule: "The flipping game on a 4×4 or 6×6 board, which can grow to 8×8 mid-game.", ruleJa: "4×4か6×6の盤で遊びます。途中で8×8に広げることもできます。" },
      { key: "grandReversi", name: "Grand Reversi", kanji: "大リバーシ", rule: "The flipping game on a 10×10 board: a longer game, with more middle to fight over before anyone reaches an edge.", ruleJa: "10×10の盤。長い対局で、縁に着く前にたくさん取り合います。" },
      { key: "honeycomb", name: "Honeycomb", kanji: "蜂の巣", rule: "Reversi on a hexagon of hexagons: six ways to bracket a run, six corners that never turn.", ruleJa: "六角形の盤でのリバーシ。はさむ方向は6つ、裏返らない角も6つあります。" },
    ],
  },
  {
    name: "Races",
    nameJa: "競走",
    games: [
      { key: "halma", name: "Halma", kanji: "ハルマ", rule: "A race across the board: step, or jump chains over any piece, and fill the far corner first.", ruleJa: "盤を渡る競走です。1歩進むか、どの駒も飛び越えて連続でジャンプし、向かいの隅を先に埋めます。" },
      { key: "chineseCheckers", name: "Chinese Checkers", kanji: "ダイヤモンドゲーム", rule: "Fill the point of the star directly opposite yours, one step or jump-chain at a time.", ruleJa: "向かい側の星の先を、1歩か連続ジャンプで先に埋めます。" },
    ],
  },
  {
    name: "Connection and territory",
    nameJa: "つなぎと陣地",
    games: [
      { key: "hex", name: "Hex", kanji: "ヘックス", rule: "Join your own two sides of the board with an unbroken chain. A draw is impossible.", ruleJa: "自分の2つの辺を、切れない鎖でつなぎます。引き分けはありません。" },
      { key: "go", name: "Go", kanji: "囲碁", rule: "Surround more of the board than the other colour. Capture by taking a group's last liberty.", ruleJa: "相手より広く盤を囲います。石の最後の呼吸点をふさぐと取れます。" },
    ],
  },
  {
    name: "Checkers and draughts",
    nameJa: "チェッカーとドラフツ",
    games: [
      { key: "checkers", name: "Checkers", kanji: "チェッカー", rule: "Jump the other side's pieces off the board. Capturing is forced, and a king moves both ways.", ruleJa: "相手の駒を飛び越えて取ります。取りは強制で、王は前後に動けます。" },
      { key: "internationalDraughts", name: "International Draughts", kanji: "国際ドラフツ", rule: "Draughts on a 10×10 board: men take backward, kings fly, and you must take the most you can.", ruleJa: "10×10の盤。男も後ろに取り、王は飛び、いちばん多く取る手を選びます。" },
      { key: "brazilianDraughts", name: "Brazilian Draughts", kanji: "ブラジルチェッカー", rule: "The international rules on the 8×8 board: men take backward, kings fly, and the longest capture is compulsory.", ruleJa: "国際ルールを8×8で。男も後ろに取り、王は飛び、最長の取りが義務です。" },
      { key: "canadianCheckers", name: "Canadian Checkers", kanji: "カナディアンチェッカー", rule: "The international rules on a 12×12 board, with thirty men a side.", ruleJa: "国際ルールを12×12の盤で。1人30個の駒です。" },
      { key: "russianDraughts", name: "Russian Draughts", kanji: "ロシアチェッカー", rule: "Draughts on 8×8 with flying kings: men take backward, any capture may be chosen, and a man crowned mid-capture takes on as a king.", ruleJa: "8×8で王が飛ぶドラフツ。男も後ろに取り、どの取りも選べ、取りの途中で王になると王として続けます。" },
      { key: "poolCheckers", name: "Pool Checkers", kanji: "プールチェッカー", rule: "American pool: men take backward, kings fly, and you choose which capture to make.", ruleJa: "アメリカのプール。男も後ろに取り、王は飛び、どの取りを選んでもかまいません。" },
    ],
  },
];

export const GAMES = GROUPS.flatMap((group) => group.games.map((game) => ({ ...game, group: group.name })));
