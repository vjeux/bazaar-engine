const fs = require("fs");

fetch("https://cdn.playthebazaar.com/bazaardesigndataprod/cards.json")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(
      __dirname + "/../../public/json/cards.json",
      text,
      "utf-8",
    );
  });

fetch("https://www.howbazaar.gg/api/monsterEncounterDays")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(
      __dirname + "/../../public/json/monsterEncounterDays.json",
      text,
    );
  });

fetch("https://www.howbazaar.gg/api/items")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(__dirname + "/../../public/json/items.json", text);

    fs.writeFileSync(
      __dirname + "/../../public/json/ValidItemIds.json",
      JSON.stringify(
        JSON.parse(text).data.map((card) => card.id),
        null,
        2,
      ),
    );
  });

fetch("https://www.howbazaar.gg/api/skills")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(__dirname + "/../../public/json/skills.json", text);

    fs.writeFileSync(
      __dirname + "/../../public/json/ValidSkillIds.json",
      JSON.stringify(
        JSON.parse(text).data.map((card) => card.id),
        null,
        2,
      ),
    );
  });
