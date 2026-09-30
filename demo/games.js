// The demo's own names and one-line rules for each game. The engine has none:
// names and rules text belong to whichever app shows the games.

export const GROUPS = [
  {
    name: "Five in a row",
    games: [
      { key: "freestyle", name: "Gomoku", kanji: "五目並べ", rule: "Five or more in a row wins." },
      { key: "standard", name: "Tournament Gomoku", kanji: "競技五目", rule: "Exactly five wins. Six or more does not." },
      { key: "renju", name: "Renju", kanji: "連珠", rule: "Black may not make a double three, a double four or an overline. White may." },
      { key: "omok", name: "Omok", kanji: "오목", rule: "The double three is forbidden for both sides. Overlines win." },
      { key: "caro", name: "Caro", kanji: "Cờ ca-rô", rule: "Exactly five wins, and only if it is not shut in at both ends." },
      { key: "connect6", name: "Connect6", kanji: "六子棋", rule: "Two stones a turn. Six in a row wins." },
      { key: "misereFive", name: "Misère Five", kanji: "負け五目", rule: "Five in a row loses. Make your opponent complete it." },
      { key: "hexFive", name: "Hex Five", kanji: "六角五目", rule: "Five in a row on a hexagon of hexagons: six neighbours a cell, three ways to line them up." },
    ],
  },
  {
    name: "Captures",
    games: [
      { key: "ninuki", name: "Ninuki-renju", kanji: "二抜き連珠", rule: "Five in a row wins. So does capturing five pairs." },
      { key: "sannuki", name: "Sannuki-renju", kanji: "三抜き連珠", rule: "The capture game where a flank takes a pair or a triple. Fifteen stones win." },
    ],
  },
  {
    name: "Drops",
    games: [
      { key: "dropFour", name: "Drop Four", kanji: "落とし四目", rule: "Stones fall to the bottom of their column. Four in a row wins." },
      { key: "ringDrop", name: "Ring Drop", kanji: "輪落とし", rule: "Drop Four on a cylinder: the left and right edges join." },
      { key: "holeDrop", name: "Hole Drop", kanji: "穴落とし", rule: "One square is dead: nothing can land on it or count through it." },
      { key: "hotDrop", name: "Hot Drop", kanji: "熱点落とし", rule: "A hotspot counts as either colour, and a hole counts as nothing." },
      { key: "clearDrop", name: "Clear Drop", kanji: "消し落とし", rule: "A full bottom row vanishes and everything drops a row." },
      { key: "giveawayDrop", name: "Giveaway Drop", kanji: "譲り落とし", rule: "Making four loses. Force your opponent into it." },
      { key: "edgeDrop", name: "Edge Drop", kanji: "縁寄せ", rule: "Gravity from all four edges: a stone must rest on something." },
      { key: "wormDrop", name: "Wormhole Drop", kanji: "穴通し落とし", rule: "Two squares are joined: a line entering one comes out of the other." },
    ],
  },
  {
    name: "Small boards",
    games: [
      { key: "tictactoe", name: "Tic-tac-toe", kanji: "三目並べ", rule: "Three in a row on a 3×3 board." },
      { key: "wildTicTacToe", name: "Wild Tic-tac-toe", kanji: "自由三目", rule: "Place either mark. Three in a row of either wins for whoever makes it." },
      { key: "notakto", name: "Notakto", kanji: "黒だけ三目", rule: "Only black stones. Whoever makes three in a row loses." },
      { key: "trapThree", name: "Trap Three", kanji: "罠三", rule: "Four in a row wins. Three in a row loses." },
      { key: "squareFour", name: "Square Four", kanji: "四角四目", rule: "Four pieces each. Line them up, or make a square." },
      { key: "makerBreaker", name: "Maker and Breaker", kanji: "作り手と壊し手", rule: "Both players place either colour. One wants a five, the other wants none." },
    ],
  },
  {
    name: "Strange boards",
    games: [
      { key: "toroidalFive", name: "Toroidal Five", kanji: "輪王五目", rule: "Five in a row on a board with no edges: every side joins its opposite." },
      { key: "obstacleFive", name: "Obstacle Five", kanji: "石場五目", rule: "Five in a row across a board scattered with dead squares and hotspots." },
      { key: "scatteredRocks", name: "Scattered Rocks", kanji: "乱石五目", rule: "Five in a row around twelve rocks and two hotspots, all there from the first move." },
      { key: "rockfall", name: "Rockfall", kanji: "落石五目", rule: "Five in a row on an open board, until twenty rocks and two hotspots fall after the eighth stone." },
      { key: "dominoFive", name: "Domino Five", kanji: "二連五目", rule: "Gomoku with dominoes: every piece is two stones, and not always yours." },
      { key: "blockFive", name: "Block Five", kanji: "積み五目", rule: "Gomoku with falling-block pieces: four stones each, two of each colour." },
      { key: "twistFive", name: "Twist Five", kanji: "回し五目", rule: "Place a stone, then turn one quarter of the board. Five wins." },
      { key: "twistFour", name: "Twist Four", kanji: "回し四目", rule: "The small twist game: four 2×2 quadrants, four in a row." },
    ],
  },
  {
    name: "Flipping",
    games: [
      { key: "reversi", name: "Reversi", kanji: "リバーシ", rule: "Bracket a run of the other colour and it turns. Most discs at the end wins." },
      { key: "classicReversi", name: "Classic Reversi", kanji: "古式リバーシ", rule: "The 1880s rule: the players lay the first four discs themselves. Any flipping game here can be set up either way." },
      { key: "antiReversi", name: "Anti-Reversi", kanji: "逆リバーシ", rule: "Everything turns as usual, but the fewer discs wins." },
      { key: "miniReversi", name: "Mini Reversi", kanji: "小リバーシ", rule: "The flipping game on a 4×4 or 6×6 board, which can grow to 8×8 mid-game." },
      { key: "grandReversi", name: "Grand Reversi", kanji: "大リバーシ", rule: "The flipping game on a 10×10 board: a longer game, with more middle to fight over before anyone reaches an edge." },
      { key: "honeycomb", name: "Honeycomb", kanji: "蜂の巣", rule: "Reversi on a hexagon of hexagons: six ways to bracket a run, six corners that never turn." },
    ],
  },
  {
    name: "Races",
    games: [
      { key: "halma", name: "Halma", kanji: "ハルマ", rule: "A race across the board: step, or jump chains over any piece, and fill the far corner first." },
      { key: "chineseCheckers", name: "Chinese Checkers", kanji: "ダイヤモンドゲーム", rule: "Fill the point of the star directly opposite yours, one step or jump-chain at a time." },
    ],
  },
  {
    name: "Connection and territory",
    games: [
      { key: "hex", name: "Hex", kanji: "ヘックス", rule: "Join your own two sides of the board with an unbroken chain. A draw is impossible." },
      { key: "go", name: "Go", kanji: "囲碁", rule: "Surround more of the board than the other colour. Capture by taking a group's last liberty." },
    ],
  },
  {
    name: "Checkers and draughts",
    games: [
      { key: "checkers", name: "Checkers", kanji: "チェッカー", rule: "Jump the other side's pieces off the board. Capturing is forced, and a king moves both ways." },
      { key: "internationalDraughts", name: "International Draughts", kanji: "国際ドラフツ", rule: "Draughts on a 10×10 board: men take backward, kings fly, and you must take the most you can." },
      { key: "brazilianDraughts", name: "Brazilian Draughts", kanji: "ブラジルチェッカー", rule: "The international rules on the 8×8 board: men take backward, kings fly, and the longest capture is compulsory." },
      { key: "canadianCheckers", name: "Canadian Checkers", kanji: "カナディアンチェッカー", rule: "The international rules on a 12×12 board, with thirty men a side." },
      { key: "russianDraughts", name: "Russian Draughts", kanji: "ロシアチェッカー", rule: "Draughts on 8×8 with flying kings: men take backward, any capture may be chosen, and a man crowned mid-capture takes on as a king." },
      { key: "poolCheckers", name: "Pool Checkers", kanji: "プールチェッカー", rule: "American pool: men take backward, kings fly, and you choose which capture to make." },
    ],
  },
];

export const GAMES = GROUPS.flatMap((group) => group.games.map((game) => ({ ...game, group: group.name })));
