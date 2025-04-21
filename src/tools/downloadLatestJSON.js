const fs = require("fs");

fetch("https://cdn.playthebazaar.com/bazaardesigndataprod/cards.json")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(__dirname + "/../json/cards.json", text, "utf-8");
  });

fetch("https://www.howbazaar.gg/api/monsterEncounterDays")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(__dirname + "/../json/monsterEncounterDays.json", text);
  });

fetch("https://www.howbazaar.gg/api/items")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(__dirname + "/../json/items.json", text);

    fs.writeFileSync(
      __dirname + "/../json/ValidItemNames.json",
      JSON.stringify(
        JSON.parse(text).data.map((card) => card.name),
        null,
        2,
      ),
    );
  });

fetch("https://www.howbazaar.gg/api/skills")
  .then((res) => res.text())
  .then((text) => {
    fs.writeFileSync(__dirname + "/../json/skills.json", text);

    fs.writeFileSync(
      __dirname + "/../json/ValidSkillNames.json",
      JSON.stringify(
        JSON.parse(text).data.map((card) => card.name),
        null,
        2,
      ),
    );
  });
