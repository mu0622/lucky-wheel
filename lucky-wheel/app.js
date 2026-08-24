const prizes = [
  {
    text: "特等奖",
    detail: "找狗大王自行领取香吻一枚",
    chance: 1,
    color: "#d93245",
    image: "assets/cartoon-kiss.png",
    kind: "grand"
  },
  {
    text: "库迪百香橙子",
    detail: "清爽果香饮品",
    chance: 4,
    color: "#f06449",
    image: "assets/cotti-orange.jpg",
    kind: "drink"
  },
  {
    text: "库迪抹茶",
    detail: "抹茶风味饮品",
    chance: 4,
    color: "#297c73",
    image: "assets/cotti-matcha.jpg",
    kind: "drink"
  },
  {
    text: "库迪荔枝冰酿",
    detail: "荔枝风味冰饮",
    chance: 4,
    color: "#315a9a",
    image: "assets/cotti-lychee.png",
    kind: "drink"
  },
  {
    text: "再接再厉",
    detail: "感谢参与",
    chance: 7,
    color: "#8d5a97",
    image: "",
    kind: "thanks"
  }
];

const STORAGE_KEYS = {
  winners: "hedgehogChargeWinners",
  draws: "hedgehogChargeDailyDraws"
};
const adminNames = ["king", "我", "管理员"];

const state = {
  currentUser: "",
  rotation: 0,
  spinning: false,
  winners: loadJson(STORAGE_KEYS.winners, []),
  draws: loadJson(STORAGE_KEYS.draws, {})
};

const wheelSvg = document.querySelector("#wheel-svg");
const spinButton = document.querySelector("#spin-button");
const switchUserButton = document.querySelector("#switch-user-button");
const clearWinnersButton = document.querySelector("#clear-winners-button");
const chanceCount = document.querySelector("#chance-count");
const playerName = document.querySelector("#player-name");
const prizeCount = document.querySelector("#prize-count");
const prizeList = document.querySelector("#prize-list");
const winnerList = document.querySelector("#winner-list");
const spinHint = document.querySelector("#spin-hint");
const nameModal = document.querySelector("#name-modal");
const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#name-input");
const resultModal = document.querySelector("#result-modal");
const resultTitle = document.querySelector("#result-title");
const resultDesc = document.querySelector("#result-desc");
const resultVisual = document.querySelector("#result-visual");

const center = 210;
const radius = 188;
const segmentAngle = 360 / prizes.length;

function todayKey() {
  return new Date().toLocaleDateString("zh-CN");
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function storageNameKey(name) {
  return `${todayKey()}::${normalizeName(name).toLowerCase()}`;
}

function isAdmin(name = state.currentUser) {
  return adminNames.includes(normalizeName(name));
}

function hasDrawnToday(name = state.currentUser) {
  if (isAdmin(name)) return false;
  return Boolean(state.draws[storageNameKey(name)]);
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function polarToCartesian(angle, distance = radius) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: center + distance * Math.cos(radians),
    y: center + distance * Math.sin(radians)
  };
}

function describeSlice(startAngle, endAngle) {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function drawWheel() {
  const wheelGroup = createSvgElement("g", { class: "wheel-rotor" });

  prizes.forEach((prize, index) => {
    const startAngle = index * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const middleAngle = startAngle + segmentAngle / 2;
    const textPoint = polarToCartesian(middleAngle, 116);

    const slice = createSvgElement("path", {
      d: describeSlice(startAngle, endAngle),
      fill: prize.color,
      stroke: "#fff7dd",
      "stroke-width": "3"
    });

    const label = createSvgElement("text", {
      x: textPoint.x,
      y: textPoint.y,
      fill: "#fffaf1",
      "font-size": prize.text.length > 5 ? "17" : "20",
      "font-weight": "900",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      transform: `rotate(${middleAngle}, ${textPoint.x}, ${textPoint.y})`
    });
    label.textContent = prize.text;

    wheelGroup.append(slice, label);
  });

  const outerRing = createSvgElement("circle", {
    cx: center,
    cy: center,
    r: 204,
    fill: "none",
    stroke: "#fff4c2",
    "stroke-width": "18"
  });

  const innerRing = createSvgElement("circle", {
    cx: center,
    cy: center,
    r: 72,
    fill: "#fff7df",
    stroke: "#f2c35a",
    "stroke-width": "8"
  });

  wheelSvg.replaceChildren(wheelGroup, outerRing, innerRing);
}

function renderPrizeList() {
  prizeList.innerHTML = prizes
    .map(
      (prize) => `
        <div class="prize-item">
          <span class="prize-dot" style="background:${prize.color}"></span>
          <span class="prize-name">${prize.kind === "grand" ? prize.text : `${prize.text} · ${prize.detail}`}</span>
          <span class="prize-tag">${prize.kind === "thanks" ? "参与奖" : "奖品"}</span>
        </div>
      `
    )
    .join("");
}

function renderWinners() {
  if (state.winners.length === 0) {
    winnerList.innerHTML = `<p class="empty-state">还没有抽奖记录</p>`;
    return;
  }

  winnerList.innerHTML = state.winners
    .slice()
    .reverse()
    .map(
      (winner) => `
        <div class="winner-item">
          <div>
            <strong>${winner.name}</strong>
            <span>${winner.prize}</span>
          </div>
          <time>${winner.time}</time>
        </div>
      `
    )
    .join("");
}

function remainingChanceText() {
  if (!state.currentUser) return "0";
  if (isAdmin()) return "不限";
  return hasDrawnToday() ? "0" : "1";
}

function updateStatus() {
  playerName.textContent = state.currentUser || "待输入";
  chanceCount.textContent = remainingChanceText();
  prizeCount.textContent = prizes.length;
  spinButton.disabled = state.spinning || !state.currentUser || hasDrawnToday();

  if (!state.currentUser) {
    spinHint.textContent = "请先输入抽奖人姓名";
  } else if (state.spinning) {
    spinHint.textContent = "转盘正在加速，请稍候";
  } else if (hasDrawnToday()) {
    spinHint.textContent = "今天已经抽过奖了，明天再来";
  } else if (isAdmin()) {
    spinHint.textContent = "管理员模式：不限次数抽奖";
  } else {
    spinHint.textContent = "今日还有 1 次抽奖机会";
  }
}

function pickPrize() {
  const total = prizes.reduce((sum, prize) => sum + prize.chance, 0);
  let cursor = Math.random() * total;

  for (let index = 0; index < prizes.length; index += 1) {
    cursor -= prizes[index].chance;
    if (cursor <= 0) return { prize: prizes[index], index };
  }

  return { prize: prizes[prizes.length - 1], index: prizes.length - 1 };
}

function buildResultVisual(prize) {
  if (prize.image) {
    return `<img src="${prize.image}" alt="${prize.text}宣传图" />`;
  }

  const symbol = prize.kind === "grand" ? "特" : "谢";
  return `<div class="result-badge">${symbol}</div>`;
}

function addWinner(prize) {
  if (isAdmin()) return;

  const record = {
    name: state.currentUser,
    prize: `${prize.text} · ${prize.detail}`,
    date: todayKey(),
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  state.winners.push(record);
  if (!isAdmin()) {
    state.draws[storageNameKey(state.currentUser)] = record;
  }
  saveJson(STORAGE_KEYS.winners, state.winners);
  saveJson(STORAGE_KEYS.draws, state.draws);
  renderWinners();
}

function openResult(prize) {
  resultVisual.innerHTML = buildResultVisual(prize);
  resultTitle.textContent = `${prize.text} · ${prize.detail}`;
  resultDesc.textContent =
    prize.kind === "thanks"
      ? "感谢参与刺猬充电大抽奖，祝你下次好运。"
      : "请凭获奖名单记录完成后续领取核对。";
  resultModal.classList.add("is-open");
  resultModal.setAttribute("aria-hidden", "false");
}

function closeResult() {
  resultModal.classList.remove("is-open");
  resultModal.setAttribute("aria-hidden", "true");
}

function openNameModal() {
  nameModal.classList.add("is-open");
  nameModal.setAttribute("aria-hidden", "false");
  nameInput.value = "";
  window.setTimeout(() => nameInput.focus(), 60);
}

function closeNameModal() {
  nameModal.classList.remove("is-open");
  nameModal.setAttribute("aria-hidden", "true");
}

function spin() {
  if (state.spinning || !state.currentUser || hasDrawnToday()) return;

  const { prize, index } = pickPrize();
  const targetMiddle = index * segmentAngle + segmentAngle / 2;
  const fullTurns = 5 + Math.floor(Math.random() * 3);
  const targetRotation = fullTurns * 360 + (360 - targetMiddle);

  state.spinning = true;
  state.rotation += targetRotation;

  wheelSvg.style.transform = `rotate(${state.rotation}deg)`;
  updateStatus();

  window.setTimeout(() => {
    state.spinning = false;
    addWinner(prize);
    openResult(prize);
    updateStatus();
  }, 5300);
}

function clearWinners() {
  state.winners = [];
  state.draws = {};
  saveJson(STORAGE_KEYS.winners, state.winners);
  saveJson(STORAGE_KEYS.draws, state.draws);
  renderWinners();
  updateStatus();
}

drawWheel();
renderPrizeList();
renderWinners();
updateStatus();
openNameModal();

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextName = normalizeName(nameInput.value);
  if (!nextName) return;

  state.currentUser = nextName;
  closeNameModal();
  updateStatus();
});

spinButton.addEventListener("click", spin);
switchUserButton.addEventListener("click", openNameModal);
clearWinnersButton.addEventListener("click", clearWinners);
resultModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]")) closeResult();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeResult();
});
