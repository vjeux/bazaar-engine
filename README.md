# Bazaar-engine

A simulation engine for[The Bazaar](https://playthebazaar.com/).

### TODOS

- [x] Fix Search image rendering
- [x] Fix tooltips. Probably better to not use the library.
- [x] Make empty card decks take up space so they don't shift layout when you add player cards
- [x] Fix weird skills that seem to be carditems instead.
      ![weird skill example](./docs/images/image.png)
- [x] Set battle speed, 2x, 3x etc
- [x] Add github repo link to navbar
- [x] Replace old tooltips with new floating UI tooltips
- [x] Move gold/income to separate UI component
- [ ] Add player config for health, level, regen, income, gold, etc.
- [ ] Add state saving to URL. Should probably use Zustand.
- [ ] Add card config, to set dmg, shield etc. Which can be boosted outside of combat.
- [ ] Win percentage for RNG in battles
- [ ] Show storm damage UI
- [ ] Damage numbers above health
- [ ] Implement TActionPlayerBurnRemove
- [ ] Change the code to support custom monsters/encounters
- [ ] Fix bug: having to doubleclick the red X to remove a card
