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

function drawCharts(rows, fields) {
	const weekdayLineOneRows = rows.filter(function (row) {
		return row["구분"] === "평일" && row["호선"] === "1호선";
	});
	const targetRow = weekdayLineOneRows.find(function (row) {
		return row["역명"] === "서울역" && row["상하구분"] === "상선";
	});
	const timeValues = fields.timeFields.map(function (field) {
		return numberValue(targetRow[field]);
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

	for (const chart of Object.values(charts)) {
		chart.destroy();
	}
	charts.time = new Chart(document.querySelector("#time-chart"), {
		type: "line",
		data: {
			labels: fields.timeFields,
			datasets: [{ label: "혼잡도(%)", data: timeValues, borderColor: "#7455e9", backgroundColor: "#ece6ff", fill: true, tension: 0.25 }]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: { y: { beginAtZero: true } }
		}
	});
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
	const dates = rows.map(function (row) {
		return row["일자"];
	});
	const totals = rows.map(function (row) {
		return numberValue(row["합계"]);
	});
	const highestIndex = totals.indexOf(Math.max.apply(null, totals));
	const lowestIndex = totals.indexOf(Math.min.apply(null, totals));
	const formatNumber = function (value) {
		return value.toLocaleString("ko-KR") + "대";
	};

	charts.highway = new Chart(document.querySelector("#highway-chart"), {
		type: "line",
		data: {
			labels: dates,
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
	document.querySelector("#highway-analysis").innerHTML =
		"<strong>해석:</strong> 전체 통행량은 " + dates[highestIndex] + "에 " +
		formatNumber(totals[highestIndex]) + "으로 가장 많고, " + dates[lowestIndex] +
		"에 " + formatNumber(totals[lowestIndex]) + "으로 가장 적습니다.";
}

if (typeof Papa === "undefined" || typeof Chart === "undefined") {
	document.querySelector("#status").textContent = "라이브러리를 불러오지 못했습니다. 네트워크를 확인하세요.";
} else {
	Papa.parse(csvPath, {
		header: true,
		download: true,
		encoding: "EUC-KR",
		skipEmptyLines: true,
		complete: function (results) {
			const fields = results.meta.fields.map(function (field) {
				return field.trim();
			});
			const timeFields = fields.filter(function (field) {
				return /^\d{2}시\d{2}분$/.test(field);
			});
			const rows = results.data.map(function (row) {
				const cleanRow = {};
				for (const key of Object.keys(row)) cleanRow[key.trim()] = row[key];
				return cleanRow;
			});
			drawCharts(rows, { timeFields: timeFields });
			showPanel("time");
		},
		error: function () {
			document.querySelector("#status").textContent = "CSV 파일을 불러오지 못했습니다. 웹 서버에서 페이지를 열고 파일 경로를 확인하세요.";
		}
	});
	Papa.parse(highwayCsvPath, {
		header: true,
		download: true,
		encoding: "EUC-KR",
		skipEmptyLines: true,
		complete: function (results) {
			const rows = results.data.map(function (row) {
				const cleanRow = {};
				for (const key of Object.keys(row)) cleanRow[key.trim()] = row[key];
				return cleanRow;
			});
			drawHighwayChart(rows);
		},
		error: function () {
			document.querySelector("#status").textContent = "한국도로공사 CSV 파일을 불러오지 못했습니다.";
		}
	});
}
