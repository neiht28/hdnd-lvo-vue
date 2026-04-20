const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const BASE_BLINDS = [300, 450, 600];

const JOKERS = [
  { name: "Jolly Joker", text: "+4 Mult if played hand contains a pair", apply: (ctx) => ctx.type.includes("Pair") ? { mult: 4 } : {} },
  { name: "Greedy Joker", text: "+30 Chips if hand has Diamonds", apply: (ctx) => ctx.cards.some((c) => c.suit === "♦") ? { chips: 30 } : {} },
  { name: "Banner", text: "+40 Chips", apply: () => ({ chips: 40 }) },
  { name: "Abstract Joker", text: "+3 Mult per Joker owned", apply: (ctx) => ({ mult: ctx.jokers.length * 3 }) },
  { name: "Even Steven", text: "+4 Mult if all selected ranks are even", apply: (ctx) => ctx.cards.every((c) => ["2", "4", "6", "8", "10", "Q", "A"].includes(c.rank)) ? { mult: 4 } : {} },
  { name: "Fibonacci", text: "+8 Mult if hand contains A,2,3,5,8", apply: (ctx) => {
    const needed = new Set(["A", "2", "3", "5", "8"]);
    const has = new Set(ctx.cards.map((c) => c.rank));
    return [...needed].every((r) => has.has(r)) ? { mult: 8 } : {};
  } }
];

const state = {
  ante: 1,
  round: 0,
  hands: 4,
  discards: 3,
  money: 4,
  score: 0,
  target: 300,
  deck: [],
  hand: [],
  selected: new Set(),
  jokers: []
};

const el = {
  ante: document.getElementById("ante"),
  round: document.getElementById("round"),
  hands: document.getElementById("hands"),
  discards: document.getElementById("discards"),
  score: document.getElementById("score"),
  target: document.getElementById("target"),
  deckCount: document.getElementById("deckCount"),
  cards: document.getElementById("cards"),
  handType: document.getElementById("handType"),
  chips: document.getElementById("chips"),
  mult: document.getElementById("mult"),
  handScore: document.getElementById("handScore"),
  log: document.getElementById("log"),
  playHand: document.getElementById("playHand"),
  discard: document.getElementById("discard"),
  newRun: document.getElementById("newRun"),
  jokerList: document.getElementById("jokerList"),
  shopBtn: document.getElementById("shopBtn"),
  shopDialog: document.getElementById("shopDialog"),
  money: document.getElementById("money"),
  shopChoices: document.getElementById("shopChoices"),
  skipShop: document.getElementById("skipShop")
};

function makeDeck() {
  const d = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      d.push({ suit, rank, value: RANKS.indexOf(rank) + 2 });
    }
  }
  return shuffle(d);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawToEight() {
  while (state.hand.length < 8) {
    if (!state.deck.length) state.deck = makeDeck();
    state.hand.push(state.deck.pop());
  }
}

function render() {
  el.ante.textContent = state.ante;
  el.round.textContent = ["Small Blind", "Big Blind", "Boss Blind"][state.round];
  el.hands.textContent = state.hands;
  el.discards.textContent = state.discards;
  el.score.textContent = state.score;
  el.target.textContent = state.target;
  el.deckCount.textContent = `${state.deck.length} cards`;
  el.money.textContent = state.money;

  el.cards.innerHTML = "";
  state.hand.forEach((card, i) => {
    const btn = document.createElement("button");
    btn.className = `card ${state.selected.has(i) ? "selected" : ""}`;
    const red = card.suit === "♥" || card.suit === "♦" ? "red" : "";
    btn.innerHTML = `<span>${card.rank}</span><span class="suit ${red}">${card.suit}</span><span>${card.rank}</span>`;
    btn.addEventListener("click", () => toggleCard(i));
    el.cards.appendChild(btn);
  });

  const evalResult = evaluateSelected();
  el.handType.textContent = evalResult.type;
  el.chips.textContent = evalResult.chips;
  el.mult.textContent = evalResult.mult;
  el.handScore.textContent = evalResult.total;

  el.jokerList.innerHTML = state.jokers.map((j) => `<div class="joker"><strong>${j.name}</strong><div>${j.text}</div></div>`).join("");
}

function toggleCard(idx) {
  if (state.selected.has(idx)) {
    state.selected.delete(idx);
  } else {
    if (state.selected.size >= 5) return;
    state.selected.add(idx);
  }
  render();
}

function evaluateSelected() {
  const cards = [...state.selected].map((i) => state.hand[i]);
  if (!cards.length) return { type: "Select cards", chips: 0, mult: 1, total: 0 };

  const base = scoreHand(cards);
  let chips = base.chips;
  let mult = base.mult;

  for (const joker of state.jokers) {
    const mod = joker.apply({ cards, type: base.type, jokers: state.jokers });
    chips += mod.chips || 0;
    mult += mod.mult || 0;
  }

  return { type: base.type, chips, mult, total: chips * mult };
}

function scoreHand(cards) {
  const rankCounts = countBy(cards.map((c) => c.rank));
  const suitCounts = countBy(cards.map((c) => c.suit));
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  const values = cards.map((c) => c.value).sort((a, b) => a - b);
  const isFlush = Object.values(suitCounts).some((n) => n >= 5);
  const isStraight = checkStraight(values);

  if (isStraight && isFlush) return { type: "Straight Flush", chips: 100, mult: 8 };
  if (counts[0] === 4) return { type: "Four of a Kind", chips: 80, mult: 7 };
  if (counts[0] === 3 && counts[1] >= 2) return { type: "Full House", chips: 65, mult: 4 };
  if (isFlush) return { type: "Flush", chips: 50, mult: 4 };
  if (isStraight) return { type: "Straight", chips: 45, mult: 4 };
  if (counts[0] === 3) return { type: "Three of a Kind", chips: 30, mult: 3 };
  if (counts[0] === 2 && counts[1] === 2) return { type: "Two Pair", chips: 20, mult: 2 };
  if (counts[0] === 2) return { type: "Pair", chips: 15, mult: 2 };

  const high = Math.max(...values);
  return { type: "High Card", chips: Math.max(5, high), mult: 1 };
}

function checkStraight(values) {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.includes(14)) unique.unshift(1); // wheel
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === unique[i - 1] + 1) {
      run++;
      if (run >= 5) return true;
    } else if (unique[i] !== unique[i - 1]) {
      run = 1;
    }
  }
  return false;
}

function countBy(arr) {
  return arr.reduce((acc, x) => {
    acc[x] = (acc[x] || 0) + 1;
    return acc;
  }, {});
}

function playHand() {
  if (!state.selected.size || state.hands <= 0) return;
  const ev = evaluateSelected();
  state.score += ev.total;
  state.hands--;
  state.money += 1;

  const remove = [...state.selected].sort((a, b) => b - a);
  for (const idx of remove) state.hand.splice(idx, 1);
  state.selected.clear();
  drawToEight();

  log(`Played ${ev.type} for ${ev.total} points.`);
  checkRoundEnd();
  render();
}

function discardCards() {
  if (!state.selected.size || state.discards <= 0) return;

  const remove = [...state.selected].sort((a, b) => b - a);
  for (const idx of remove) state.hand.splice(idx, 1);
  state.selected.clear();
  state.discards--;
  drawToEight();
  log("Discarded selected cards.");
  render();
}

function checkRoundEnd() {
  if (state.score >= state.target) {
    log("Blind defeated!");
    nextBlind();
    return;
  }

  if (state.hands === 0) {
    log("Run failed. Starting new run.");
    resetRun();
  }
}

function nextBlind() {
  state.round++;
  state.money += 3;

  if (state.round > 2) {
    state.round = 0;
    state.ante++;
    log(`Advanced to Ante ${state.ante}.`);
  }

  state.target = Math.floor(BASE_BLINDS[state.round] * Math.pow(1.5, state.ante - 1));
  state.score = 0;
  state.hands = 4;
  state.discards = 3;
  state.deck = makeDeck();
  state.hand = [];
  state.selected.clear();
  drawToEight();
  openShop();
}

function log(msg) {
  const li = document.createElement("li");
  li.textContent = msg;
  el.log.prepend(li);
}

function openShop() {
  const choices = shuffle(JOKERS).slice(0, 3);
  el.shopChoices.innerHTML = "";

  choices.forEach((joker) => {
    const item = document.createElement("div");
    item.className = "shop-item";
    item.innerHTML = `<strong>${joker.name}</strong><div>${joker.text}</div>`;
    const buy = document.createElement("button");
    buy.textContent = "Buy";
    buy.addEventListener("click", () => {
      if (state.money < 4) {
        log("Not enough money.");
        return;
      }
      state.money -= 4;
      state.jokers.push(joker);
      log(`Bought ${joker.name}.`);
      el.shopDialog.close();
      render();
    });
    item.appendChild(buy);
    el.shopChoices.appendChild(item);
  });

  el.shopDialog.showModal();
  render();
}

function resetRun() {
  state.ante = 1;
  state.round = 0;
  state.hands = 4;
  state.discards = 3;
  state.money = 4;
  state.score = 0;
  state.target = 300;
  state.jokers = [];
  state.deck = makeDeck();
  state.hand = [];
  state.selected.clear();
  drawToEight();
  log("New run started.");
  render();
}

el.playHand.addEventListener("click", playHand);
el.discard.addEventListener("click", discardCards);
el.newRun.addEventListener("click", resetRun);
el.shopBtn.addEventListener("click", openShop);
el.skipShop.addEventListener("click", () => el.shopDialog.close());

resetRun();
