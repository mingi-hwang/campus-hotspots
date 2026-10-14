const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const startButton = document.querySelector("#start-button");
const pairsText = document.querySelector("#pairs");
const timerText = document.querySelector("#timer");
const finishedText = document.querySelector("#finished");
const messageText = document.querySelector("#message");

const boardSize = 4;
const cardCount = boardSize * boardSize;
const previewSeconds = 5;
const gameSeconds = 30;
const shapeNames = ["circle", "square", "triangle", "star", "pentagon", "x", "arrow", "plus"];
const colors = ["#72d6ff", "#ffcf70", "#ff8eaa", "#9b9dff", "#7ee6b1", "#f69cff", "#ffffff", "#8bb8ff"];

let cards = [];
let firstCard = null;
let secondCard = null;
let matchedPairs = 0;
let secondsLeft = gameSeconds;
let timerId = null;
let flipBackId = null;
let animationId = null;
let gameState = "ready";
let pulse = 0;

function shuffle(items) {
	// 카드 순서를 섞어 게임을 시작할 때마다 다른 판을 만듭니다.
	const shuffled = items.slice();
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
	}
	return shuffled;
}

function makeCards() {
	const deck = shuffle(shapeNames.concat(shapeNames));
	return deck.map(function (shape, index) {
		return {
			shape: shape,
			color: colors[shapeNames.indexOf(shape)],
			index: index,
			faceUp: false,
			matched: false
		};
	});
}

function updateHud() {
	pairsText.textContent = matchedPairs + " / " + shapeNames.length;
	timerText.textContent = String(secondsLeft);
}

function updatePreviewHud(seconds) {
	pairsText.textContent = matchedPairs + " / " + shapeNames.length;
	timerText.textContent = "미리보기 " + seconds;
}

function drawShape(shape, centerX, centerY, size, color) {
	// 캔버스에는 도형 이름 대신 실제 모양을 직접 그립니다.
	context.save();
	context.translate(centerX, centerY);
	context.fillStyle = color;
	context.strokeStyle = color;
	context.lineWidth = Math.max(5, size * 0.08);
	context.lineJoin = "round";

	if (shape === "circle") {
		context.beginPath();
		context.arc(0, 0, size * 0.3, 0, Math.PI * 2);
		context.fill();
	} else if (shape === "square") {
		context.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
	} else if (shape === "triangle") {
		polygon(3, size * 0.36, -Math.PI / 2);
		context.fill();
	} else if (shape === "star") {
		star(size * 0.38, size * 0.17);
		context.fill();
	} else if (shape === "pentagon") {
		polygon(5, size * 0.36, -Math.PI / 2);
		context.fill();
	} else if (shape === "x") {
		context.rotate(Math.PI / 4);
		context.fillRect(-size * 0.1, -size * 0.36, size * 0.2, size * 0.72);
		context.fillRect(-size * 0.36, -size * 0.1, size * 0.72, size * 0.2);
	} else if (shape === "arrow") {
		context.beginPath();
		context.moveTo(size * 0.4, 0);
		context.lineTo(0, -size * 0.32);
		context.lineTo(0, -size * 0.14);
		context.lineTo(-size * 0.38, -size * 0.14);
		context.lineTo(-size * 0.38, size * 0.14);
		context.lineTo(0, size * 0.14);
		context.lineTo(0, size * 0.32);
		context.closePath();
		context.fill();
	} else {
		context.fillRect(-size * 0.1, -size * 0.36, size * 0.2, size * 0.72);
		context.fillRect(-size * 0.36, -size * 0.1, size * 0.72, size * 0.2);
	}
	context.restore();
}

function polygon(sides, radius, rotation) {
	context.beginPath();
	for (let index = 0; index < sides; index += 1) {
		const angle = rotation + (Math.PI * 2 * index) / sides;
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		if (index === 0) context.moveTo(x, y);
		else context.lineTo(x, y);
	}
	context.closePath();
}

function star(outerRadius, innerRadius) {
	context.beginPath();
	for (let index = 0; index < 10; index += 1) {
		const radius = index % 2 === 0 ? outerRadius : innerRadius;
		const angle = -Math.PI / 2 + (Math.PI * index) / 5;
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		if (index === 0) context.moveTo(x, y);
		else context.lineTo(x, y);
	}
	context.closePath();
}

function drawCard(card, x, y, size) {
	const radius = size * 0.08;
	context.fillStyle = card.faceUp || card.matched ? "#123c70" : "#1d5b96";
	context.strokeStyle = card.matched ? "#a8edff" : "#4f98d4";
	context.lineWidth = card.matched ? 5 : 3;
	context.beginPath();
	context.roundRect(x + 8, y + 8, size - 16, size - 16, radius);
	context.fill();
	context.stroke();

	if (card.faceUp || card.matched) {
		const glow = card.matched ? 0.15 + Math.sin(pulse) * 0.04 : 0.1;
		context.fillStyle = "rgba(126, 213, 255, " + glow + ")";
		context.fill();
		drawShape(card.shape, x + size / 2, y + size / 2, size, card.color);
	} else {
		context.fillStyle = "#82dfff";
		context.font = size * 0.28 + "px system-ui";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText("?", x + size / 2, y + size / 2);
	}
}

function drawBoard() {
	const size = canvas.width / boardSize;
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "#081d3b";
	context.fillRect(0, 0, canvas.width, canvas.height);
	for (const card of cards) {
		const column = card.index % boardSize;
		const row = Math.floor(card.index / boardSize);
		drawCard(card, column * size, row * size, size);
	}
}

function animationLoop() {
	pulse += 0.05;
	drawBoard();
	animationId = requestAnimationFrame(animationLoop);
}

function stopGame() {
	clearInterval(timerId);
	clearTimeout(flipBackId);
	cancelAnimationFrame(animationId);
	timerId = null;
	flipBackId = null;
	animationId = null;
}

function finishGame(message) {
	gameState = "finished";
	stopGame();
	finishedText.textContent = gameSeconds - secondsLeft + "초";
	messageText.textContent = message;
	startButton.textContent = "다시 시작";
	drawBoard();
}

function startGame() {
	// 재시작할 때 이전 타이머, 뒤집기 예약, 애니메이션을 먼저 정리합니다.
	stopGame();
	cards = makeCards();
	for (const card of cards) card.faceUp = true;
	firstCard = null;
	secondCard = null;
	matchedPairs = 0;
	secondsLeft = gameSeconds;
	gameState = "preview";
	finishedText.textContent = "-";
	startButton.textContent = "다시 시작";
	messageText.textContent = "5초 동안 도형을 기억하세요.";
	updatePreviewHud(previewSeconds);
	drawBoard();
	animationId = requestAnimationFrame(animationLoop);
	let previewLeft = previewSeconds;
	timerId = setInterval(function () {
		previewLeft -= 1;
		if (previewLeft <= 0) {
			clearInterval(timerId);
			timerId = null;
			for (const card of cards) card.faceUp = false;
			beginPlaying();
			return;
		}
		updatePreviewHud(previewLeft);
	}, 1000);
}

function beginPlaying() {
	gameState = "playing";
	messageText.textContent = "두 카드를 차례로 눌러보세요.";
	updateHud();
	timerId = setInterval(function () {
		secondsLeft -= 1;
		updateHud();
		if (secondsLeft <= 0) finishGame("시간이 끝났습니다. 다시 도전해보세요.");
	}, 1000);
}

function getCardAt(event) {
	const bounds = canvas.getBoundingClientRect();
	const scaleX = canvas.width / bounds.width;
	const scaleY = canvas.height / bounds.height;
	const x = (event.clientX - bounds.left) * scaleX;
	const y = (event.clientY - bounds.top) * scaleY;
	const size = canvas.width / boardSize;
	const column = Math.floor(x / size);
	const row = Math.floor(y / size);
	return cards[row * boardSize + column];
}

function chooseCard(card) {
	if (gameState !== "playing" || !card || card.matched || card.faceUp || secondCard) return;
	card.faceUp = true;
	if (!firstCard) {
		firstCard = card;
		return;
	}

	secondCard = card;
	// 두 카드의 도형 이름이 같으면 짝으로 확정하고, 다르면 잠시 후 다시 가립니다.
	if (firstCard.shape === secondCard.shape) {
		firstCard.matched = true;
		secondCard.matched = true;
		matchedPairs += 1;
		firstCard = null;
		secondCard = null;
		updateHud();
		if (matchedPairs === shapeNames.length) finishGame("모든 짝을 찾았습니다!");
	} else {
		messageText.textContent = "짝이 아니에요. 다시 찾아보세요.";
		flipBackId = setTimeout(function () {
			firstCard.faceUp = false;
			secondCard.faceUp = false;
			firstCard = null;
			secondCard = null;
			flipBackId = null;
		}, 700);
	}
}

startButton.addEventListener("click", startGame);
canvas.addEventListener("pointerdown", function (event) {
	event.preventDefault();
	chooseCard(getCardAt(event));
});

cards = makeCards();
updateHud();
drawBoard();
