const csvPath = "data/서울교통공사_지하철혼잡도정보_20260630.csv";
const highwayCsvPath = "data/한국도로공사_추석연휴 특별교통소통대책 결과_20260818.csv";
const charts = {};
const buttons = document.querySelectorAll("[data-panel]");
const panels = document.querySelectorAll(".panel");

function showPanel(id) {
	for (const panel of panels) {
		panel.hidden = panel.id !== id;
	}
	for (const button of buttons) {
		button.setAttribute("aria-pressed", String(button.dataset.panel === id));
	}
	requestAnimationFrame(function () {
		if (charts[id]) charts[id].resize();
	});
}

for (const button of buttons) {
	button.addEventListener("click", function () {
		showPanel(button.dataset.panel);
	});
}

function numberValue(value) {
	return Number(String(value).trim());
}

function cleanRows(rows) {
	return rows.map(function (row) {
		const cleanRow = {};
		for (const key of Object.keys(row)) cleanRow[key.trim()] = row[key];
		return cleanRow;
	});
}

async function loadCsv(path) {
	const response = await fetch(path);
	if (!response.ok) throw new Error("CSV request failed: " + response.status);
	const buffer = await response.arrayBuffer();
	const text = new TextDecoder("euc-kr").decode(buffer);
	return Papa.parse(text, {
		header: true,
		skipEmptyLines: "greedy"
	});
}

function hasRequiredFields(fields, required) {
	return required.every(function (name) {
		return fields.includes(name);
	});
}

function hasNumber(row, name) {
	return String(row[name] || "").trim() !== ""
		&& Number.isFinite(numberValue(row[name]));
}

function drawStationChart(rows, fields) {
	const weekdayLineOneRows = rows.filter(function (row) {
		return row["구분"] === "평일" && row["호선"] === "1호선";
	});
	const stationAverages = {};
	for (const row of weekdayLineOneRows) {
		const values = fields.timeFields.map(function (field) {
			return numberValue(row[field]);
		});
		const average = values.reduce(function (sum, value) {
			return sum + value;
		}, 0) / values.length;
		if (!stationAverages[row["역명"]]) stationAverages[row["역명"]] = [];
		stationAverages[row["역명"]].push(average);
	}
	const topStations = Object.entries(stationAverages).map(function (entry) {
		const averages = entry[1];
		return {
			name: entry[0],
			average: averages.reduce(function (sum, value) { return sum + value; }, 0) / averages.length
		};
	}).sort(function (a, b) {
		return b.average - a.average;
	}).slice(0, 10);

	if (charts.stations) charts.stations.destroy();
	charts.stations = new Chart(document.querySelector("#stations-chart"), {
		type: "bar",
		data: {
			labels: topStations.map(function (station) { return station.name; }),
			datasets: [{ label: "평균 혼잡도(%)", data: topStations.map(function (station) { return station.average.toFixed(1); }), backgroundColor: "#008678" }]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: { y: { beginAtZero: true } }
		}
	});
}

function drawHighwayChart(rows) {
	const weekdayOrder = ["월", "화", "수", "목", "금", "토", "일"];
	const seenWeekdays = new Set();
	const weekdayRows = rows.filter(function (row) {
		if (seenWeekdays.has(row["요일"])) return false;
		seenWeekdays.add(row["요일"]);
		return weekdayOrder.includes(row["요일"]);
	}).sort(function (a, b) {
		return weekdayOrder.indexOf(a["요일"]) - weekdayOrder.indexOf(b["요일"]);
	});
	const labels = weekdayRows.map(function (row) {
		return row["요일"] + "요일";
	});
	const totals = weekdayRows.map(function (row) {
		return numberValue(row["합계"]);
	});
	const highestIndex = totals.indexOf(Math.max.apply(null, totals));
	const lowestIndex = totals.indexOf(Math.min.apply(null, totals));
	const formatNumber = function (value) {
		return value.toLocaleString("ko-KR") + "대";
	};

	if (charts.time) charts.time.destroy();
	charts.time = new Chart(document.querySelector("#time-chart"), {
		type: "line",
		data: {
			labels: labels,
			datasets: [{
				label: "전체 통행량(대)",
				data: totals,
				borderColor: "#c56200",
				backgroundColor: "#ffe5c7",
				fill: true,
				tension: 0.25
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: { y: { beginAtZero: true } }
		}
	});
	document.querySelector("#time-analysis").innerHTML =
		"<strong>해석:</strong> 전체 통행량은 " + labels[highestIndex] + "에 " +
		formatNumber(totals[highestIndex]) + "으로 가장 많고, " + labels[lowestIndex] +
		"에 " + formatNumber(totals[lowestIndex]) + "으로 가장 적습니다.";
}

if (typeof Papa === "undefined" || typeof Chart === "undefined") {
	document.querySelector("#status").textContent = "라이브러리를 불러오지 못했습니다. 네트워크를 확인하세요.";
} else {
	loadCsv(csvPath).then(function (results) {
			const fields = (results.meta.fields || []).map(function (field) {
				return field.trim();
			});
			const timeFields = fields.filter(function (field) {
				return /^\d{2}시\d{2}분$/.test(field);
			});
			const required = ["구분", "호선", "역명", "상하구분"].concat(timeFields);
			if (results.errors.length > 0 || timeFields.length === 0 || !hasRequiredFields(fields, required)) {
				document.querySelector("#status").textContent = "서울교통공사 CSV 형식과 열 이름을 확인하세요.";
				return;
			}
			const parsedRows = cleanRows(results.data);
			const rows = parsedRows.filter(function (row) {
				return String(row["구분"] || "").trim() !== ""
					&& String(row["호선"] || "").trim() !== ""
					&& String(row["역명"] || "").trim() !== ""
					&& String(row["상하구분"] || "").trim() !== ""
					&& timeFields.every(function (field) { return hasNumber(row, field); });
			});
			const lineOneRows = rows.filter(function (row) {
				return row["구분"] === "평일" && row["호선"] === "1호선";
			});
			if (lineOneRows.length === 0) {
				document.querySelector("#status").textContent = "평일 1호선 혼잡도로 표시할 행이 없습니다.";
				return;
			}
			drawStationChart(lineOneRows, { timeFields: timeFields });
		}).catch(function () {
			document.querySelector("#status").textContent = "서울교통공사 CSV 파일을 불러오지 못했습니다. 웹 서버에서 페이지를 열고 파일 경로를 확인하세요.";
	});
	loadCsv(highwayCsvPath).then(function (results) {
			const fields = (results.meta.fields || []).map(function (field) {
				return field.trim();
			});
			const required = ["일자", "요일", "합계"];
			if (results.errors.length > 0 || !hasRequiredFields(fields, required)) {
				document.querySelector("#status").textContent = "한국도로공사 CSV 형식과 열 이름을 확인하세요.";
				return;
			}
			const parsedRows = cleanRows(results.data);
			const rows = parsedRows.filter(function (row) {
				return String(row["일자"] || "").trim() !== ""
					&& String(row["요일"] || "").trim() !== ""
					&& hasNumber(row, "합계");
			});
			if (rows.length === 0) {
				document.querySelector("#status").textContent = "요일별 통행량으로 표시할 행이 없습니다.";
				return;
			}
			drawHighwayChart(rows);
			showPanel("time");
		}).catch(function () {
			document.querySelector("#status").textContent = "한국도로공사 CSV 파일을 불러오지 못했습니다.";
	});
}
