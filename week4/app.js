const places = [
	{ id: "cafe", name: "카페", query: "매머드익스프레스 부천가톨릭대학교점", embed: "https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357b63002506aec1%3A0x3bcaff8318689e34!2z66ek66i465Oc7J217Iqk7ZSE66CI7IqkIOu2gOyynOqwgO2GqOumreuMgO2Vmeq1kOygkA!5e0!3m2!1sko!2skr!4v1789978579964!5m2!1sko!2skr" },
	{ id: "foodcourt", name: "식당", query: "가톨릭대학교 소피아바라관", embed: "https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357b62c236b28d51%3A0xeccf6880813dc17a!2z6rCA7Yao66at64yA7ZWZ6rWQIOyGjO2UvOydtOuwlOudvOq0gA!5e0!3m2!1sko!2skr!4v1789978714666!5m2!1sko!2skr" },
	{ id: "shelter", name: "편의점", query: "N-Designs", embed: "https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357b62c20e16daa5%3A0xcd9316c0d450ea82!2sN-Designs%20%7C%20Nazcar%20Multimedia%20Productions!5e0!3m2!1sko!2skr!4v1789979048934!5m2!1sko!2skr" }
];

const buttons = document.querySelector("#buttons");
const map = document.querySelector("#map");
const mapLink = document.querySelector("#map-link");

function selectPlace(place) {
	for (const section of document.querySelectorAll(".place")) {
		section.hidden = section.id !== place.id;
	}

	for (const button of buttons.querySelectorAll("button")) {
		const isSelected = button.dataset.place === place.id;
		button.setAttribute("aria-pressed", String(isSelected));
	}

	map.src = place.embed ||
		"https://maps.google.com/maps?q=" + encodeURIComponent(place.query) + "&output=embed";
	map.title = place.name + " Google 지도";
	mapLink.href =
		"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.query);
}

for (const place of places) {
	const button = document.createElement("button");
	button.type = "button";
	button.textContent = place.name;
	button.dataset.place = place.id;
	button.setAttribute("aria-pressed", "false");
	button.addEventListener("click", () => selectPlace(place));
	buttons.append(button);
}

selectPlace(places[0]);
